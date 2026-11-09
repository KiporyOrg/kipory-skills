#!/usr/bin/env node
// kipory — plan, apply and try a Kipory project in single, short commands.
//
//   node .claude/skills/kipory-connect/scripts/kipory.mjs <command> [args] [--json]
//
//   plan <doc>                 plan a document: one line per error, warnings counted
//   apply [--note <text>]      apply the plan `plan` just made
//   ship <doc> [--note <text>] plan, then apply when the plan is clean
//   user <name>                a test user, made once and remembered
//   call <user|-> <METHOD> <path> [json]   call the project's own host as that user
//   preview <flow> [--as <user>] [--input <json>] [--apply] [--fan-out-cap <n|uncapped>]
//                              run a flow in the sandbox, print each write
//   summary                    what the project holds, one line per element
//   docs <words…>              the best-matching section of these skills
//
// <doc> is a .json or .yaml file, or a .mjs/.js file whose standard output is
// the document (a generator). It reads KIPORY_BASE_URL, KIPORY_API_KEY and
// KIPORY_PROJECT_ID from the environment, then ./.env (or --env <file>), keeps
// its state in ./.kipory/, and never prints the key or a session. A preview
// runs each `each` on its first 5 items unless --fan-out-cap says otherwise.
// Exit codes: 0 done, 1 refused, 2 usage or environment. Node 18+, no deps.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE = resolve(".kipory");
const BODY_CUT = 2048;
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
const SWITCHES = new Set(["json", "all", "full", "apply", "help"]);
const VALUED = new Set(["note", "as", "input", "more", "env", "fan-out-cap"]);
let badFlag;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const name = a.startsWith("--") ? a.slice(2) : undefined;
  if (name === undefined) words.push(a);
  else if (SWITCHES.has(name)) flags.set(name, true);
  else if (VALUED.has(name)) {
    if (i + 1 >= argv.length) badFlag ??= `${a} takes a value`;
    flags.set(name, argv[++i]);
  } else
    badFlag ??= `unknown flag ${a}; the flags are ${[...SWITCHES, ...VALUED]
      .map((f) => `--${f}`)
      .join(", ")}`;
}
const asJson = flags.get("json") === true;

const out = (line) => process.stdout.write(`${line}\n`);
const oneLine = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
const cut = (s, n) =>
  s.length > n ? `${s.slice(0, n)}… (${s.length} bytes, --full for all)` : s;

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
  write(name, value) {
    mkdirSync(STATE, { recursive: true });
    writeFileSync(join(STATE, name), `${JSON.stringify(value, null, 2)}\n`);
  },
};

// ── HTTP ────────────────────────────────────────────────────────────────────

const request = async (
  url,
  { method = "GET", body, contentType, token } = {},
) => {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined)
    headers["content-type"] = contentType ?? "application/json";
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : typeof body === "string"
            ? body
            : JSON.stringify(body),
    });
  } catch (err) {
    throw usage(
      `cannot reach ${new URL(url).origin}: ${err?.cause?.code ?? err?.message ?? err}`,
    );
  }
  const text = await res.text();
  let json;
  try {
    json = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: res.status, text, json };
};

const api = async (method, path, body, contentType) => {
  if (!BASE)
    throw usage(`KIPORY_BASE_URL is not set (environment or ${ENV_FILE})`);
  if (!KEY)
    throw usage(`KIPORY_API_KEY is not set (environment or ${ENV_FILE})`);
  return request(`${BASE}${path}`, { method, body, contentType, token: KEY });
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

const loadDocument = (file) => {
  if (!file)
    throw usage("name the document: plan <doc.json|doc.yaml|generator.mjs>");
  if (!existsSync(file)) throw usage(`no such file: ${file}`);
  const ext = extname(file);
  if (ext === ".mjs" || ext === ".js" || ext === ".cjs") {
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
      const doc = JSON.parse(stdout);
      return {
        body: doc,
        contentType: "application/json",
        basedOn: doc?.basedOn,
      };
    } catch {
      throw usage(
        `the generator ${file} printed no JSON document on its standard output`,
      );
    }
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
    });
    if (d.decision) out(`  decide: ${oneLine(d.decision)}`);
  }
  if (edits)
    out(
      "(a fix's edit changes this flow's steps: make it in your document; --json has every edit whole)",
    );
  const rest = list.filter((d) => d.severity !== "error");
  if (flags.get("all") === true) {
    for (const d of rest)
      out(`${d.severity} ${d.code} ${d.field ?? "-"}: ${oneLine(d.message)}`);
  } else {
    // Warnings and info findings, counted by code: neither refuses.
    for (const severity of ["warning", "info"]) {
      const found = rest.filter((d) => d.severity === severity);
      if (found.length === 0) continue;
      const byCode = new Map();
      for (const w of found) byCode.set(w.code, (byCode.get(w.code) ?? 0) + 1);
      out(
        `${found.length} ${severity === "info" ? "info" : "warning(s)"}: ${[...byCode].map(([c, n]) => (n > 1 ? `${c}×${n}` : c)).join(", ")} (--all to read them)`,
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

/** The test users this folder made, for the project the environment names. */
let usersProject;
const users = () => (state.read("users.json") ?? {})[usersProject] ?? {};
const saveUsers = (all) => {
  const every = state.read("users.json") ?? {};
  every[usersProject] = all;
  state.write("users.json", every);
};

const makeUser = async (name) => {
  const id = await projectId();
  usersProject = id;
  const res = await api("POST", "/v1/test-users", { project: id, name });
  if (res.status < 200 || res.status >= 300) {
    const known = Object.keys(users());
    throw refused(
      `making test user ${name}: ${refusal(res)}${known.length > 0 ? `\nremembered users: ${known.join(", ")}` : ""}`,
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
  usersProject = await projectId();
  const known = users()[name];
  const u = known ?? (await makeUser(name));
  if (asJson) out(JSON.stringify({ name, id: u.id, expiresAt: u.expiresAt }));
  else out(`user ${name} ${u.id}${known ? " (remembered)" : " (made)"}`);
};

/** A fresh session for a remembered user, or the user made again when it is gone. */
const renew = async (name) => {
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

const call = async (who, method, path, body) => {
  if (!who || !method || !path)
    throw usage("call <user|-> <METHOD> <path> [json]");
  if (!path.startsWith("/"))
    throw usage("the path starts with /, as /v1/notes");
  const base = await host();
  usersProject = await projectId();
  let parsed;
  if (body !== undefined) {
    try {
      parsed = JSON.parse(body);
    } catch {
      throw usage(`the body is not JSON: ${body}`);
    }
  }
  const send = async (session) =>
    request(`${base}${path}`, {
      method: method.toUpperCase(),
      body: parsed,
      token: session,
    });
  let session;
  if (who !== "-") session = (users()[who] ?? (await makeUser(who))).session;
  let res = await send(session);
  if (res.status === 401 && who !== "-")
    res = await send((await renew(who)).session);
  if (asJson)
    out(JSON.stringify({ status: res.status, body: res.json ?? res.text }));
  else {
    out(String(res.status));
    if (res.text.length > 0)
      out(flags.get("full") === true ? res.text : cut(res.text, BODY_CUT));
  }
  if (res.status >= 400) throw refused("");
};

// ── preview ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const preview = async (flowKey) => {
  if (!flowKey)
    throw usage(
      "preview <flow key> [--as <user>] [--input <json>] [--apply] [--fan-out-cap <n|uncapped>]",
    );
  const id = await projectId();
  usersProject = id;
  const list = ok(
    await api("GET", `/v1/flows?project=${encodeURIComponent(id)}`),
    "listing flows",
  );
  const flows = list?.flows ?? list?.items ?? [];
  const flow = flows.find((f) => f.key === flowKey || f.id === flowKey);
  if (!flow)
    throw refused(
      `no flow ${flowKey}; the project's flows: ${flows.map((f) => f.key).join(", ")}`,
    );
  let inputs = {};
  if (typeof flags.get("input") === "string") {
    try {
      inputs = JSON.parse(flags.get("input"));
    } catch {
      throw usage("--input takes a JSON object of the flow's inputs");
    }
  }
  const input = { kind: "slots", inputs };
  const as = flags.get("as");
  if (typeof as === "string") {
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
    out(JSON.stringify({ runId, run, trace }, null, 2));
    return;
  }
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
    const lift =
      d.cappedBy === "preview"
        ? "--fan-out-cap <n|uncapped> runs more"
        : d.cappedBy === "config"
          ? "the step's own maxItems bounds it"
          : "the platform's ceiling bounds it";
    out(
      `capped: ${r.stepName ?? r.stepKey} ran ${d.branches ?? "?"} of ${d.requested ?? "?"} items (${lift})`,
    );
  }
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
  out(flags.get("full") === true ? best.text : cut(best.text, DOCS_CUT));
  if (rest.length > 0) {
    out("more:");
    for (const s of rest.slice(0, more))
      out(
        `  ${relative(SKILLS, s.file)}#${s.heading} (${(s.text.length / 1024).toFixed(1)} KB)`,
      );
  }
};

// ── main ────────────────────────────────────────────────────────────────────

const HELP = readFileSync(fileURLToPath(import.meta.url), "utf8")
  .split("\n")
  .slice(1, 21)
  .map((l) => l.replace(/^\/\/ ?/, ""))
  .join("\n");

const main = async () => {
  if (badFlag) throw usage(badFlag);
  const [command, ...rest] = flags.get("help") === true ? ["help"] : words;
  switch (command) {
    case "plan":
      if (!(await plan(rest[0])).ok) throw refused("");
      return;
    case "apply":
      await apply();
      return;
    case "ship": {
      const p = await plan(rest[0]);
      if (!p.ok) throw refused("");
      await apply();
      return;
    }
    case "user":
      return user(rest[0]);
    case "call":
      return call(rest[0], rest[1], rest[2], rest[3]);
    case "preview":
      return preview(rest[0]);
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
