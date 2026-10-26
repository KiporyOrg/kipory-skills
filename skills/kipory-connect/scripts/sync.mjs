#!/usr/bin/env node
// Compare the reference layer bundled with these skills against the Kipory
// deployment you are building on, and say which side to trust.
//
// The content hashes every generated reference page was built from are recorded
// once, in `references/versions.md` beside this script. The deployment serves
// all four live: `version` on `GET /v1/capability-packs` and on
// `GET /v1/functions`, and `info["x-kipory-surface-version"]` (the API pages)
// and `info["x-kipory-refusal-codes-version"]` (the refusal-code page,
// `references/refusal-codes.md`) on `GET /v1/openapi.json`. When they match,
// the bundled copy is exactly what the
// deployment would return; when they differ, the deployment moved (or these
// files are older than it) and the live one wins.
//
// A layer that differs is then compared item by item. `references/manifest.json`
// records one hash per pack, per function and per API route, and the same three
// reads serve the same hashes: `hash` on each pack in the index, `hashes` on
// the function catalog, `info["x-kipory-surface-operations"]` on the OpenAPI
// document. The script prints the names that differ, so only those pages need
// a live read — the rest of the layer is what the deployment serves.
//
// Hashes cover the generated pages only. The hand-written SKILL.md text is
// published when a change to these skills merges on the platform's main
// branch, and a deployment rolls later, so these skills can describe behaviour
// the deployment does not run yet. SOURCE.json, beside VERSION, records the
// commit the bundle was published from and the merges before it; the script
// finds the deployment's build (`sha` on GET /health) among them and names each
// skill change merged after it. A build it does not find is newer than the
// source — the skills publish only when they change — unless it is older than
// every recorded merge.
//
// The project document format is compared too, and it is not a hash: a
// deployment reads exactly one format (`documentFormat.version` on
// `GET /v1/platform-status`, which needs KIPORY_API_KEY), and a new one
// replaces the old with no overlap. When the format these skills write
// (`Document format:` in versions.md, the version `upgrade-document.mjs`
// converts to) is another, every document they write is refused with
// DOCUMENT_VERSION_UNSUPPORTED, and the script says so before that happens.
//
// Usage (from any directory — it finds versions.md beside itself):
//   KIPORY_BASE_URL=https://api.example.com [KIPORY_API_KEY=…] node <this skill>/scripts/sync.mjs
//
// Zero dependencies; Node 18 or newer (global fetch). The first line names the
// bundle that is running — its version and the directory it sits in — because
// several versions of these skills can sit side by side on one machine and
// each one's script compares its own pages. Then it prints one line per
// source — under a layer that differs, one line per item: `changed` (both
// sides have it, with different content), `added` (the deployment has it, the
// bundle does not) or `removed` (the bundle has it, the deployment does not),
// with the bundled page that documents it, as a path from the directory that
// holds these skills — then what to do. Exit 0: every layer was compared and
// nothing bundled differs from the deployment. Exit 1: something differs — the
// lines say which layer to read live instead, or which skill changes the
// deployment does not run yet; a layer that could not be
// compared is still listed as `not compared`, so exit 1 does not mean the
// other layers matched. Exit 2: nothing differs and something could not be
// compared — the deployment was unreachable, a layer could not be read (a
// refused key, a timeout), or the bundled versions are missing; the lines say
// which. It never writes anything.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// versions.md is a generated table: one row per source, the hash in a code
// span. Its shape is fixed by the generator that writes it.
const referencesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "references",
);
// The directory the skills are installed in: the page paths manifest.json
// records (`kipory-build/references/functions/…`) start there.
const skillsDir = resolve(referencesDir, "..", "..");
// Which bundle this is, before anything can fail: a run from the wrong copy
// reports a stale bundle as a stale deployment. VERSION is written at the
// bundle's root on every publish; an install that copied one skill directory
// has none.
const bundleVersion = (() => {
  try {
    return readFileSync(resolve(skillsDir, "..", "VERSION"), "utf8").trim();
  } catch {
    return "";
  }
})();
console.log(
  `skills bundle ${bundleVersion || "(no VERSION file beside skills/)"} — ${skillsDir}`,
);

if (typeof fetch !== "function") {
  console.error(
    `node ${process.version} has no global fetch — run this with Node 18 or newer`,
  );
  process.exit(2);
}

const baseUrl = process.env.KIPORY_BASE_URL?.replace(/\/+$/, "");
const apiKey = process.env.KIPORY_API_KEY;
if (!baseUrl) {
  console.error(
    "KIPORY_BASE_URL is not set — it is the base URL of the deployment, e.g. https://api.example.com",
  );
  process.exit(2);
}

const versionsFile = resolve(referencesDir, "versions.md");
// manifest.json is the per-item companion:
// { packs | functions | api | codes: { <name>: { hash, page? } } }.
const manifestFile = resolve(referencesDir, "manifest.json");
// One row per layer: where the deployment serves its version, and what to do
// when it differs from the bundled one.
const LAYERS = [
  {
    label: "packs",
    path: "/v1/capability-packs",
    withKey: false,
    pick: (json) => json?.version,
    items: (json) => {
      if (!Array.isArray(json?.packs)) return undefined;
      // A deployment older than the per-pack hash serves none: "cannot say
      // which", never "every pack differs".
      if (json.packs.some((p) => typeof p?.hash !== "string")) return undefined;
      return Object.fromEntries(json.packs.map((p) => [p.id, p.hash]));
    },
    advice:
      "read GET /v1/capability-packs/{id} live instead of references/packs/",
    itemAdvice:
      "read GET /v1/capability-packs/{id} live for the packs listed above; the other pages under references/packs/ are what the deployment serves",
  },
  {
    // The live list also carries the platform-only functions, which have no
    // page; `documented` checks the customer key set the pages cover.
    label: "functions",
    path: "/v1/functions",
    withKey: true,
    pick: (json) => json?.version,
    documented: (json) => {
      if (!Array.isArray(json?.functions)) return undefined;
      const keys = json.functions
        .filter((h) => h?.run?.platformOnly !== true)
        .map((h) => h.key);
      return { count: keys.length, hash: keySetHash(keys) };
    },
    items: (json) => {
      if (!Array.isArray(json?.functions) || !isHashMap(json?.hashes)) {
        return undefined;
      }
      return Object.fromEntries(
        json.functions
          .filter((h) => h?.run?.platformOnly !== true && h.key in json.hashes)
          .map((h) => [h.key, json.hashes[h.key]]),
      );
    },
    advice:
      "read GET /v1/functions/{key} live before authoring an action; treat references/functions/ as a sketch",
    itemAdvice:
      "read GET /v1/functions/{key} live for the functions listed above; the other function pages are what the deployment serves, and the index, references/functions/README.md, is stale for the listed ones",
    // The catalog version also covers the group notes and the platform-only
    // functions; neither has a per-item hash here, so which of the two moved
    // is not known.
    noItemAdvice:
      "no documented function differs — a group note or a platform-only function moved; every function page is what the deployment serves, and only the index, references/functions/README.md, may be stale",
  },
  {
    // A deployment older than the served surface version has no such field:
    // that is "cannot compare", never "identical".
    label: "api",
    path: "/v1/openapi.json",
    withKey: false,
    pick: (json) => json?.info?.["x-kipory-surface-version"],
    items: (json) => {
      const operations = json?.info?.["x-kipory-surface-operations"];
      return isHashMap(operations) ? operations : undefined;
    },
    advice:
      "read a route's fields on GET /v1/openapi.json before sending a body; treat references/api/ as a sketch",
    itemAdvice:
      "read the routes listed above on GET /v1/openapi.json before sending a body; every other route in references/api/ is as the deployment serves it",
  },
  {
    // One item, the refusal-code page. A deployment older than the served
    // version has no such field: that is "cannot compare", never "identical".
    label: "codes",
    path: "/v1/openapi.json",
    withKey: false,
    pick: (json) => json?.info?.["x-kipory-refusal-codes-version"],
    items: (json) => {
      const version = json?.info?.["x-kipory-refusal-codes-version"];
      return typeof version === "string"
        ? { "refusal-codes": version }
        : undefined;
    },
    advice:
      "references/refusal-codes.md is older or newer than the deployment's codes: a code you do not find there is undocumented, not retired — read the refusal's message and details for it",
    itemAdvice:
      "references/refusal-codes.md is older or newer than the deployment's codes: a code you do not find there is undocumented, not retired — read the refusal's message and details for it",
  },
];
function isHashMap(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}
const ROW = new RegExp(
  `^\\| (${LAYERS.map((l) => l.label).join("|")}) \\| \`([0-9a-f]+)\` \\|`,
);
const bundled = new Map(); // source → version
let versionsText = "";
try {
  versionsText = readFileSync(versionsFile, "utf8");
} catch {
  console.error(
    `${versionsFile} is missing — the reference layer was not installed with this skill, so nothing bundled can be compared`,
  );
}
for (const line of versionsText.split("\n")) {
  const m = ROW.exec(line);
  if (m) bundled.set(m[1], m[2]);
}
// The per-item hashes, when the bundle carries them. A bundle without the file
// (or with one this script cannot read) still compares versions; it only
// cannot say which items differ.
let manifest = {};
try {
  const parsed = JSON.parse(readFileSync(manifestFile, "utf8"));
  if (typeof parsed === "object" && parsed !== null) manifest = parsed;
} catch {
  // Reported per layer, on the line that would have listed the items.
}
const bundledItems = (label) => {
  const layer = manifest[label];
  if (typeof layer !== "object" || layer === null) return undefined;
  const entries = Object.entries(layer);
  if (entries.some(([, item]) => typeof item?.hash !== "string")) {
    return undefined;
  }
  return layer;
};
// Names by what happened to them, each list in code-point order. Relative to
// the bundle: `added` is on the deployment only, `removed` in the bundle only.
const diffItems = (bundledLayer, liveHashes) => {
  const names = (list) => list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    changed: names(
      Object.keys(bundledLayer).filter(
        (name) =>
          name in liveHashes && liveHashes[name] !== bundledLayer[name].hash,
      ),
    ),
    added: names(
      Object.keys(liveHashes).filter((name) => !(name in bundledLayer)),
    ),
    removed: names(
      Object.keys(bundledLayer).filter((name) => !(name in liveHashes)),
    ),
  };
};

// The customer function key set the function pages document, as the generator
// wrote it: sorted keys, one per line, sha256, first 12 hex.
const keySetHash = (keys) =>
  createHash("sha256")
    .update([...keys].sort().join("\n"))
    .digest("hex")
    .slice(0, 12);
const DOCUMENTED =
  /^Function pages: (\d+) customer functions, key set `([0-9a-f]+)`/m;
const documentedMatch = DOCUMENTED.exec(versionsText);
const DOCUMENT_FORMAT = /^Document format: `(\d+)`/m;
const bundledFormatMatch = DOCUMENT_FORMAT.exec(versionsText);
const bundledFormat = bundledFormatMatch
  ? Number(bundledFormatMatch[1])
  : undefined;
const bundledDocumented = documentedMatch
  ? { count: Number(documentedMatch[1]), hash: documentedMatch[2] }
  : undefined;

// Every failure — DNS, TLS, a refused connection, an HTML page from a wrong
// base URL — comes back as `{ error }`, never as a thrown rejection: exit 2 is
// the promise for "could not compare", and a stack trace is not an answer.
const TIMEOUT_MS = 30_000;
const get = async (path, withKey) => {
  const headers =
    withKey && apiKey ? { authorization: `Bearer ${apiKey}` } : {};
  try {
    // A host that accepts the connection and never answers would otherwise
    // hold each request for undici's five-minute header timeout.
    const res = await fetch(`${baseUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    try {
      return { json: await res.json() };
    } catch {
      return {
        error: `HTTP ${res.status} but not JSON — is ${baseUrl} the api host?`,
      };
    }
  } catch (err) {
    if (err?.name === "TimeoutError") {
      return { error: `no answer in ${TIMEOUT_MS / 1000} s` };
    }
    // A refused connection to a dual-stack host is an AggregateError whose
    // own `code` is empty; the first attempt's names it.
    const cause = err?.cause;
    return {
      error:
        cause?.code ??
        cause?.errors?.[0]?.code ??
        cause?.message ??
        err?.message ??
        String(err),
    };
  }
};

const health = await get("/health", false);
if (health.error) {
  console.error(
    `could not reach ${baseUrl}/health (${health.error}) — nothing below was checked`,
  );
  process.exit(2);
}
console.log(
  `deployment ${baseUrl} — build ${health.json?.sha ?? "(unstamped)"}`,
);

// What the platform tells each project this key reaches (`GET /v1/notices`):
// the flows a platform build turned red, a count of flows the project's own
// changes turned red, a count of the others (red at the platform's first
// measure, or after a secret or catalog moved), and the notices of changes
// that reach it that it has not read. Printed right after the deployment line; a project with none of these
// prints nothing. Each project the key reaches is read in turn (`GET /v1/grant`
// lists them). None of it changes the exit code.
const notices = await (async () => {
  if (!apiKey) return { why: "set KIPORY_API_KEY to read them" };
  const grant = await get("/v1/grant", true);
  if (grant.error) return { why: `GET /v1/grant: ${grant.error}` };
  const projects = Array.isArray(grant.json?.projects)
    ? grant.json.projects
    : [];
  // Read together: a key on an organization reaches several projects. One
  // project's failed read keeps the others' notices and says which failed.
  const reads = await Promise.all(
    projects.map(async (project) => ({
      project,
      res: await get(
        `/v1/notices?project=${encodeURIComponent(project.id)}`,
        true,
      ),
    })),
  );
  const told = [];
  const failed = [];
  let answered = 0;
  for (const { project, res } of reads) {
    if (res.error) {
      // A 404 is either a deployment without the route or a project gone
      // since the grant was read; only the first holds for every project.
      failed.push(`${project.slug}: ${res.error}`);
      continue;
    }
    const got = res.json?.items;
    if (!Array.isArray(got)) {
      failed.push(`${project.slug}: an answer with no items list`);
      continue;
    }
    answered += 1;
    const flows = Array.isArray(res.json?.flows) ? res.json.flows : [];
    told.push({
      project,
      byBuild: flows.filter((f) => f.cause === "build"),
      own: flows.filter((f) => f.cause === "change"),
      other: flows.filter(
        (f) => f.cause !== "build" && f.cause !== "change",
      ),
      unread: got.filter((n) => !n.read),
    });
  }
  if (answered === 0 && failed.length > 0)
    return {
      why: `GET /v1/notices: ${failed.join("; ")}${reads.every(({ res }) => res.error === "HTTP 404") ? " — this deployment predates notices" : ""}`,
    };
  return { told, failed };
})();
if (notices.told === undefined) {
  console.log(`notices: not read (${notices.why})`);
} else {
  const some = notices.told.filter(
    (t) =>
      t.byBuild.length + t.own.length + t.other.length + t.unread.length > 0,
  );
  const quiet = notices.told.length - some.length;
  const projects = (n) => `${n} project${n === 1 ? "" : "s"}`;
  if (some.length === 0) {
    console.log(
      `notices: nothing from the platform for ${projects(notices.told.length)}`,
    );
  } else {
    console.log(
      `notices: the platform tells ${some.length} of ${projects(notices.told.length)} — read each call below`,
    );
    for (const { project, byBuild, own, other, unread } of some) {
      console.log(`  ${project.slug}`);
      for (const f of byBuild) {
        const since = String(f.since ?? "").slice(0, 10);
        const build = typeof f.build === "string" ? ` ${f.build}` : "";
        console.log(
          `    ! flow ${f.flow?.key} turned red when platform build${build} rolled (${(f.codes ?? []).join(", ")}) — since ${since}`,
        );
        console.log(`        read GET ${f.healthPath}`);
      }
      if (own.length > 0)
        console.log(
          `    ${own.length} flow${own.length === 1 ? "" : "s"} red from the project's own changes (${own.map((f) => f.flow?.key).join(", ")}) — read each flow's health`,
        );
      if (other.length > 0)
        console.log(
          `    ${other.length} flow${other.length === 1 ? "" : "s"} red, not from a platform build (${other.map((f) => f.flow?.key).join(", ")}) — read each flow's health`,
        );
      for (const n of unread) {
        const when = String(n.effectiveAt ?? "").slice(0, 10);
        console.log(
          `    ! ${n.title} — ${n.state === "upcoming" ? `takes effect ${when}` : `in effect since ${when}`}`,
        );
        console.log(
          `        read GET /v1/notices/${n.id}?project=${encodeURIComponent(n.project)}`,
        );
      }
    }
    if (quiet > 0)
      console.log(`  ${projects(quiet)}: nothing from the platform`);
  }
}
if (notices.failed?.length > 0) {
  console.log(`  (not read for ${notices.failed.join("; ")})`);
}

// Whether these skills describe code the deployment does not run yet: its
// build's place among the merges SOURCE.json records. Unknown changes no exit
// code — a bundle published before SOURCE.json existed is not a fault.
const source = (() => {
  try {
    return JSON.parse(
      readFileSync(resolve(skillsDir, "..", "SOURCE.json"), "utf8"),
    );
  } catch {
    return undefined;
  }
})();
const build = typeof health.json?.sha === "string" ? health.json.sha : "";
const lag = (() => {
  const history = Array.isArray(source?.history) ? source.history : undefined;
  if (history === undefined)
    return {
      unknown:
        "this bundle has no SOURCE.json, so it cannot say which code it describes",
    };
  if (build === "") return { unknown: "the deployment reports no build" };
  // Seven hex digits name one commit in practice; fewer could match several.
  if (build.length < 7)
    return {
      unknown: `the deployment's build "${build}" is too short to place among the merges this bundle records`,
    };
  const at = history.findIndex(
    (h) =>
      typeof h?.sha === "string" &&
      (build.startsWith(h.sha) || h.sha.startsWith(build)),
  );
  if (at === -1) return { newer: true };
  return {
    ahead: history.slice(0, at).filter((h) => typeof h?.skills === "string"),
  };
})();
const sourceSha =
  typeof source?.source === "string" ? source.source.slice(0, 12) : "?";
const AHEAD_LISTED = 20;
const differs = [];
if (lag.newer) {
  const caveat =
    typeof source?.since === "string"
      ? `unless it was built before ${source.since}, the date of the oldest of the ${source.history.length} merges this bundle records`
      : `unless it is older than all ${source.history.length} merges this bundle records`;
  console.log(
    `  ${"skills".padEnd(9)} source ${sourceSha}   ✓ the deployment's build is newer than these skills' source, so it runs every skill change in them — ${caveat}`,
  );
} else if (lag.ahead === undefined) {
  console.log(
    `  ${"skills".padEnd(9)} source ${sourceSha}   not known — ${lag.unknown}`,
  );
} else if (lag.ahead.length === 0) {
  console.log(
    `  ${"skills".padEnd(9)} source ${sourceSha}   ✓ the deployment runs every skill change in this bundle`,
  );
} else {
  console.log(
    `  ${"skills".padEnd(9)} source ${sourceSha}   ✗ AHEAD of the deployment by ${lag.ahead.length} skill change(s) — merged after its build:`,
  );
  for (const h of lag.ahead.slice(0, AHEAD_LISTED))
    console.log(`${" ".repeat(12)}${h.sha}  ${h.skills}`);
  if (lag.ahead.length > AHEAD_LISTED)
    console.log(
      `${" ".repeat(12)}… and ${lag.ahead.length - AHEAD_LISTED} more`,
    );
  differs.push("skills");
}

// The reads are independent; `get` never rejects, and a shape this script
// cannot read is caught below, so neither does this. Two
// layers read the same document, so each path is fetched once. Started here,
// beside the document format's read, and awaited after its line is printed.
const fetched = new Map();
const getOnce = (path, withKey) => {
  const key = `${withKey} ${path}`;
  if (!fetched.has(key)) fetched.set(key, get(path, withKey));
  return fetched.get(key);
};
const layerReads = Promise.all(
  LAYERS.map(async (layer) => {
    if (layer.withKey && !apiKey) return { error: "set KIPORY_API_KEY" };
    const res = await getOnce(layer.path, layer.withKey);
    if (res.error) return { error: res.error };
    // A deployment that answers in a shape this script does not read (a null
    // row, a missing list) is a layer not compared, never a crash.
    try {
      return {
        live: layer.pick(res.json),
        documented: layer.documented?.(res.json),
        items: layer.items(res.json),
      };
    } catch (err) {
      return {
        error: `the answer is not the shape this script reads (${err?.message ?? String(err)})`,
      };
    }
  }),
);

const uncompared = [];

// The document format: one number each side, compared before the layers
// because a mismatch makes every document these skills write a refusal.
const format = await (async () => {
  if (bundledFormat === undefined)
    return {
      why: "versions.md in this bundle names no document format — it predates the line",
    };
  if (!apiKey) return { why: "set KIPORY_API_KEY to read it" };
  const res = await get("/v1/platform-status", true);
  if (res.error) return { why: `GET /v1/platform-status: ${res.error}` };
  const live = res.json?.documentFormat;
  if (typeof live?.version !== "number")
    return {
      why: "this deployment does not name the format it reads on GET /v1/platform-status",
    };
  return {
    live: live.version,
    description:
      typeof live.description === "string" ? live.description : undefined,
    rules: res.json?.rules,
  };
})();
if (format.live === undefined) {
  console.log(
    `  ${"document".padEnd(9)} bundled: ${bundledFormat ?? "?"}   live: (not readable — ${format.why})`,
  );
  uncompared.push("document");
} else if (format.live === bundledFormat) {
  console.log(
    `  ${"document".padEnd(9)} bundled: ${bundledFormat}   live: ${format.live}   ✓ these skills write the document format the deployment reads`,
  );
} else {
  console.log(
    `  ${"document".padEnd(9)} bundled: ${bundledFormat}   live: ${format.live}   ✗ DIFFERS — these skills write document format ${bundledFormat}; the deployment reads only ${format.live}${format.description ? ` (${format.description})` : ""}`,
  );
  differs.push("document");
}
// What this build changed in the save rules, from the same answer: one line,
// only when it added a code or raised one — news, not a difference, so it
// changes no exit code (specs/413-targeted-notices, FR-016).
{
  const codesOf = (list) =>
    Array.isArray(list)
      ? list.map((r) => r?.code).filter((c) => typeof c === "string")
      : [];
  const added = codesOf(format.rules?.added);
  const raised = codesOf(format.rules?.raised);
  if (added.length + raised.length > 0) {
    const named = [...added, ...raised];
    const shown = named.slice(0, 5).join(", ");
    const more = named.length > 5 ? `, and ${named.length - 5} more` : "";
    console.log(
      `  ${"rules".padEnd(9)} this build added ${added.length} code${added.length === 1 ? "" : "s"} and raised ${raised.length}: ${shown}${more} — GET /v1/platform-status lists each with what it means`,
    );
  }
}
// label → how many items were named under a layer that differs; absent when
// the items could not be compared.
const itemised = new Map();
// Whether any item line named a bundled page: an `added` item has none, and
// neither has a route no page documents.
let pagePrinted = false;
const INDENT = " ".repeat(12);
const reportItems = (label, result) => {
  const bundledLayer = bundledItems(label);
  if (bundledLayer === undefined || result.items === undefined) {
    const why =
      bundledLayer === undefined
        ? "references/manifest.json is missing from this bundle"
        : "this deployment serves no per-item hashes";
    console.log(`${INDENT}which items differ: not known — ${why}`);
    return;
  }
  const { changed, added, removed } = diffItems(bundledLayer, result.items);
  const page = (name) => {
    if (!bundledLayer[name]?.page) return "";
    pagePrinted = true;
    return `   ${bundledLayer[name].page}`;
  };
  for (const name of changed) {
    console.log(`${INDENT}changed   ${name}${page(name)}`);
  }
  for (const name of added) {
    console.log(`${INDENT}added     ${name}   (no bundled page)`);
  }
  for (const name of removed) {
    console.log(`${INDENT}removed   ${name}${page(name)}`);
  }
  const count = changed.length + added.length + removed.length;
  if (count === 0) {
    console.log(`${INDENT}no listed item differs`);
  }
  itemised.set(label, count);
};
const report = ({ label }, result, local) => {
  const live = result.live;
  /* ⛔ AN EQUAL CATALOG HASH IS "IDENTICAL" ONLY OVER THE SET THE PAGES
   * DOCUMENT. When the bundle records which functions it covers, the live
   * customer set must match it too, or the line says so. */
  const docs = result.documented;
  const setDiffers =
    bundledDocumented !== undefined &&
    docs !== undefined &&
    docs.hash !== bundledDocumented.hash;
  if (local === undefined || live === undefined) uncompared.push(label);
  if (local === undefined) {
    console.log(
      `  ${label.padEnd(9)} bundled: (not installed)   live: ${live ?? "?"}`,
    );
    return;
  }
  if (live === undefined) {
    /* Why it could not be read, as the request said: a refused key, a 5xx or a
     * timeout is not "this deployment serves no version", and reading it as
     * one would hide the fault behind a clean exit. */
    const why = result.error ?? "this deployment serves no version for it";
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: (not readable — ${why})`,
    );
  } else if (local === live && !setDiffers) {
    const over =
      docs !== undefined
        ? ` (${docs.count} customer functions documented; platform-only ones have no page)`
        : "";
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: ${live}   ✓ identical — the bundled copy is what the deployment serves${over}`,
    );
  } else {
    const set = setDiffers
      ? ` (documented ${bundledDocumented.count} customer functions, live lists ${docs.count})`
      : "";
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: ${live}   ✗ DIFFERS — prefer the deployment: it moved, or these files predate it${set}`,
    );
    differs.push(label);
    reportItems(label, result);
  }
};

const results = await layerReads;
LAYERS.forEach((layer, i) =>
  report(layer, results[i], bundled.get(layer.label)),
);

// A hash says THAT two sides differ, never which is newer: these files are
// published when the platform's main branch moves, and a deployment rolls
// later, so an older deployment is the ordinary case. Either way the
// deployment is what will answer your calls.
console.log("\nwhat to do:");
if (differs.includes("skills")) {
  console.log(
    `  ${"skills".padEnd(9)} the changes listed are in these skills and not yet on the deployment: where a refusal contradicts what a skill says about them, the deployment is right until it rolls them — or use the bundle whose source it runs (CHANGELOG.md names each version's source)`,
  );
}
if (differs.includes("document")) {
  const advice =
    format.live > bundledFormat
      ? `the deployment reads a newer document format than these skills write, with no overlap: a document in format ${bundledFormat} is refused with DOCUMENT_VERSION_UNSUPPORTED. Install the skills bundle that writes format ${format.live} (CHANGELOG.md names each version's source) before you export, plan or apply a document; the deployment's own export is already format ${format.live}`
      : `these skills write document format ${bundledFormat}, newer than the ${format.live} the deployment reads: until it rolls, every document they write is refused with DOCUMENT_VERSION_UNSUPPORTED — use the bundle whose format it reads, or wait for the roll`;
  console.log(`  ${"document".padEnd(9)} ${advice}`);
}
for (const layer of LAYERS) {
  if (!differs.includes(layer.label)) continue;
  // Only a full item-by-item comparison narrows the advice: without one, the
  // whole layer is suspect.
  const count = itemised.get(layer.label);
  const advice =
    count === undefined
      ? layer.advice
      : count > 0
        ? layer.itemAdvice
        : (layer.noItemAdvice ??
          `no listed item differs, so what moved is outside the per-item hashes — ${layer.advice}`);
  console.log(`  ${layer.label.padEnd(9)} ${advice}`);
}
for (const label of uncompared) {
  if (label === "document") {
    console.log(
      `  ${"document".padEnd(9)} not compared — before you plan or apply a document, read documentFormat.version on GET /v1/platform-status: a document whose \`kipory:\` line states another version is refused`,
    );
    continue;
  }
  const layer = LAYERS.find((l) => l.label === label);
  console.log(`  ${label.padEnd(9)} not compared — ${layer.advice}`);
}
if (pagePrinted) {
  console.log(
    `  ${"pages".padEnd(9)} the page paths above start at ${skillsDir}`,
  );
}
if (differs.length > 0 && uncompared.length > 0) {
  console.log(
    `  ${"note".padEnd(9)} exit 1 reports the difference only — ${uncompared.join(", ")} could not be compared and may differ too`,
  );
}
if (differs.length === 0 && uncompared.length === 0) {
  console.log("  nothing   every layer is current");
}
// A layer that could not be read is not a layer that matched: exit 0 would
// tell a caller branching on the code to trust pages nobody compared.
process.exit(differs.length > 0 ? 1 : uncompared.length > 0 ? 2 : 0);
