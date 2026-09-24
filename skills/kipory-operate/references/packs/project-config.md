<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Project config

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

Where a project's runtime tunables live — thresholds, windows, weights, cadences, toggles. One row
per project and namespace, and each namespace is **typed** by a shape you author, whose fields
carry their own defaults.

The load-bearing idea: **what gets stored is only the overrides.** The effective config — your
defaults with the overrides laid over them — is computed when it is read, never written down.
Change a default in the shape and every project sees it immediately, except where something
explicitly overrode it. Clearing an override is deleting a key, not writing the default back.

That inversion is what makes config safe to edit. If effective values were stored, every default
change would need a migration across every project that had ever read it.

## When you need it — and when you don't

Reach for it when a flow's behaviour has a number in it that someone will want to change without
rebuilding the flow.

Do **not** use it for:

- **Content.** Records own that. The per-namespace size cap exists precisely to stop config
  quietly becoming storage.
- **Secrets.** Config values surface in flow runs and in operator reads. Anything that must not
  be seen belongs in the secret vault.
- **Per-user state.** That belongs to the user profile or to user-scoped records.

## The sequence

```
GET    /v1/project-config?project=…   list — every row carries overrides, defaults and effective values
POST   /v1/project-config             upsert by (project, namespace)
DELETE /v1/project-config/{id}        remove the row
```

The write is an **upsert on the natural key**, which makes it one idempotent "set the ranking
config" operation rather than a create-or-update dance. Creating requires naming the shape it
binds; updating requires the `version` you last read.

⛔ **`data` REPLACES the whole stored override map — it does not merge.** Sending only the key you
meant to change silently deletes every other override in that namespace, and the response looks
exactly like a success because it is one. **Read the row first, merge locally, send the complete
map.** The serialized map is capped at 32 KB, because it is seeded into every flow run: anything
larger is content and belongs in a record.

## How a flow reads it

Through the project provider attribute — `projectInfo.config.<namespace>.<field>`. No skill, no
handler call; it is resolved once per run and cached for that run.

The map a flow sees is the **effective** one, so a flow picks up a field's default the moment the
shape declares it. Each row also carries **`defaults`** — the half of `effective` your overrides did
not supply, lifted by the same rule. To tell a field sitting at its default from one with no default
at all (absent from what the flow reads), read `defaults`; do not re-read the schema's `default`
keywords, which include ones the lift never takes (a nested one, or one behind a `$ref`).

Three corners worth holding:

- **A project with no config reads as empty**, and wiring that reaches into a missing namespace
  degrades to undefined rather than failing. Fail-open, consistent with the rest of the project
  attribute.
- **Edits are not live mid-run.** A running flow keeps the snapshot it started with; the next run
  sees the change. This is what makes a run reproducible, but it also means "I changed it and
  nothing happened" is expected for anything already in flight.
- **A namespace whose shape was deleted degrades to overrides only** — reads keep working with no
  defaults behind them, and the _next write_ is what tells you, by refusing and naming the
  missing shape. The read will not warn you.

## What the platform refuses

- **Validation runs against the effective object, not your patch.** A write whose missing required
  fields are covered by schema defaults is accepted. What fails is a required field with neither a
  default nor an override — and the refusal names it. ⚠️ "Partial" here means partial against the
  **schema**, never partial against the **stored row**: see the replacement warning above.
- **Updating requires the version you last read**, and a stale one is refused. Re-read and
  reconcile.
- **The schema entry can refuse on the namespace's behalf** — 422
  `SCHEMA_ENTRY_UNSAFE_FOR_PROJECT_CONFIG` on a `PATCH /v1/schema-entries/{id}`. Removing a declared
  field a namespace stores an override for strands that override, and so does closing the entry's
  root (`additionalProperties: false`) while a namespace bound to that very entry stores a
  top-level key the entry does not declare: the namespace's next write would be refused for a value it already holds. ⚠️ The
  closed-root refusal is **flat** — it judges the entry as it would be stored, so an entry already
  in that state takes no save at all, not even a rename, until the override is removed here, the
  key is declared there, or the root is opened again. The message names the namespaces and the
  keys, and the entry's `validateOnly` dry run says the same.

## What will bite you

- **Overriding is per top-level field, and replaces it wholesale.** There is no deep merge —
  deliberately, because a merge makes "remove this nested key" impossible to express. Override a
  nested object and you are responsible for all of its contents.
- **Pin config-sensitive behaviour with a stored test.** If a flow's correctness depends on a
  threshold, a config edit that breaks it should fail a replayed test case rather than being
  discovered in production behaviour. Config is the easiest thing in a project to change and the
  hardest to notice having changed.

## Related

- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — authoring the shape a
  namespace binds.
- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — where the wiring that reads config lives.
- Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`) — pinning behaviour that a tunable can move.
