#!/usr/bin/env node
// Compare the reference layer bundled with these skills against the Kipory
// deployment you are building on, and say which side to trust.
//
// The content hashes every generated reference page was built from are recorded
// once, in `references/versions.md` beside this script. The deployment serves
// all three live: `version` on `GET /v1/capability-packs` and on
// `GET /v1/handlers`, and `info["x-kipory-surface-version"]` on
// `GET /v1/openapi.json` for the API pages. When they match, the bundled copy is exactly what the
// deployment would return; when they differ, the deployment moved (or these
// files are older than it) and the live one wins.
//
// A layer that differs is then compared item by item. `references/manifest.json`
// records one hash per pack, per handler and per API route, and the same three
// reads serve the same hashes: `hash` on each pack in the index, `hashes` on
// the handler catalog, `info["x-kipory-surface-operations"]` on the OpenAPI
// document. The script prints the names that differ, so only those pages need
// a live read — the rest of the layer is what the deployment serves.
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
// lines say which layer to read live instead; a layer that could not be
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
// records (`kipory-build/references/handlers/…`) start there.
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
// { packs | handlers | api: { <name>: { hash, page? } } }.
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
    // The live list also carries the platform-only handlers, which have no
    // page; `documented` checks the customer key set the pages cover.
    label: "handlers",
    path: "/v1/handlers",
    withKey: true,
    pick: (json) => json?.version,
    documented: (json) => {
      if (!Array.isArray(json?.handlers)) return undefined;
      const keys = json.handlers
        .filter((h) => h?.run?.platformOnly !== true)
        .map((h) => h.key);
      return { count: keys.length, hash: keySetHash(keys) };
    },
    items: (json) => {
      if (!Array.isArray(json?.handlers) || !isHashMap(json?.hashes)) {
        return undefined;
      }
      return Object.fromEntries(
        json.handlers
          .filter((h) => h?.run?.platformOnly !== true && h.key in json.hashes)
          .map((h) => [h.key, json.hashes[h.key]]),
      );
    },
    advice:
      "read GET /v1/handlers/{key} live before authoring a step; treat references/handlers/ as a sketch",
    itemAdvice:
      "read GET /v1/handlers/{key} live for the handlers listed above; the other handler pages are what the deployment serves, and the index, references/handlers/README.md, is stale for the listed ones",
    // The catalog version also covers the group notes and the platform-only
    // handlers; neither has a per-item hash here, so which of the two moved
    // is not known.
    noItemAdvice:
      "no documented handler differs — a group note or a platform-only handler moved; every handler page is what the deployment serves, and only the index, references/handlers/README.md, may be stale",
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

// The customer handler key set the handler pages document, as the generator
// wrote it: sorted keys, one per line, sha256, first 12 hex.
const keySetHash = (keys) =>
  createHash("sha256")
    .update([...keys].sort().join("\n"))
    .digest("hex")
    .slice(0, 12);
const DOCUMENTED =
  /^Handler pages: (\d+) customer handlers, key set `([0-9a-f]+)`/m;
const documentedMatch = DOCUMENTED.exec(versionsText);
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

const differs = [];
const uncompared = [];
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
   * DOCUMENT. When the bundle records which handlers it covers, the live
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
        ? ` (${docs.count} customer handlers documented; platform-only ones have no page)`
        : "";
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: ${live}   ✓ identical — the bundled copy is what the deployment serves${over}`,
    );
  } else {
    const set = setDiffers
      ? ` (documented ${bundledDocumented.count} customer handlers, live lists ${docs.count})`
      : "";
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: ${live}   ✗ DIFFERS — prefer the deployment: it moved, or these files predate it${set}`,
    );
    differs.push(label);
    reportItems(label, result);
  }
};

// The three reads are independent; `get` never rejects, so neither does this.
const results = await Promise.all(
  LAYERS.map(async (layer) => {
    if (layer.withKey && !apiKey) return { error: "set KIPORY_API_KEY" };
    const res = await get(layer.path, layer.withKey);
    return res.error
      ? { error: res.error }
      : {
          live: layer.pick(res.json),
          documented: layer.documented?.(res.json),
          items: layer.items(res.json),
        };
  }),
);
LAYERS.forEach((layer, i) =>
  report(layer, results[i], bundled.get(layer.label)),
);

// A hash says THAT two sides differ, never which is newer: these files are
// published when the platform's main branch moves, and a deployment rolls
// later, so an older deployment is the ordinary case. Either way the
// deployment is what will answer your calls.
console.log("\nwhat to do:");
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
