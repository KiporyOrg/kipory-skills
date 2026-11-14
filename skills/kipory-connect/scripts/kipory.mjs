#!/usr/bin/env node
// kipory — plan, apply and try a Kipory project in single, short commands.
//
//   node .claude/skills/kipory-connect/scripts/kipory.mjs <command> [args] [--json]
//
//   connect                    first call: writes ./kipory (this command, for every later
//                              call: ./kipory <command>), proves the key, prints the summary
//   summary                    what the project holds, one line per element
//   plan <doc>                 plan a document: one line per error, warnings counted
//   apply [--note <text>]      apply the plan `plan` just made
//   ship <doc> [--check <spec>] [--note <text>]
//                              plan, apply when the plan is clean, then run the checks
//   check <spec>               run a list of requests as test users; one line per failure
//   user <name>                a test user, made once and remembered
//   call <user|-> <METHOD> <path> [json | --body <json> | --body-file <file> [--type <t>]]
//        [-H 'name: value']… [--pages [--page-param cursor]] [--times <n>] [--out <file>]
//                              call the project's own host as that user
//   preview <flow> [--as <user|nobody|me>] [--input <json>] [--apply] [--fan-out-cap <n|uncapped>]
//                              run a flow in the sandbox, print each write
//   preview --schedule <key> [--input <json>] [--apply]   a schedule's flow, as it fires
//   find <words…> [--report]   can Kipory do this? the functions that do it, or an honest
//                              "cannot" with the nearest (--report files the miss)
//   docs <words…>              the best-matching section of these skills
//
// <doc> is a .json or .yaml file, or a .mjs/.js file whose standard output is
// the document (a generator); <spec> is a .json file or a generator of one
// (kipory-connect's SKILL.md, "Check"). It reads KIPORY_BASE_URL, KIPORY_API_KEY
// and KIPORY_PROJECT_ID from the environment, then ./.env (or --env <file>),
// keeps its state in ./.kipory/, and never prints the key or a session. A
// preview runs each `each` on its first 5 items unless --fan-out-cap says
// otherwise; a flow a schedule starts previews as nobody, the way it fires,
// and --as me runs as you. `call` follows no redirect and prints a binary answer's size, not
// its bytes. Exit codes: 0 done, 1 refused or a check failed, 2 usage or
// environment. Node 18+, no deps.

import { execFileSync } from "node:child_process";
import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  renameSync,
  chmodSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE = resolve(".kipory");
const BODY_CUT = 2048;
/** A plan with this many warnings or fewer prints each of them whole. */
const WARNINGS_WHOLE = 5;
const DOCS_CUT = 3072;

class Exit extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const usage = (m) => new Exit(2, m);
const refused = (m) => new Exit(1, m);

// ── arguments and environment ───────────────────────────────────────────────

const argv = process.argv.slice(2);
const flags = new Map();
const words = [];
const SWITCHES = new Set([
  "json",
  "all",
  "full",
  "apply",
  "help",
  "pages",
  "report",
]);
const VALUED = new Set([
  "note",
  "as",
  "input",
  "more",
  "env",
  "fan-out-cap",
  "check",
  "body",
  "body-file",
  "type",
  "out",
  "times",
  "page-param",
  "schedule",
]);
/** Flags that may be given more than once; each value is kept, in order. */
const REPEATED = new Set(["header"]);
const SHORT = new Map([["-H", "header"]]);
let badFlag;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const name = SHORT.get(a) ?? (a.startsWith("--") ? a.slice(2) : undefined);
  if (name === undefined) words.push(a);
  else if (SWITCHES.has(name)) flags.set(name, true);
  else if (VALUED.has(name) || REPEATED.has(name)) {
    if (i + 1 >= argv.length) badFlag ??= `${a} takes a value`;
    const value = argv[++i];
    if (REPEATED.has(name))
      flags.set(name, [...(flags.get(name) ?? []), value]);
    else flags.set(name, value);
  } else
    badFlag ??= `unknown flag ${a}; the flags are ${[
      ...SWITCHES,
      ...VALUED,
      ...REPEATED,
    ]
      .map((f) => `--${f}`)
      .join(", ")}, -H`;
}
const asJson = flags.get("json") === true;

const out = (line) => process.stdout.write(`${line}\n`);
const oneLine = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
/** The text cut to n characters; `more` says how to read all of it. */
const cut = (s, n, more = "--json for all") =>
  s.length > n ? `${s.slice(0, n)}… (${s.length} bytes, ${more})` : s;

const ENV_FILE =
  typeof flags.get("env") === "string" ? flags.get("env") : ".env";
const readDotEnv = () => {
  const vars = {};
  if (!existsSync(ENV_FILE)) {
    if (ENV_FILE !== ".env") badFlag ??= `no such env file: ${ENV_FILE}`;
    return vars;
  }
  for (const raw of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(raw);
    if (!m) continue;
    vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return vars;
};
const dotEnv = readDotEnv();
const env = (name) => process.env[name] ?? dotEnv[name];

const BASE = (env("KIPORY_BASE_URL") ?? "").replace(/\/+$/, "");
const KEY = env("KIPORY_API_KEY");

const state = {
  read(name) {
    const p = join(STATE, name);
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : undefined;
  },
  // Written whole and renamed into place: a command running at once in the
  // same folder reads the old file or the new one, never half of one.
  write(name, value) {
    mkdirSync(STATE, { recursive: true });
    const tmp = join(STATE, `${name}.${process.pid}.tmp`);
    writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
    renameSync(tmp, join(STATE, name));
  },
};

// ── HTTP ────────────────────────────────────────────────────────────────────

/** A content type whose bytes are text to print; anything else is measured. */
const TEXTUAL =
  /^(text\/|application\/(?:[\w.+-]*\+)?(?:json|x-ndjson|ndjson|jsonl|xml|yaml|x-yaml|javascript|x-www-form-urlencoded)\b)/i;
const UTF8 = new TextDecoder("utf-8", { fatal: true });

/** Bytes that are text: a textual content type, or none and valid UTF-8. */
const textOf = (bytes, type) => {
  if (bytes.length === 0) return "";
  if (type !== "")
    return TEXTUAL.test(type) ? bytes.toString("utf8") : undefined;
  try {
    return UTF8.decode(bytes);
  } catch {
    return undefined;
  }
};

/**
 * One HTTP exchange. `body` is JSON unless it is a string (sent as it is) or a
 * Buffer (bytes); `headers` given by the caller win over the defaults. A call
 * to the project's own host follows no redirect (`manual`: a 3xx is the
 * answer, with its `location`); a design-API call follows them.
 */
const request = async (
  url,
  {
    method = "GET",
    body,
    contentType,
    token,
    headers: extra = {},
    redirect = "follow",
  } = {},
) => {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined)
    headers["content-type"] = contentType ?? "application/json";
  for (const [k, v] of Object.entries(extra)) headers[k.toLowerCase()] = v;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      redirect,
      body:
        body === undefined
          ? undefined
          : typeof body === "string" || Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body),
    });
  } catch (err) {
    // A request fetch refuses before sending (a GET with a body, a header
    // value it cannot carry) is the request's fault, not the network's.
    if (err instanceof TypeError && !err.cause)
      throw usage(`${method} ${new URL(url).pathname}: ${err.message}`);
    throw usage(
      `cannot reach ${new URL(url).origin}: ${err?.cause?.code ?? err?.message ?? err}`,
    );
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type") ?? "";
  const decoded = textOf(bytes, type);
  const binary = decoded === undefined;
  const text = decoded ?? "";
  let json;
  try {
    json = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return {
    status: res.status,
    text,
    json,
    bytes,
    type,
    binary,
    headers: {
      ...Object.fromEntries(res.headers),
      ...(res.headers.getSetCookie?.().length > 1
        ? { "set-cookie": res.headers.getSetCookie().join(", ") }
        : {}),
    },
  };
};

/**
 * Which agent session and which call of it a design-API request belongs to, so
 * a deployment that records them can count an agent's requests and refused
 * plans per apply with no transcript. The session: KIPORY_SESSION, else a hash of Claude
 * Code's session id (the id itself never leaves the machine), else one made
 * once for this folder. The turn counts this folder's commands in it.
 */
let tracing;
const traceHeaders = () => {
  if (tracing) return tracing;
  const claude = process.env.CLAUDE_CODE_SESSION_ID;
  const kept = state.read("session.json") ?? {};
  const session =
    (/^[\w-]{1,64}$/.test(process.env.KIPORY_SESSION ?? "")
      ? process.env.KIPORY_SESSION
      : undefined) ??
    (claude
      ? createHash("sha256").update(claude).digest("hex").slice(0, 16)
      : undefined) ??
    kept.made ??
    randomBytes(8).toString("hex");
  const turn = (kept.session === session ? (kept.turn ?? 0) : 0) + 1;
  state.write("session.json", {
    ...(claude || process.env.KIPORY_SESSION
      ? { made: kept.made }
      : { made: session }),
    session,
    turn,
  });
  // The api's own names: it keeps the label beside each save in history and
  // labels a plan with it; a turn past 2^31-1 would be refused, so it stops there.
  tracing = {
    "kipory-session-label": session,
    "kipory-turn": String(Math.min(turn, 2 ** 31 - 1)),
  };
  return tracing;
};

const api = async (method, path, body, contentType) => {
  if (!BASE)
    throw usage(`KIPORY_BASE_URL is not set (environment or ${ENV_FILE})`);
  if (!KEY)
    throw usage(`KIPORY_API_KEY is not set (environment or ${ENV_FILE})`);
  return request(`${BASE}${path}`, {
    method,
    body,
    contentType,
    token: KEY,
    headers: traceHeaders(),
  });
};

const refusal = (res) => {
  const j = res.json;
  if (j && typeof j === "object" && j.code)
    return `${res.status} ${j.code}: ${oneLine(j.message)}`;
  return `${res.status} ${oneLine(res.text).slice(0, 300)}`;
};

const ok = (res, what) => {
  if (res.status >= 200 && res.status < 300) return res.json;
  throw refused(`${what}: ${refusal(res)}`);
};

// ── the project ─────────────────────────────────────────────────────────────

let grantCache;
const grant = async () => {
  if (grantCache) return grantCache;
  const g = ok(await api("GET", "/v1/grant"), "GET /v1/grant");
  const id =
    env("KIPORY_PROJECT_ID") ??
    (g?.node?.kind === "project"
      ? g.node.id
      : g?.projects?.length === 1
        ? g.projects[0].id
        : undefined);
  if (!id)
    throw usage(
      "KIPORY_PROJECT_ID is not set and the key reaches more than one project",
    );
  const project = (g?.projects ?? []).find((p) => p.id === id);
  grantCache = { id, host: project?.baseUrl?.replace(/\/+$/, "") };
  return grantCache;
};
const projectId = async () => (await grant()).id;
const host = async () => {
  const h = (await grant()).host;
  if (!h)
    throw usage(
      "this key's grant names no address for the project (baseUrl on GET /v1/grant)",
    );
  return h;
};

// ── plan, apply, ship ───────────────────────────────────────────────────────

const isGenerator = (file) => [".mjs", ".js", ".cjs"].includes(extname(file));

/** A generator's standard output, parsed: the document or spec it prints. */
const runGenerator = (file, what) => {
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [file], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const tail = String(err.stderr ?? err.message)
      .trim()
      .split("\n")
      .slice(-20)
      .join("\n");
    throw usage(`the generator ${file} failed:\n${tail}`);
  }
  try {
    return JSON.parse(stdout);
  } catch {
    throw usage(
      `the generator ${file} printed no JSON ${what} on its standard output`,
    );
  }
};

const loadDocument = (file) => {
  if (!file)
    throw usage("name the document: plan <doc.json|doc.yaml|generator.mjs>");
  if (!existsSync(file)) throw usage(`no such file: ${file}`);
  const ext = extname(file);
  if (isGenerator(file)) {
    const doc = runGenerator(file, "document");
    return {
      body: doc,
      contentType: "application/json",
      basedOn: doc?.basedOn,
    };
  }
  const text = readFileSync(file, "utf8");
  if (ext === ".yaml" || ext === ".yml") {
    const based = /^basedOn:\s*["']?([^\s"']+)/m.exec(text)?.[1];
    return { body: text, contentType: "application/yaml", basedOn: based };
  }
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (err) {
    throw usage(`${file} is not JSON: ${err.message}`);
  }
  return { body: doc, contentType: "application/json", basedOn: doc?.basedOn };
};

const currentVersion = async (id) => {
  const read = ok(
    await api(
      "GET",
      `/v1/projects/${encodeURIComponent(id)}/document?section=project`,
    ),
    "reading the project's version",
  );
  return read?.version;
};

const printDiagnostics = (diagnostics) => {
  const list = Array.isArray(diagnostics) ? diagnostics : [];
  const errors = list.filter((d) => d.severity === "error");
  let edits = false;
  for (const d of errors) {
    out(`error ${d.code} ${d.field ?? d.at ?? "-"}: ${oneLine(d.message)}`);
    // A step finding carries ready fixes (a title and the step edits, or one
    // keyword to declare on a type), or the decision only you can make.
    const fixes = Array.isArray(d.fixes) ? d.fixes : [];
    fixes.forEach((f, i) => {
      out(`  fix${fixes.length > 1 ? ` ${i + 1}` : ""}: ${oneLine(f.title)}`);
      if (f.edit) {
        edits = true;
        out(`    edit: ${cut(oneLine(JSON.stringify(f.edit)), 300)}`);
      }
      if (f.typeEdit)
        out(
          `    on type ${f.typeEdit.key}, declare: ${cut(oneLine(JSON.stringify(f.typeEdit.declare)), 300)}`,
        );
      // A document finding's fix sets values at document paths
      // (`flows.<key>.adoptSnapshots`); `null` removes the key.
      for (const set of Array.isArray(f.set) ? f.set : [])
        out(
          `    set ${set.field}: ${cut(oneLine(JSON.stringify(set.value)), 200)}`,
        );
    });
    if (d.decision) out(`  decide: ${oneLine(d.decision)}`);
  }
  if (edits)
    out(
      "(apply the first fix of every error in one edit of your document, an equal fix once per flow; --json has every edit whole)",
    );
  const rest = list.filter((d) => d.severity !== "error");
  if (flags.get("all") === true) {
    for (const d of rest)
      out(`${d.severity} ${d.code} ${d.field ?? "-"}: ${oneLine(d.message)}`);
  } else {
    // Neither refuses. A warning is printed whole when there are few, and
    // always when it is about an expression (`JSONATA_*`): those say the
    // expression reads another value than the author meant, and a count
    // hid one that broke a list's paging (crm, 2026-11-12). The rest, and
    // info findings, are counted by code.
    const warnings = rest.filter((d) => d.severity === "warning");
    const whole = warnings.filter(
      (d) => warnings.length <= WARNINGS_WHOLE || d.code.startsWith("JSONATA_"),
    );
    for (const d of whole)
      out(`warning ${d.code} ${d.field ?? d.at ?? "-"}: ${oneLine(d.message)}`);
    for (const severity of ["warning", "info"]) {
      const found = rest.filter(
        (d) => d.severity === severity && !whole.includes(d),
      );
      if (found.length === 0) continue;
      const byCode = new Map();
      for (const w of found) byCode.set(w.code, (byCode.get(w.code) ?? 0) + 1);
      out(
        `${found.length} ${severity === "info" ? "info" : `${whole.length > 0 ? "more " : ""}warning(s)`}: ${[...byCode].map(([c, n]) => (n > 1 ? `${c}×${n}` : c)).join(", ")} (--all to read them)`,
      );
    }
  }
  return errors.length;
};

const plan = async (file) => {
  const id = await projectId();
  const doc = loadDocument(file);
  // A document that carries its read (an export) is planned against it, so a
  // change someone made since is listed as moved. Otherwise: the project now.
  const query = doc.basedOn
    ? ""
    : `?basedOn=${encodeURIComponent(await currentVersion(id))}`;
  const res = await api(
    "POST",
    `/v1/projects/${encodeURIComponent(id)}/document/plan${query}`,
    doc.body,
    doc.contentType,
  );
  const p = ok(res, "planning the document");
  state.write("plan.json", {
    planId: p.planId ?? null,
    version: p.version,
    file,
  });
  if (asJson) {
    out(JSON.stringify(p, null, 2));
    return p;
  }
  const counts = p.counts ?? {};
  const changed = ["create", "update", "delete"]
    .map((k) => `${k} ${counts[k] ?? 0}`)
    .join(", ");
  out(
    p.ok ? `plan ok ${p.planId}  (${changed})` : `plan refused  (${changed})`,
  );
  for (const m of p.moved ?? [])
    out(
      `moved ${m.path}: changed by ${m.actor?.displayName ?? m.actor?.raw ?? "someone"} after your read`,
    );
  printDiagnostics(p.diagnostics);
  return p;
};

const apply = async () => {
  const id = await projectId();
  const last = state.read("plan.json");
  if (!last?.planId) throw usage("no plan to apply: run plan <doc> first");
  const note =
    typeof flags.get("note") === "string"
      ? flags.get("note")
      : "applied with kipory";
  const res = await api(
    "POST",
    `/v1/projects/${encodeURIComponent(id)}/document`,
    { planId: last.planId, note },
  );
  if (res.status === 409) {
    if (asJson) out(res.text);
    else {
      out(`apply refused: ${refusal(res)}`);
      for (const m of res.json?.details?.moved ?? [])
        out(
          `moved ${m.path}: changed by ${m.actor?.displayName ?? m.actor?.raw ?? "someone"}`,
        );
      out("plan again, then apply");
    }
    throw refused("");
  }
  if (res.status === 422 && res.json?.details?.plan) {
    if (asJson) out(res.text);
    else {
      out(`apply refused: ${refusal(res)}`);
      printDiagnostics(res.json.details.plan.diagnostics);
    }
    throw refused("");
  }
  const a = ok(res, "applying the plan");
  if (asJson) {
    out(JSON.stringify(a, null, 2));
    return a;
  }
  const g = await grant();
  // `appliedVersion` is the project after the apply; `version` was the plan's read.
  out(`applied ${a?.appliedVersion ?? ""}  host ${g.host ?? "(none)"}`.trim());
  printDiagnostics(
    (a?.diagnostics ?? []).filter((d) => d.severity === "error"),
  );
  return a;
};

// ── test users and calls ────────────────────────────────────────────────────

/** `--as nobody`: the run resolves no end user, the way a schedule fires. */
const NOBODY = "nobody";
/** `--as me`: the run acts as you, the key's caller (the API's `operator`). */
const ME = "me";

/** The test users this folder made, for the project the environment names. */
let usersProject;
const users = () => (state.read("users.json") ?? {})[usersProject] ?? {};
const saveUsers = (all) => {
  // Merged by name into what is on disk now: a user another command made
  // meanwhile is kept.
  const every = state.read("users.json") ?? {};
  every[usersProject] = { ...every[usersProject], ...all };
  state.write("users.json", every);
};

const makeUser = async (name) => {
  const id = await projectId();
  usersProject = id;
  const res = await api("POST", "/v1/test-users", { project: id, name });
  if (res.status < 200 || res.status >= 300) {
    const known = Object.keys(users());
    // A refusal that names the project setting behind it (TEST_USER_LIMIT's
    // `testUserLimit`) says where to raise it, so no refusal page is read.
    const setting = res.json?.details?.setting;
    throw refused(
      `making test user ${name}: ${refusal(res)}${known.length > 0 ? `\nremembered users: ${known.join(", ")}` : ""}${typeof setting === "string" ? `\nraise ${setting} in the project's settings: PATCH /v1/projects/{nodeId}/settings, or reuse a remembered user` : ""}`,
    );
  }
  const all = users();
  all[name] = {
    id: res.json?.user?.id,
    session: res.json?.session,
    expiresAt: res.json?.expiresAt,
  };
  saveUsers(all);
  return all[name];
};

const user = async (name) => {
  if (!name) throw usage("name the user: user <name>");
  if (name === NOBODY || name === ME)
    throw usage(
      `${name} is not a test user's name: preview --as ${name} means ${name === ME ? "you, the caller" : "no one"}`,
    );
  usersProject = await projectId();
  const known = users()[name];
  const u = known ?? (await makeUser(name));
  if (asJson) out(JSON.stringify({ name, id: u.id, expiresAt: u.expiresAt }));
  else out(`user ${name} ${u.id}${known ? " (remembered)" : " (made)"}`);
};

/** A fresh session for a remembered user, or the user made again when it is gone. */
const renewing = new Map();
const renew = (name) => {
  // Requests sent at once that all meet a 401 share one renewal.
  if (!renewing.has(name))
    renewing.set(
      name,
      renewOnce(name).finally(() => renewing.delete(name)),
    );
  return renewing.get(name);
};
const renewOnce = async (name) => {
  const known = users()[name];
  if (known?.id) {
    const res = await api(
      "POST",
      `/v1/test-users/${encodeURIComponent(known.id)}/sessions`,
      {},
    );
    if (res.status >= 200 && res.status < 300 && res.json?.session) {
      const all = users();
      all[name] = {
        ...known,
        session: res.json.session,
        expiresAt: res.json.expiresAt,
      };
      saveUsers(all);
      return all[name];
    }
  }
  return makeUser(name);
};

// ── sending as a person ─────────────────────────────────────────────────────

/** The session a request goes out with: none for `-`, else that test user's. */
const sessionOf = async (who) => {
  if (who === "-") return undefined;
  return (users()[who] ?? (await makeUser(who))).session;
};

/**
 * One request to the project's host as `who`, its refused session renewed
 * once. A request that sets its own `authorization` goes out as it is.
 */
const sendAs = async (base, who, req) => {
  const go = (token) =>
    request(`${base}${req.path}`, {
      method: req.method,
      body: req.body,
      contentType: req.contentType,
      headers: req.headers,
      token,
      redirect: "manual",
    });
  const own = Object.keys(req.headers ?? {}).some(
    (k) => k.toLowerCase() === "authorization",
  );
  if (own || who === "-") return go(undefined);
  const session = await sessionOf(who);
  const res = await go(session);
  // A 401 the flow chose (a `fail` with status 401 names its reason) is the
  // answer; only the platform's own 401 means the session is gone.
  if (res.status !== 401 || res.json?.details?.reason !== undefined) return res;
  // Another request of a burst may have renewed it already: use that one
  // rather than renewing again (a gone user would be made twice).
  const now = users()[who]?.session;
  return go(now && now !== session ? now : (await renew(who)).session);
};

const PAGE_MAX = 20;

/**
 * A page's list and cursor: at the top, or under the one key that holds them.
 * A view endpoint answers `items`; a flow that returns a `record.query` or
 * `record.list` value answers `records`.
 */
const pageOf = (json) => {
  if (!json || typeof json !== "object" || Array.isArray(json))
    return undefined;
  for (const at of [json, ...Object.values(json)]) {
    if (!at || typeof at !== "object") continue;
    const list = Array.isArray(at.items)
      ? at.items
      : Array.isArray(at.records)
        ? at.records
        : undefined;
    if (list) return { items: list, next: at.nextCursor ?? null };
  }
  return undefined;
};

const withQuery = (path, name, value) => {
  const q = path.indexOf("?");
  const params = new URLSearchParams(q < 0 ? "" : path.slice(q + 1));
  params.set(name, value);
  return `${q < 0 ? path : path.slice(0, q)}?${params}`;
};

/**
 * Every page of a list, following `nextCursor` with `?<param>=` (a view's
 * `after`; a flow's own cursor input otherwise), the items joined.
 */
const sendPages = async (base, who, req, param = "after") => {
  const items = [];
  let cursor;
  for (let page = 1; ; page++) {
    const res = await sendAs(base, who, {
      ...req,
      path:
        cursor === undefined ? req.path : withQuery(req.path, param, cursor),
    });
    const p = pageOf(res.json);
    if (res.status < 200 || res.status >= 300 || !p)
      return { res, pages: page, items, paged: p !== undefined };
    items.push(...p.items);
    if (!p.next) return { res, pages: page, items, paged: true };
    if (page >= PAGE_MAX)
      return { res, pages: page, items, paged: true, more: true };
    cursor = p.next;
  }
};

const countStatuses = (answers) => {
  const counts = {};
  for (const a of answers) counts[a.status] = (counts[a.status] ?? 0) + 1;
  return counts;
};
const showCounts = (counts) =>
  Object.entries(counts)
    .map(([s, n]) => `${s}×${n}`)
    .join(" ");

/** What an answer's body is, in one printable piece. */
const bodyWords = (res, limit, more) => {
  if (res.binary)
    return `(${res.bytes.length} bytes of ${res.type || "no content-type"}; call --out <file> keeps them)`;
  if (res.text.length === 0) return undefined;
  return limit === undefined ? res.text : cut(res.text, limit, more);
};

// ── call ────────────────────────────────────────────────────────────────────

const CALL_USAGE =
  "call <user|-> <METHOD> <path> [json | --body <json> | --body-file <file> [--type <t>]] [-H 'name: value']… [--pages [--page-param cursor]] [--times <n>] [--out <file>]";

const parseHeaders = (list) => {
  const headers = {};
  for (const h of list ?? []) {
    const i = h.indexOf(":");
    if (i <= 0) throw usage(`a header is 'name: value', not ${h}`);
    headers[h.slice(0, i).trim().toLowerCase()] = h.slice(i + 1).trim();
  }
  return headers;
};

const call = async (who, method, path, body) => {
  if (!who || !method || !path) throw usage(CALL_USAGE);
  if (!path.startsWith("/"))
    throw usage("the path starts with /, as /v1/notes");
  const text =
    body ??
    (typeof flags.get("body") === "string" ? flags.get("body") : undefined);
  const file = flags.get("body-file");
  const type =
    typeof flags.get("type") === "string" ? flags.get("type") : undefined;
  let sent;
  if (typeof file === "string") {
    if (text !== undefined)
      throw usage("give the body as json or as --body-file, not both");
    if (!existsSync(file)) throw usage(`no such file: ${file}`);
    sent = readFileSync(file);
  } else if (text !== undefined) {
    try {
      JSON.parse(text);
    } catch {
      throw usage(`the body is not JSON: ${text}`);
    }
    sent = text;
  }
  if (sent !== undefined && ["GET", "HEAD"].includes(method.toUpperCase()))
    throw usage(`a ${method.toUpperCase()} carries no body`);
  const req = {
    method: method.toUpperCase(),
    path,
    headers: parseHeaders(flags.get("header")),
    body: sent,
    contentType:
      type ??
      (typeof file === "string" ? "application/octet-stream" : undefined),
  };
  const base = await host();
  usersProject = await projectId();
  const full = flags.get("full") === true;

  if (flags.get("times") !== undefined) {
    const n = Number(flags.get("times"));
    if (!Number.isInteger(n) || n < 1 || n > 100)
      throw usage("--times takes a whole number 1-100");
    await sessionOf(who); // made once, before the burst
    const answers = await Promise.all(
      Array.from({ length: n }, () => sendAs(base, who, req)),
    );
    const counts = countStatuses(answers);
    if (asJson) {
      out(
        JSON.stringify({
          statuses: counts,
          answers: answers.map((a) => ({
            status: a.status,
            body: a.json ?? a.text,
          })),
        }),
      );
    } else {
      out(`${n} at once: ${showCounts(counts)}`);
      for (const status of Object.keys(counts)) {
        const first = answers.find((a) => String(a.status) === status);
        const words = bodyWords(first, 300);
        if (words) out(`  ${status}: ${oneLine(words)}`);
      }
    }
    // A race answers some 4xx by design; refused only when none succeeded.
    if (!answers.some((a) => a.status < 400)) throw refused("");
    return;
  }

  if (flags.get("pages") === true) {
    const param =
      typeof flags.get("page-param") === "string"
        ? flags.get("page-param")
        : "after";
    const { res, pages, items, paged, more } = await sendPages(
      base,
      who,
      req,
      param,
    );
    if (!paged && pages > 1) {
      out(`${res.status} at page ${pages}, after ${items.length} item(s)`);
      const words = bodyWords(
        res,
        full ? undefined : BODY_CUT,
        "--full for all",
      );
      if (words) out(words);
    } else if (!paged) {
      out(String(res.status));
      const words = bodyWords(
        res,
        full ? undefined : BODY_CUT,
        "--full for all",
      );
      if (words) out(words);
      out("(no page here: --pages follows an answer's items and nextCursor)");
    } else if (asJson)
      out(JSON.stringify({ status: res.status, pages, items, more: !!more }));
    else {
      out(
        `${res.status} ${pages} page(s), ${items.length} item(s)${more ? `; stopped at ${PAGE_MAX} pages, more remain` : ""}`,
      );
      const joined = JSON.stringify(items);
      out(full ? joined : cut(joined, BODY_CUT, "--full for all"));
    }
    if (res.status >= 400) throw refused("");
    return;
  }

  const res = await sendAs(base, who, req);
  const location = res.headers.location;
  if (typeof flags.get("out") === "string") {
    writeFileSync(flags.get("out"), res.bytes);
    out(
      `${res.status} ${res.bytes.length} bytes${res.type ? ` ${res.type}` : ""} → ${flags.get("out")}`,
    );
  } else if (asJson)
    out(
      JSON.stringify({
        status: res.status,
        ...(location ? { location } : {}),
        body: res.binary
          ? { bytes: res.bytes.length, type: res.type }
          : (res.json ?? res.text),
      }),
    );
  else {
    out(String(res.status));
    if (location) out(`location: ${location}`);
    const words = bodyWords(res, full ? undefined : BODY_CUT, "--full for all");
    if (words) out(words);
  }
  if (res.status >= 400) throw refused("");
};

// ── check ───────────────────────────────────────────────────────────────────

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const ITEM_KEYS = new Set([
  "as",
  "name",
  "method",
  "path",
  ...METHODS,
  "headers",
  "body",
  "bodyText",
  "bodyFile",
  "contentType",
  "sign",
  "save",
  "expect",
  "pages",
  "times",
  "eventually",
]);
const EXPECT_KEYS = new Set([
  "status",
  "statuses",
  "body",
  "has",
  "absent",
  "count",
  "contains",
  "headers",
  "bytes",
  "type",
  "unique",
  "sorted",
  "includes",
]);
const SIGN_KEYS = new Set([
  "header",
  "secret",
  "algorithm",
  "encoding",
  "payload",
  "value",
]);
const WAIT_MAX = 120_000;
/** Names a template reads without a request saving them. */
const BUILT_IN = ["nonce", "i", "user", "timestamp", "body", "signature"];

const isStatus = (v) =>
  isTemplate(v) ||
  (Number.isInteger(v) && v >= 100 && v <= 599) ||
  (typeof v === "string" && /^([1-5]xx|[1-5]\d\d)$/i.test(v));
const isMap = (v, value) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.values(v).every(value);
const isPaths = (v) =>
  Array.isArray(v) && v.every((p) => typeof p === "string");
/** A whole `{{name}}`: filled before it is judged, so it may stand for a number. */
const isTemplate = (v) =>
  typeof v === "string" && /^\{\{\s*[\w.-]+\s*\}\}$/.test(v);
const isCount = (n) => (Number.isInteger(n) && n >= 0) || isTemplate(n);
/** What each `expect` key holds; anything else is refused before a request is sent. */
const EXPECT_SHAPES = [
  [
    "status",
    (v) =>
      isStatus(v) || (Array.isArray(v) && v.length > 0 && v.every(isStatus)),
    'a status (201, "4xx") or a list of them',
  ],
  [
    "statuses",
    (v) =>
      isMap(v, isCount) && Object.keys(v).every((k) => /^[1-5]\d\d$/.test(k)),
    'counts by exact status, {"201": 1, "409": 4}',
  ],
  ["has", isPaths, 'a list of paths, ["items[0].id"]'],
  ["absent", isPaths, 'a list of paths, ["secret"]'],
  ["count", (v) => isMap(v, isCount), '{"<path>": <how many>}'],
  [
    "contains",
    (v) => typeof v === "string" || isPaths(v),
    "a text, or a list of texts",
  ],
  [
    "headers",
    (v) => isMap(v, (h) => typeof h === "string" || typeof h === "boolean"),
    '{"<name>": "<text it contains>" | true | false}',
  ],
  ["bytes", isCount, "a number of bytes"],
  ["type", (v) => typeof v === "string", "a content-type prefix"],
  [
    "includes",
    (v) =>
      isMap(
        v,
        (it) => it !== null && typeof it === "object" && !Array.isArray(it),
      ),
    '{"<list path>": {<fields one item has>}}',
  ],
  [
    "unique",
    (v) => isMap(v, (f) => typeof f === "string"),
    '{"<list path>": "<field>"}',
  ],
  [
    "sorted",
    (v) => isMap(v, (f) => typeof f === "string" && /^-?[^-]/.test(f)),
    '{"<list path>": "<field>" | "-<field>"}',
  ],
];

/** A failure of one request, reported in its line rather than thrown out. */
class Miss extends Error {}
/** A template naming a value nothing saved: asking again cannot mend it. */
class Unsaved extends Miss {
  constructor(message, needs) {
    super(message);
    /** The saved name it needed, when an earlier request was to save it. */
    this.needs = needs;
  }
}

const loadSpec = (file) => {
  if (!file) throw usage("name the checks: check <spec.json|generator.mjs>");
  if (!existsSync(file)) throw usage(`no such file: ${file}`);
  let spec;
  if (isGenerator(file)) spec = runGenerator(file, "spec");
  else
    try {
      spec = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      throw usage(`${file} is not JSON: ${err.message}`);
    }
  const items = Array.isArray(spec) ? spec : spec?.requests;
  if (!Array.isArray(items) || items.length === 0)
    throw usage(
      `${file}: a spec is {"requests": [ {"as": "alice", "GET": "/v1/…", "expect": {"status": 200}}, … ]}`,
    );
  items.forEach((item, i) =>
    validateItem(item, `${file} requests[${i}]`, true),
  );
  if (items.every((item) => "wait" in item))
    throw usage(`${file}: the spec waits and sends nothing`);
  return items;
};

const validateItem = (item, where, top) => {
  if (!item || typeof item !== "object" || Array.isArray(item))
    throw usage(`${where}: a request is an object`);
  const alone = (key) => {
    const others = Object.keys(item).filter((k) => k !== key);
    if (others.length > 0)
      throw usage(
        `${where}: a ${key} item holds only "${key}", not ${others.join(", ")}`,
      );
  };
  if (top && "wait" in item) {
    alone("wait");
    if (!(
      Number.isInteger(item.wait) &&
      item.wait > 0 &&
      item.wait <= WAIT_MAX
    ))
      throw usage(`${where}: wait takes milliseconds, 1-${WAIT_MAX}`);
    return;
  }
  if (top && "parallel" in item) {
    alone("parallel");
    if (!Array.isArray(item.parallel) || item.parallel.length === 0)
      throw usage(`${where}: parallel takes a list of requests`);
    item.parallel.forEach((it, i) =>
      validateItem(it, `${where}.parallel[${i}]`, false),
    );
    return;
  }
  const unknown = Object.keys(item).filter((k) => !ITEM_KEYS.has(k));
  if (unknown.length > 0)
    throw usage(
      `${where}: ${unknown.join(", ")} ${unknown.length > 1 ? "are" : "is"} not a request key; the keys are ${[...ITEM_KEYS].join(", ")}${top ? ", or wait, parallel" : ""}`,
    );
  if (typeof item.as !== "string" || item.as === "")
    throw usage(
      `${where}: say who sends it, "as": "<test user>" or "-" for no one`,
    );
  const { method } = requestOf(item, where);
  const reads = method === "GET" || method === "HEAD";
  const bodies = ["body", "bodyText", "bodyFile"].filter((k) => k in item);
  if (bodies.length > 1)
    throw usage(`${where}: one of ${bodies.join(", ")}, not both`);
  if (reads && bodies.length > 0)
    throw usage(`${where}: a ${method} carries no body`);
  if (
    item.times !== undefined &&
    !(Number.isInteger(item.times) && item.times >= 1 && item.times <= 100)
  )
    throw usage(`${where}: times takes a whole number 1-100`);
  if (
    item.eventually !== undefined &&
    !(
      Number.isInteger(item.eventually) &&
      item.eventually > 0 &&
      item.eventually <= WAIT_MAX
    )
  )
    throw usage(`${where}: eventually takes milliseconds, 1-${WAIT_MAX}`);
  // Asking again re-sends: only a read may be asked again.
  if (item.eventually !== undefined && (!reads || item.times !== undefined))
    throw usage(
      `${where}: eventually asks again, so it goes on a GET or HEAD sent once, not a ${method}${item.times !== undefined ? " with times" : ""}`,
    );
  if (
    item.pages !== undefined &&
    item.pages !== true &&
    !(item.pages && typeof item.pages.param === "string")
  )
    throw usage(
      `${where}: pages is true, or {"param": "<the cursor's query name>"}`,
    );
  if (item.pages !== undefined && item.times !== undefined)
    throw usage(`${where}: pages and times do not go together`);
  if (item.save !== undefined) {
    if (
      !item.save ||
      typeof item.save !== "object" ||
      Object.values(item.save).some((p) => typeof p !== "string")
    )
      throw usage(`${where}: save is {"<name>": "<path in the answer>"}`);
    const bad = Object.keys(item.save).filter(
      (k) => !/^[A-Za-z_]\w*$/.test(k) || BUILT_IN.includes(k),
    );
    if (bad.length > 0)
      throw usage(
        `${where}: ${bad.join(", ")} cannot be a saved name (letters, digits, _; not ${BUILT_IN.join(", ")})`,
      );
  }
  if (item.sign !== undefined) {
    if (
      !item.sign ||
      typeof item.sign !== "object" ||
      typeof item.sign.header !== "string" ||
      typeof item.sign.secret !== "string"
    )
      throw usage(
        `${where}: sign is {"header": "x-signature", "secret": "…"} (+ algorithm, encoding, payload, value)`,
      );
    const extra = Object.keys(item.sign).filter((k) => !SIGN_KEYS.has(k));
    if (extra.length > 0)
      throw usage(
        `${where}: sign takes ${[...SIGN_KEYS].join(", ")}, not ${extra.join(", ")}`,
      );
  }
  if (item.expect !== undefined) {
    if (
      !item.expect ||
      typeof item.expect !== "object" ||
      Array.isArray(item.expect)
    )
      throw usage(`${where}: expect is an object`);
    const extra = Object.keys(item.expect).filter((k) => !EXPECT_KEYS.has(k));
    if (extra.length > 0)
      throw usage(
        `${where}: expect takes ${[...EXPECT_KEYS].join(", ")}, not ${extra.join(", ")}`,
      );
    if (item.expect.statuses !== undefined && (item.times ?? 1) < 2)
      throw usage(
        `${where}: statuses counts the answers of "times"; one answer is "status"`,
      );
    for (const [key, ok, shape] of EXPECT_SHAPES)
      if (key in item.expect && !ok(item.expect[key]))
        throw usage(`${where}: expect.${key} is ${shape}`);
  }
};

const requestOf = (item, where) => {
  const named = METHODS.filter((m) => m in item);
  if (named.length > 1)
    throw usage(
      `${where}: names ${named.join(" and ")}; one method per request`,
    );
  const method =
    named[0] ??
    (typeof item.method === "string" ? item.method.toUpperCase() : undefined);
  const path = named[0] ? item[named[0]] : item.path;
  if (!method || typeof path !== "string")
    throw usage(
      `${where}: a request names its method and path: "GET": "/v1/…"`,
    );
  if (!path.startsWith("/"))
    throw usage(`${where}: the path starts with /, as /v1/notes`);
  return { method, path };
};

/** A dotted path into a value: `items[0].id`, `items.0.id`; `$` is the whole. */
const valueAt = (value, path) => {
  if (path === "$" || path === "") return value;
  let at = value;
  for (const part of path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)) {
    if (at === null || typeof at !== "object") return undefined;
    at = at[part];
  }
  return at;
};

const show = (v) => cut(oneLine(JSON.stringify(v) ?? "nothing"), 120);

/** Fills `{{name}}` from what earlier requests saved, the users, the run. */
const fill = (value, vars, inPath = false) => {
  const look = (name) => {
    if (name in vars) return vars[name];
    const user = /^user\.(.+)\.id$/.exec(name);
    if (user) {
      const u = users()[user[1]];
      if (u?.id) return u.id;
      throw new Unsaved(`{{${name}}}: no test user ${user[1]} in this check`);
    }
    throw new Unsaved(`{{${name}}} is not saved by an earlier request`, name);
  };
  if (typeof value === "string") {
    const whole = /^\{\{\s*([\w.-]+)\s*\}\}$/.exec(value);
    if (whole) return look(whole[1]);
    return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name) => {
      const v = look(name);
      if (!inPath) return typeof v === "string" ? v : JSON.stringify(v);
      // In a path, a value is one segment or one query value, encoded.
      if (v === null || typeof v === "object")
        throw new Unsaved(
          `{{${name}}} holds ${show(v)}, not a value for a path: save one field of it`,
        );
      return encodeURIComponent(String(v));
    });
  }
  if (Array.isArray(value)) return value.map((v) => fill(v, vars));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fill(v, vars)]),
    );
  return value;
};

const secondsNow = () => String(Math.floor(Date.now() / 1000));

/** The request one item sends, its templates filled. */
const buildRequest = (item, given) => {
  const { method, path } = requestOf(item, "");
  // The time, in seconds, for a header or a body that carries it (a signed
  // webhook's timestamp), the same in all of this request.
  const vars = { timestamp: secondsNow(), ...given };
  const headers = Object.fromEntries(
    Object.entries(fill(item.headers ?? {}, vars)).map(([k, v]) => [
      k.toLowerCase(),
      String(v),
    ]),
  );
  let body;
  let contentType = item.contentType;
  if ("body" in item) body = JSON.stringify(fill(item.body, vars));
  else if ("bodyText" in item) {
    body = String(fill(item.bodyText, vars));
    contentType ??= "text/plain";
  } else if ("bodyFile" in item) {
    const file = String(fill(item.bodyFile, vars));
    if (!existsSync(file)) throw new Miss(`no such file: ${file}`);
    body = readFileSync(file);
    contentType ??= "application/octet-stream";
  }
  if (item.sign) {
    // The signature is over the bytes sent; `payload` and `value` may name the
    // body, the time and the signature besides any saved value.
    const s = item.sign;
    const raw = Buffer.isBuffer(body) ? body : Buffer.from(body ?? "");
    const BODY = "\u0000body\u0000";
    const payload =
      s.payload === undefined
        ? raw
        : Buffer.concat(
            String(fill(s.payload, { ...vars, body: BODY }))
              .split(BODY)
              .flatMap((part, i) => [
                ...(i > 0 ? [raw] : []),
                Buffer.from(part),
              ]),
          );
    let signature;
    try {
      signature = createHmac(
        s.algorithm ?? "sha256",
        String(fill(s.secret, vars)),
      )
        .update(payload)
        .digest(s.encoding ?? "hex");
    } catch (err) {
      throw new Miss(`sign: ${err.message}`);
    }
    headers[s.header.toLowerCase()] = String(
      fill(s.value ?? "{{signature}}", { ...vars, signature }),
    );
  }
  return { method, path: fill(path, vars, true), headers, body, contentType };
};

const statusMatches = (rule, status) => {
  if (Array.isArray(rule)) return rule.some((r) => statusMatches(r, status));
  if (typeof rule === "string" && /^[1-5]xx$/i.test(rule))
    return Math.floor(status / 100) === Number(rule[0]);
  return Number(rule) === status;
};

/** Where `expected` (a subset) and `actual` part, or undefined when it holds. */
const differs = (expected, actual, path) => {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual))
      return `${path} is ${show(actual)}, expected a list`;
    if (actual.length !== expected.length)
      return `${path} holds ${actual.length} item(s), expected ${expected.length}`;
    for (let i = 0; i < expected.length; i++) {
      const d = differs(expected[i], actual[i], `${path}[${i}]`);
      if (d) return d;
    }
    return undefined;
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual))
      return `${path} is ${show(actual)}, expected an object`;
    for (const [k, v] of Object.entries(expected)) {
      const d = differs(v, actual[k], path ? `${path}.${k}` : k);
      if (d) return d;
    }
    return undefined;
  }
  return expected === actual
    ? undefined
    : `${path || "the body"} is ${show(actual)}, expected ${show(expected)}`;
};

const listAt = (json, path) => {
  const list = valueAt(json, path);
  if (!Array.isArray(list))
    throw new Miss(`${path} is ${show(list)}, not a list`);
  return list;
};

/** Every way one answer misses its expectations (status aside). */
const missesOf = (e, a) => {
  const m = [];
  const json = a.json;
  if (e.body !== undefined) {
    const d = differs(e.body, json, "");
    if (d) m.push(d);
  }
  for (const p of e.has ?? [])
    if (valueAt(json, p) === undefined) m.push(`nothing at ${p}`);
  for (const p of e.absent ?? [])
    if (valueAt(json, p) !== undefined)
      m.push(`${p} is ${show(valueAt(json, p))}, expected nothing`);
  for (const [p, n] of Object.entries(e.count ?? {})) {
    const list = valueAt(json, p);
    if (!Array.isArray(list)) m.push(`${p} is ${show(list)}, not a list`);
    else if (list.length !== n)
      m.push(`${p} holds ${list.length} item(s), expected ${n}`);
  }
  for (const t of [e.contains ?? []].flat())
    if (!a.text.includes(t)) m.push(`the body does not contain ${show(t)}`);
  for (const [name, want] of Object.entries(e.headers ?? {})) {
    const got = a.headers[name.toLowerCase()];
    if (want === false ? got !== undefined : got === undefined)
      m.push(`header ${name} is ${got === undefined ? "missing" : show(got)}`);
    else if (typeof want === "string" && !got.includes(want))
      m.push(
        `header ${name} is ${show(got)}, expected it to contain ${show(want)}`,
      );
  }
  if (e.bytes !== undefined && a.bytes.length !== e.bytes)
    m.push(`${a.bytes.length} bytes, expected ${e.bytes}`);
  if (e.type !== undefined && !a.type.startsWith(e.type))
    m.push(`content-type ${show(a.type)}, expected ${show(e.type)}`);
  // A list holds an item like this, however many others earlier runs left
  // (test users and what they wrote persist between runs).
  for (const [p, like] of Object.entries(e.includes ?? {}))
    if (!listAt(json, p).some((item) => differs(like, item, "") === undefined))
      m.push(`${p} holds no item like ${show(like)}`);
  for (const [p, field] of Object.entries(e.unique ?? {})) {
    const seen = new Set();
    for (const item of listAt(json, p)) {
      const key = JSON.stringify(valueAt(item, field));
      if (seen.has(key)) {
        m.push(`${p} holds ${field} ${key} twice`);
        break;
      }
      seen.add(key);
    }
  }
  for (const [p, spec] of Object.entries(e.sorted ?? {})) {
    const desc = String(spec).startsWith("-");
    const field = String(spec).replace(/^-/, "");
    const list = listAt(json, p);
    const lacking = list.findIndex((it) => valueAt(it, field) === undefined);
    if (lacking >= 0) {
      m.push(`${p}[${lacking}] has no ${field} to order by`);
      continue;
    }
    for (let i = 1; i < list.length; i++) {
      const x = valueAt(list[i - 1], field);
      const y = valueAt(list[i], field);
      if (desc ? x < y : x > y) {
        m.push(
          `${p} is not in ${desc ? "descending" : "ascending"} ${field} order at ${i}: ${show(x)} then ${show(y)}`,
        );
        break;
      }
    }
  }
  return m;
};

/** Every way a request's answers miss `expect`; none is a pass. */
const judge = (expect, answers) => {
  const e = expect ?? {};
  const misses = [];
  if (e.statuses !== undefined) {
    const got = countStatuses(answers);
    const want = Object.fromEntries(
      Object.entries(e.statuses).map(([s, n]) => [s, n]),
    );
    const all = new Set([...Object.keys(got), ...Object.keys(want)]);
    if ([...all].some((s) => (got[s] ?? 0) !== (want[s] ?? 0)))
      misses.push(`statuses ${showCounts(got)}, expected ${showCounts(want)}`);
  }
  const rule = e.status ?? (e.statuses === undefined ? "2xx" : undefined);
  const many = answers.length > 1;
  answers.forEach((a, k) => {
    const m = [];
    if (rule !== undefined && !statusMatches(rule, a.status))
      m.push(`status ${a.status}, expected ${show(rule)}`);
    // With `times`, what an answer holds is asked of the answers that succeeded.
    if (m.length === 0 && (!many || (a.status >= 200 && a.status < 300)))
      m.push(...missesOf(e, a));
    if (m.length > 0 && misses.length < 3)
      misses.push(`${many ? `#${k + 1} ` : ""}${m.join("; ")}`);
  });
  return misses;
};

/** One item: sent (n times at once, or every page), judged, polled while `eventually` lasts. */
const runItem = async (base, item, vars, n) => {
  const { method, path } = requestOf(item, "");
  let shown = path;
  try {
    shown = fill(path, vars, true);
  } catch {
    // A path naming a value nothing saved is shown as written; the miss says why.
  }
  const label = item.name ?? `${item.as} ${method} ${shown}`;
  const deadline = Date.now() + (item.eventually ?? 0);
  const started = Date.now();
  for (let tries = 1; ; tries++) {
    let answers = [];
    let misses;
    let final = false;
    let needs;
    // One time for this try: what a request carries and what it expects agree.
    const timestamp = secondsNow();
    try {
      answers = await Promise.all(
        Array.from({ length: item.times ?? 1 }, async (_, i) => {
          const req = buildRequest(item, { ...vars, i, timestamp });
          if (!item.pages) return sendAs(base, item.as, req);
          const param = item.pages === true ? "after" : item.pages.param;
          const walked = await sendPages(base, item.as, req, param);
          if (walked.more)
            throw new Miss(
              `more than ${PAGE_MAX} pages; check a narrower list`,
            );
          if (!walked.paged) return walked.res;
          const json = { items: walked.items, pages: walked.pages };
          return { ...walked.res, json, text: JSON.stringify(json) };
        }),
      );
      misses = judge(fill(item.expect, { ...vars, i: 0, timestamp }), answers);
    } catch (err) {
      if (!(err instanceof Miss)) throw err;
      // A miss found while asking (a list that is not one yet) is asked
      // again too, while `eventually` lasts; a value nothing saved is not.
      misses = [err.message];
      // Asking again cannot mend a value nothing saved, nor a request that
      // never went out.
      final = err instanceof Unsaved || answers.length === 0;
      if (err instanceof Unsaved && err.needs) needs = err.needs;
    }
    if (misses.length === 0 || final || Date.now() >= deadline) {
      // Saved from the first answer that succeeded: with `times`, the
      // winner of a race, not whichever answer came back first.
      const source =
        answers.find((a) => a.status >= 200 && a.status < 300) ?? answers[0];
      const saves = {};
      for (const [name, p] of Object.entries(item.save ?? {})) {
        const v = source ? valueAt(source.json, p) : undefined;
        if (v !== undefined) saves[name] = v;
        else if (source && !misses.some((m) => m.includes(`nothing at ${p}`)))
          misses.push(`nothing at ${p} to save as ${name}`);
      }
      return {
        n,
        label,
        ok: misses.length === 0,
        misses,
        statuses: answers.length > 0 ? answers.map((a) => a.status) : undefined,
        ...(needs ? { needs } : {}),
        body:
          answers.length === 1
            ? bodyWords(answers[0], asJson ? undefined : 300)
            : undefined,
        saves,
        tries,
        ms: Date.now() - started,
      };
    }
    await sleep(1000);
  }
};

const check = async (items) => {
  const started = Date.now();
  const base = await host();
  usersProject = await projectId();
  const everyone = new Set();
  const walk = (list) =>
    list.forEach((it) =>
      it.parallel
        ? walk(it.parallel)
        : it.as && it.as !== "-" && everyone.add(it.as),
    );
  walk(items);
  // Made up front, at once: each name once, so no two requests make one user.
  await Promise.all([...everyone].map((who) => sessionOf(who)));
  const vars = {
    nonce: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  };
  const results = [];
  /** Each name a request was to save and did not, with that request's number. */
  const unsaved = new Map();
  let n = 0;
  for (const item of items) {
    if (item.wait) {
      await sleep(item.wait);
      continue;
    }
    const group = item.parallel ?? [item];
    const done = await Promise.all(
      group.map((it) => runItem(base, it, vars, ++n)),
    );
    group.forEach((it, k) => {
      const r = done[k];
      // A request that needed what a failed one did not save is skipped,
      // not failed: the one failure is its cause, said once.
      const cause = r.needs === undefined ? undefined : unsaved.get(r.needs);
      if (cause !== undefined) Object.assign(r, { ok: false, skipped: cause });
      results.push(r);
      Object.assign(vars, r.saves);
      for (const name of Object.keys(it.save ?? {}))
        if (!(name in (r.saves ?? {})))
          unsaved.set(name, cause ?? { n: r.n, name });
    });
  }
  const skipped = results.filter((r) => r.skipped);
  const failed = results.filter((r) => !r.ok && !r.skipped);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (asJson) {
    out(
      JSON.stringify(
        {
          passed: results.length - failed.length - skipped.length,
          failed: failed.length,
          skipped: skipped.length,
          results: results.map(({ saves: _, ...r }) => r),
        },
        null,
        2,
      ),
    );
  } else {
    for (const r of results) {
      const got = r.statuses
        ? showCounts(countStatuses(r.statuses.map((status) => ({ status }))))
        : "-";
      if (r.ok) {
        if (flags.get("all") === true) out(`ok   ${r.n} ${r.label} → ${got}`);
        continue;
      }
      if (r.skipped) continue;
      out(`FAIL ${r.n} ${r.label} → ${got}: ${r.misses.join("; ")}`);
      if (r.body) out(`     body: ${oneLine(r.body)}`);
    }
    // One line per value a failed request did not save, naming every request
    // that needed it.
    const byCause = new Map();
    for (const r of skipped) {
      const key = `${r.skipped.n} ${r.skipped.name}`;
      byCause.set(key, [...(byCause.get(key) ?? []), r.n]);
    }
    for (const [key, ns] of byCause) {
      const [n, name] = key.split(" ");
      out(
        `skip ${ns.join(", ")}: ${ns.length > 1 ? "they need" : "it needs"} {{${name}}}, which ${n} did not save`,
      );
    }
    out(
      `check: ${results.length - failed.length - skipped.length} passed, ${failed.length} failed${skipped.length > 0 ? `, ${skipped.length} skipped` : ""} (${seconds} s)`,
    );
  }
  if (failed.length > 0) throw refused("");
};

// ── preview ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const preview = async (flowKey) => {
  const scheduleKey = flags.get("schedule");
  const as = flags.get("as");
  if (!flowKey && typeof scheduleKey !== "string")
    throw usage(
      "preview <flow key> [--as <user|nobody|me>] [--input <json>] [--apply] [--fan-out-cap <n|uncapped>]\n" +
        "preview --schedule <key> [--input <json>] [--apply]",
    );
  if (
    typeof scheduleKey === "string" &&
    typeof as === "string" &&
    as !== NOBODY
  )
    throw usage(
      `--schedule runs the flow as its schedule fires it, as nobody: drop --as ${as}`,
    );
  const id = await projectId();
  usersProject = id;
  let given;
  if (typeof flags.get("input") === "string") {
    try {
      given = JSON.parse(flags.get("input"));
    } catch {
      throw usage("--input takes a JSON object of the flow's inputs");
    }
    if (!given || typeof given !== "object" || Array.isArray(given))
      throw usage("--input takes a JSON object of the flow's inputs");
  }
  // A schedule fires with no end user and only its stored inputs. Read the
  // project's schedules when they decide the run: --schedule names one, and a
  // flow a schedule starts previews the way it fires unless --as says whom.
  let schedules = [];
  let unread;
  if (typeof scheduleKey === "string" || typeof as !== "string") {
    const res = await api(
      "GET",
      `/v1/schedules?project=${encodeURIComponent(id)}`,
    );
    // Only --schedule needs the list; without it, a key that cannot read
    // schedules previews as the caller, and says so.
    if (typeof scheduleKey === "string") ok(res, "listing schedules");
    if (res.status === 200) schedules = res.json?.schedules ?? [];
    else
      unread = `could not read the schedules (${res.status}): as you, the caller; --as nobody runs it as a schedule fires`;
  }
  let schedule;
  if (typeof scheduleKey === "string") {
    schedule = schedules.find(
      (s) => s.key === scheduleKey || s.id === scheduleKey,
    );
    if (!schedule)
      throw refused(
        `no schedule ${scheduleKey}; the project's schedules: ${schedules.map((s) => s.key).join(", ") || "none"}`,
      );
  }
  const list = ok(
    await api("GET", `/v1/flows?project=${encodeURIComponent(id)}`),
    "listing flows",
  );
  const flows = list?.flows ?? list?.items ?? [];
  const flow = schedule
    ? flows.find((f) => f.id === schedule.flowId)
    : flows.find((f) => f.key === flowKey || f.id === flowKey);
  if (!flow)
    throw refused(
      schedule
        ? `schedule ${schedule.key} runs flow ${schedule.flowId}, which this key does not list`
        : `no flow ${flowKey}; the project's flows: ${flows.map((f) => f.key).join(", ")}`,
    );
  if (schedule && flowKey && flowKey !== flow.key && flowKey !== flow.id)
    throw usage(
      `schedule ${schedule.key} runs flow ${flow.key}, not ${flowKey}: name one or the other`,
    );
  let note = unread;
  let several = false;
  if (!schedule && typeof as !== "string") {
    const starting = schedules.filter((s) => s.flowId === flow.id);
    if (starting.length === 1) schedule = starting[0];
    else if (starting.length > 1) {
      several = true;
      note = `as nobody, the way schedules ${starting.map((s) => s.key).join(", ")} fire it; --schedule <key> adds one's inputs`;
    }
  }
  const nobody = schedule !== undefined || several || as === NOBODY;
  // A schedule's stored inputs, with --input laid over them.
  const inputs = { ...(schedule?.inputs ?? {}), ...(given ?? {}) };
  const input = { kind: "slots", inputs };
  if (nobody) {
    input.principal = "no-end-user";
    note ??= schedule
      ? `as nobody with schedule ${schedule.key}'s inputs, the way it fires`
      : "as nobody, the way a schedule fires";
    // What a fire does and a preview does not: say it where it is read.
    note += " (a preview sends no mail and starts no per-person runs)";
  } else if (typeof as === "string" && as !== ME) {
    const u = users()[as] ?? (await makeUser(as));
    Object.assign(input, { principal: "end-user", runAsUserId: u.id });
  }
  let fanOutCap;
  const capFlag = flags.get("fan-out-cap");
  if (typeof capFlag === "string") {
    fanOutCap = capFlag === "uncapped" ? "uncapped" : Number(capFlag);
    if (
      fanOutCap !== "uncapped" &&
      !(Number.isInteger(fanOutCap) && fanOutCap >= 1 && fanOutCap <= 1000)
    )
      throw usage("--fan-out-cap takes a whole number 1-1000, or uncapped");
  }
  const queued = ok(
    await api("POST", `/v1/flows/${encodeURIComponent(flow.id)}/preview-runs`, {
      input,
      apply: flags.get("apply") === true,
      ...(fanOutCap === undefined ? {} : { fanOutCap }),
    }),
    "queueing the preview",
  );
  const runId = queued?.runId;
  let run;
  for (let i = 0; i < 120; i++) {
    const res = await api("GET", `/v1/runs/${encodeURIComponent(runId)}`);
    if (res.status === 200) {
      run = res.json?.run ?? res.json;
      // A run is over when it has a closing, or its lifecycle says it will
      // not close: `unknown` is a preview with no closing YET, so keep waiting.
      if (
        run?.closing ||
        run?.lifecycle === "settled" ||
        run?.lifecycle === "lost"
      )
        break;
    } else if (res.status !== 404)
      throw refused(`reading the run: ${refusal(res)}`);
    await sleep(500);
  }
  const traceRes = await api(
    "GET",
    `/v1/runs/${encodeURIComponent(runId)}/trace`,
  );
  const trace = traceRes.status === 200 ? traceRes.json : undefined;
  if (asJson) {
    const who = nobody ? NOBODY : typeof as === "string" && as !== ME ? as : ME;
    out(
      JSON.stringify(
        { runId, as: who, schedule: schedule?.key ?? null, run, trace },
        null,
        2,
      ),
    );
    return;
  }
  if (note) out(note);
  // `closing.verdict` is how the run ended; `closing.failure` why it failed.
  const outcome = run?.closing
    ? (run.closing.verdict ?? run.closing.kind ?? "closed")
    : run?.lifecycle === "lost"
      ? "lost"
      : undefined;
  // `partial`: it succeeded past failures a `try`, a `repeat` or an `each`'s
  // tolerance let go; the count says how many.
  const a = run?.closing?.absorbed;
  const absorbed = a ? (a.steps ?? 0) + (a.calls ?? 0) + (a.branches ?? 0) : 0;
  out(
    `run ${runId} ${outcome ?? "still running (read GET /v1/runs/{runId} later)"}${outcome === "partial" && absorbed > 0 ? ` (${absorbed} failure(s) let go)` : ""}`,
  );
  const failure = run?.closing?.failure;
  if (failure) out(`failure: ${oneLine(JSON.stringify(failure))}`);
  // Each write, in order, with its own value: a `current` write is what its
  // slot holds now, a `superseded` one (an each's earlier item) carries its
  // value, a `failed` one its error. A written record shows its id.
  const slots = trace?.slotOutputs ?? {};
  for (const w of trace?.stepOutputs?.writes ?? []) {
    const where = `${w.stepName ?? w.stepKey}${w.branchId ? ` [${w.branchId}]` : ""}`;
    if (w.kind === "failed") {
      out(`  ${where} failed: ${cut(oneLine(w.error), 300)}`);
      continue;
    }
    const value = w.kind === "superseded" ? w.value : slots[w.slot];
    const id =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value.recordId ?? value.id)
        : undefined;
    out(
      `  ${where} → ${w.slot}: ${typeof id === "string" ? `record ${id}` : cut(oneLine(JSON.stringify(value ?? null)), 160)}`,
    );
  }
  if (trace?.output !== undefined)
    out(`output: ${cut(oneLine(JSON.stringify(trace.output)), 400)}`);
  await printCaps(runId, run);
  if (outcome === "failed") throw refused("");
};

/** Says which `each` ran fewer items than it was handed, and how to lift it. */
const printCaps = async (runId, run) => {
  const capped = (run?.closing?.warnings ?? []).some(
    (w) => w.kind === "each-capped",
  );
  if (!capped) return;
  const res = await api(
    "GET",
    `/v1/runs/${encodeURIComponent(runId)}/timeline`,
  );
  const rows = (res.status === 200 ? res.json?.timeline : undefined) ?? [];
  const caps = rows.filter(
    (r) => r.kind === "step-warned" && r.detail?.kind === "each-capped",
  );
  if (caps.length === 0)
    out("capped: an each ran fewer items than it was handed");
  for (const r of caps) {
    const d = r.detail;
    out(
      `capped: ${r.stepName ?? r.stepKey} ran ${d.branches ?? "?"} of ${d.requested ?? "?"} items (--fan-out-cap <n|uncapped> runs more)`,
    );
  }
};

// ── find ────────────────────────────────────────────────────────────────────

/**
 * "Can Kipory do X?" in one call: the capability search route answers the
 * functions that do it, each with a ready step, or `cannot` with the nearest
 * and a report to file. Its `text` is the whole answer, written to be read.
 */
const find = async (query) => {
  const q = query.join(" ").trim();
  if (q === "")
    throw usage('find <words…>, e.g. find "sign a webhook with hmac"');
  const res = await api(
    "GET",
    `/v1/functions/search?${new URLSearchParams({ q, project: await projectId() })}`,
  );
  if (res.status === 404 && res.json?.code !== "VALIDATION_FAILED")
    throw refused(
      "this deployment has no capability search yet: read the function list in kipory-connect's SKILL.md",
    );
  if (res.status === 503)
    throw refused(
      `could not search just now (${refusal(res)}); ask again — this is not a no`,
    );
  const answer = ok(res, "searching the capabilities");
  if (asJson) out(JSON.stringify(answer, null, 2));
  else out(String(answer?.text ?? "").trimEnd());
  if (flags.get("report") === true) {
    if (answer?.verdict !== "cannot" || !answer?.report) {
      if (!asJson) out("(found: nothing to report)");
      return;
    }
    ok(await api("POST", "/v1/reports", answer.report), "filing the report");
    if (!asJson) out("reported: this miss is filed for the Kipory team");
  }
};

// ── connect ─────────────────────────────────────────────────────────────────

/** The first line of the shim `connect` writes; a file without it is not ours. */
const SHIM_MARK = "# kipory: this folder's kipory command";

/**
 * `./kipory`: a two-line shell script that runs this file, so an agent writes
 * `./kipory ship app.mjs` and never builds the command in a shell variable
 * (zsh does not split `K="node …"; $K`: 12 failed calls in the 11-11 sweep).
 */
const connect = async () => {
  const shim = resolve("kipory");
  const script = fileURLToPath(import.meta.url);
  const body = `#!/bin/sh\n${SHIM_MARK}\nexec node '${script.replaceAll("'", "'\\''")}' "$@"\n`;
  if (existsSync(shim) && !readFileSync(shim, "utf8").includes(SHIM_MARK))
    throw usage(
      "./kipory exists and is not this command's: move it, or run the command in full",
    );
  writeFileSync(shim, body, { mode: 0o755 });
  chmodSync(shim, 0o755);
  if (!asJson)
    out("./kipory is this command now: ./kipory <command> from here on");
  await summary();
};

// ── summary ─────────────────────────────────────────────────────────────────

const summary = async () => {
  const g = await grant();
  const s = ok(
    await api(
      "GET",
      `/v1/projects/${encodeURIComponent(g.id)}/document/summary`,
    ),
    "reading the summary",
  );
  if (asJson) {
    out(JSON.stringify({ host: g.host, ...s }, null, 2));
    return;
  }
  out(`project ${g.id}  version ${s.version}  host ${g.host ?? "(none)"}`);
  for (const l of s.lines ?? []) out(l);
};

// ── docs ────────────────────────────────────────────────────────────────────

const markdownFiles = (dir) => {
  const found = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) found.push(...markdownFiles(p));
    else if (name.endsWith(".md")) found.push(p);
  }
  return found;
};

const sectionsOf = (file) => {
  const lines = readFileSync(file, "utf8").split("\n");
  const sections = [];
  let current = { heading: relative(SKILLS, file), start: 0, lines: [] };
  let fence = false;
  for (const line of lines) {
    if (line.startsWith("```")) fence = !fence;
    if (!fence && /^#{1,4} /.test(line)) {
      if (current.lines.join("").trim().length > 0) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, ""), lines: [] };
    }
    current.lines.push(line);
  }
  if (current.lines.join("").trim().length > 0) sections.push(current);
  return sections.map((s) => ({ ...s, file, text: s.lines.join("\n") }));
};

const docs = (query) => {
  if (query.length === 0) throw usage("docs <words…>, e.g. docs refuse 409");
  // A quoted phrase arrives as one argument: its words count one by one.
  const terms = query
    .flatMap((w) => w.toLowerCase().split(/\s+/))
    .filter((w) => w.length > 1);
  const scored = [];
  for (const file of markdownFiles(SKILLS)) {
    for (const s of sectionsOf(file)) {
      const head = s.heading.toLowerCase();
      const body = s.text.toLowerCase();
      let score = 0;
      let matched = 0;
      for (const t of terms) {
        const inHead = head.includes(t);
        const count = body.split(t).length - 1;
        if (inHead || count > 0) matched++;
        score +=
          (inHead ? 3 : 0) +
          Math.min(count, 5) +
          (body.includes(`\`${t}\``) ? 2 : 0);
      }
      if (matched === 0) continue;
      // Every word found counts most; a long section is not better for being long.
      score =
        (score * (matched / terms.length) ** 2) /
        Math.log2(8 + s.text.length / 400);
      scored.push({ ...s, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) {
    out(`nothing in these skills matches: ${query.join(" ")}`);
    throw refused("");
  }
  const [best, ...rest] = scored;
  const more = Number(flags.get("more") ?? 5);
  if (asJson) {
    out(
      JSON.stringify(
        scored.slice(0, more + 1).map((s) => ({
          file: relative(SKILLS, s.file),
          heading: s.heading,
          bytes: s.text.length,
        })),
        null,
        2,
      ),
    );
    return;
  }
  out(`${relative(SKILLS, best.file)} — ${best.heading}`);
  out(
    flags.get("full") === true
      ? best.text
      : cut(best.text, DOCS_CUT, "--full for all"),
  );
  if (rest.length > 0) {
    out("more:");
    for (const s of rest.slice(0, more))
      out(
        `  ${relative(SKILLS, s.file)}#${s.heading} (${(s.text.length / 1024).toFixed(1)} KB)`,
      );
  }
};

// ── main ────────────────────────────────────────────────────────────────────

// The comment block at the top of this file, up to its first line of code.
const HELP = (() => {
  const lines = readFileSync(fileURLToPath(import.meta.url), "utf8").split(
    "\n",
  );
  const end = lines.findIndex((l, i) => i > 0 && !l.startsWith("//"));
  return lines
    .slice(1, end)
    .map((l) => l.replace(/^\/\/ ?/, ""))
    .join("\n");
})();

/** The flags each command takes beyond --json, --env and --help: any other is refused, not ignored. */
const COMMAND_FLAGS = {
  plan: ["all"],
  apply: ["note", "all"],
  ship: ["check", "note", "all"],
  check: ["all"],
  user: [],
  call: [
    "full",
    "header",
    "pages",
    "page-param",
    "times",
    "out",
    "body",
    "body-file",
    "type",
  ],
  preview: ["as", "input", "apply", "fan-out-cap", "schedule"],
  summary: [],
  connect: [],
  docs: ["more", "full"],
  find: ["report"],
};
/** Flags no command reads together: one of each pair is ignored otherwise. */
const APART = [
  ["pages", "times"],
  ["pages", "out"],
  ["times", "out"],
  ["body", "body-file"],
];

const main = async () => {
  if (badFlag) throw usage(badFlag);
  const [command, ...rest] = flags.get("help") === true ? ["help"] : words;
  const takes = COMMAND_FLAGS[command];
  if (command === "ship" && asJson)
    throw usage(
      "ship prints its stages as lines; for JSON run plan --json, apply --json and check --json",
    );
  if (takes) {
    const extra = [...flags.keys()].filter(
      (f) => !["json", "env", "help"].includes(f) && !takes.includes(f),
    );
    if (extra.length > 0)
      throw usage(
        `${command} does not take ${extra.map((f) => `--${f}`).join(", ")}${takes.length > 0 ? `; it takes ${takes.map((f) => `--${f}`).join(", ")}` : ""}`,
      );
    const both = APART.find(([a, b]) => flags.has(a) && flags.has(b));
    if (both) throw usage(`--${both[0]} and --${both[1]} do not go together`);
  }
  switch (command) {
    case "plan":
      if (!(await plan(rest[0])).ok) throw refused("");
      return;
    case "apply":
      await apply();
      return;
    case "ship": {
      // The checks are read before anything is planned: a spec with a typo
      // stops here, not after the apply.
      const checks =
        typeof flags.get("check") === "string"
          ? loadSpec(flags.get("check"))
          : undefined;
      const p = await plan(rest[0]);
      if (!p.ok) throw refused("");
      await apply();
      if (checks) await check(checks);
      return;
    }
    case "check":
      return check(loadSpec(rest[0]));
    case "user":
      return user(rest[0]);
    case "call":
      return call(rest[0], rest[1], rest[2], rest[3]);
    case "preview":
      return preview(rest[0]);
    case "find":
      return find(rest);
    case "connect":
      return connect();
    case "summary":
      return summary();
    case "docs":
      return docs(rest);
    case undefined:
    case "help":
    case "--help":
      out(HELP);
      return;
    default:
      throw usage(`unknown command ${command}\n${HELP}`);
  }
};

main().catch((err) => {
  if (err instanceof Exit) {
    if (err.message) process.stderr.write(`${err.message}\n`);
    process.exit(err.code);
  }
  process.stderr.write(`${err?.stack ?? err}\n`);
  process.exit(2);
});
