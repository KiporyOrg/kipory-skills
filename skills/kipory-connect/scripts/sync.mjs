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
// Usage (from any directory — it finds versions.md beside itself):
//   KIPORY_BASE_URL=https://api.example.com [KIPORY_API_KEY=…] node <this skill>/scripts/sync.mjs
//
// Zero dependencies; Node 18 or newer (global fetch). Prints one line per
// source, then what to do. Exit 0: every layer was compared and nothing
// bundled differs from the deployment. Exit 1: something differs — the lines
// say which layer to read live instead. Exit 2: something could not be
// compared — the deployment was unreachable, a layer could not be read (a
// refused key, a timeout), or the bundled versions are missing; the lines say
// which. It never writes anything.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

// versions.md is a generated table: one row per source, the hash in a code
// span. Its shape is the generator's contract with this script
// (scripts/generate-customer-skills-references.ts, `renderVersionsPage`).
const versionsFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "references",
  "versions.md",
);
// One row per layer: where the deployment serves its version, and what to do
// when it differs from the bundled one.
const LAYERS = [
  {
    label: "packs",
    path: "/v1/capability-packs",
    withKey: false,
    pick: (json) => json?.version,
    advice:
      "read GET /v1/capability-packs/{id} live instead of references/packs/",
  },
  {
    label: "handlers",
    path: "/v1/handlers",
    withKey: true,
    pick: (json) => json?.version,
    advice:
      "read GET /v1/handlers/{key} live before authoring a step; treat references/handlers/ as a sketch",
  },
  {
    // A deployment older than the served surface version has no such field:
    // that is "cannot compare", never "identical".
    label: "api",
    path: "/v1/openapi.json",
    withKey: false,
    pick: (json) => json?.info?.["x-kipory-surface-version"],
    advice:
      "read a route's fields on GET /v1/openapi.json before sending a body; treat references/api/ as a sketch",
  },
];
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
const report = ({ label }, result, local) => {
  const live = result.live;
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
  } else if (local === live) {
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: ${live}   ✓ identical — the bundled copy is what the deployment serves`,
    );
  } else {
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: ${live}   ✗ DIFFERS — prefer the deployment: it moved, or these files predate it`,
    );
    differs.push(label);
  }
};

// The three reads are independent; `get` never rejects, so neither does this.
const results = await Promise.all(
  LAYERS.map(async (layer) => {
    if (layer.withKey && !apiKey) return { error: "set KIPORY_API_KEY" };
    const res = await get(layer.path, layer.withKey);
    return res.error ? { error: res.error } : { live: layer.pick(res.json) };
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
  if (differs.includes(layer.label)) {
    console.log(`  ${layer.label.padEnd(9)} ${layer.advice}`);
  }
}
for (const label of uncompared) {
  const layer = LAYERS.find((l) => l.label === label);
  console.log(`  ${label.padEnd(9)} not compared — ${layer.advice}`);
}
if (differs.length === 0 && uncompared.length === 0) {
  console.log("  nothing   every layer is current");
}
// A layer that could not be read is not a layer that matched: exit 0 would
// tell a caller branching on the code to trust pages nobody compared.
process.exit(differs.length > 0 ? 1 : uncompared.length > 0 ? 2 : 0);
