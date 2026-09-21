#!/usr/bin/env node
// Compare the reference layer bundled with these skills against the Kipory
// deployment you are building on, and say which side to trust.
//
// The content hashes every generated reference page was built from are recorded
// once, in `references/versions.md` beside this script. The deployment serves
// two of them live: `version` on `GET /v1/capability-packs` and on
// `GET /v1/handlers`. When they match, the bundled copy is exactly what the
// deployment would return; when they differ, the deployment moved (or these
// files are older than it) and the live one wins.
//
// Usage:
//   KIPORY_BASE_URL=https://api.example.com [KIPORY_API_KEY=…] node scripts/sync.mjs
//
// Zero dependencies. Prints one line per source and exits 0; exit 2 means the
// deployment could not be reached. It never writes anything.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
const ROW = /^\| (packs|handlers|api) \| `([0-9a-f]+)` \|/;
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

const get = async (path, withKey) => {
  const headers =
    withKey && apiKey ? { authorization: `Bearer ${apiKey}` } : {};
  const res = await fetch(`${baseUrl}${path}`, { headers });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { json: await res.json() };
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

const report = (label, live, local) => {
  if (local === undefined) {
    console.log(
      `  ${label.padEnd(9)} bundled: (not installed)   live: ${live ?? "?"}`,
    );
    return;
  }
  if (live === undefined) {
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: (not readable — ${label === "handlers" ? "set KIPORY_API_KEY" : "no version served"})`,
    );
  } else if (local === live) {
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: ${live}   ✓ identical — the bundled copy is what the deployment serves`,
    );
  } else {
    console.log(
      `  ${label.padEnd(9)} bundled: ${local}   live: ${live}   ✗ DIFFERS — prefer the deployment: it moved, or these files predate it`,
    );
  }
};

const packs = await get("/v1/capability-packs", false);
report("packs", packs.json?.version, bundled.get("packs"));

const handlers = apiKey ? await get("/v1/handlers", true) : { error: "no key" };
report("handlers", handlers.json?.version, bundled.get("handlers"));

console.log(
  `  ${"api".padEnd(9)} bundled: ${bundled.get("api") ?? "(not installed)"}   live: the OpenAPI document carries no version — GET /v1/openapi.json is the authority for shapes`,
);
