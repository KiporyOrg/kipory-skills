#!/usr/bin/env node
// Compare the reference layer bundled with these skills against the Kipory
// deployment you are building on, and say which side to trust.
//
// Every generated reference file carries a stamp with the content hash it was
// generated from. The deployment serves the same hashes live: `version` on
// `GET /v1/capability-packs` and on `GET /v1/handlers`. When they match, the
// bundled copy is exactly what the deployment would return; when they differ,
// the deployment moved (or these files are older than it) and the live one wins.
//
// Usage:
//   KIPORY_BASE_URL=https://api.example.com [KIPORY_API_KEY=…] node scripts/sync.mjs
//
// Zero dependencies. Prints one line per source and exits 0; exit 2 means the
// deployment could not be reached. It never writes anything.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.KIPORY_BASE_URL?.replace(/\/+$/, "");
const apiKey = process.env.KIPORY_API_KEY;
if (!baseUrl) {
  console.error(
    "KIPORY_BASE_URL is not set — it is the base URL of the deployment, e.g. https://api.example.com",
  );
  process.exit(2);
}

// The skills root: this file is <root>/kipory-connect/scripts/sync.mjs when
// every skill is installed, and the stamps of sibling skills are read from
// there. A partial install simply reports fewer rows.
const skillsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const abs = join(dir, e);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (abs.endsWith(".md")) out.push(abs);
  }
  return out;
};

const STAMP =
  /^<!-- generated: kipory-skills references · source: (.+?) · version: ([0-9a-f]+) /;
const bundled = new Map(); // source label → Set of versions seen
for (const file of walk(skillsRoot)) {
  const first = readFileSync(file, "utf8").split("\n", 1)[0] ?? "";
  const m = STAMP.exec(first);
  if (!m) continue;
  const key = /capability packs/.test(m[1])
    ? "packs"
    : /handler catalog/.test(m[1])
      ? "handlers"
      : "api";
  bundled.set(key, (bundled.get(key) ?? new Set()).add(m[2]));
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
  if (!local || local.size === 0) {
    console.log(
      `  ${label.padEnd(9)} bundled: (not installed)   live: ${live ?? "?"}`,
    );
    return;
  }
  const versions = [...local];
  const bundledText = versions.join(",");
  if (live === undefined) {
    console.log(
      `  ${label.padEnd(9)} bundled: ${bundledText}   live: (not readable — ${label === "handlers" ? "set KIPORY_API_KEY" : "no version served"})`,
    );
  } else if (versions.length === 1 && versions[0] === live) {
    console.log(
      `  ${label.padEnd(9)} bundled: ${bundledText}   live: ${live}   ✓ identical — the bundled copy is what the deployment serves`,
    );
  } else {
    console.log(
      `  ${label.padEnd(9)} bundled: ${bundledText}   live: ${live}   ✗ DIFFERS — prefer the deployment: it moved, or these files predate it`,
    );
  }
};

const packs = await get("/v1/capability-packs", false);
report("packs", packs.json?.version, bundled.get("packs"));

const handlers = apiKey ? await get("/v1/handlers", true) : { error: "no key" };
report("handlers", handlers.json?.version, bundled.get("handlers"));

console.log(
  `  ${"api".padEnd(9)} bundled: ${[...(bundled.get("api") ?? [])].join(",") || "(not installed)"}   live: the OpenAPI document carries no version — GET /v1/openapi.json is the authority for shapes`,
);
