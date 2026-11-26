<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Project templates

> **Source of truth for facts:** the list of shipped templates → live `GET /v1/templates`; endpoint
> paths & request shapes → live `GET /v1/openapi.json`. This pack carries judgment about when a
> template is the right starting point and what it does to the project it seeds.
>
> **Format 12 names:** a template's files are project documents, so they spell the names format 12 set and format 13 keeps: a table's `owner`, a vocabulary's `parent`, a flow value's `type` and `list`, a schedule's `cron` and a step's `table`.

## What it is

A template is a project document with a header — a name, a description, and the secrets a
project built from it will need — shipped with the platform and applied inside the transaction
that creates a project. A project created from a template holds a COPY of its rows and no link back:
editing the project never touches the template, and a later platform release never rewrites a
project a template once seeded.

A project created by an API call names the template it wants, or none — a new account's first
project included. There, the template is applied inside the registration, so one the platform
refuses leaves nobody seated in a half-built project.

## See what is shipped

`GET /v1/templates` lists every template this deployment ships — each with its slug, its name, a
description, what it requires, and `starter`, true on exactly the one to suggest to somebody
new — with a `version` that is a content hash: it moves when, and only when, a template
changed. `GET /v1/templates/{slug}` adds `document`, the project document the template applies.
Both are public, like these packs: they are documentation, byte-identical for every caller. An
unknown slug answers `404` and names the slugs that exist — any string is an unknown slug, one the
slug grammar would refuse included; there is no `422` on this read.

Read the document before you choose. It is exactly what the new project will hold — there is no
hidden part, and no parameters: a template is applied as written. `Accept: application/yaml`
answers YAML. It is an ordinary project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) in the current format,
`kipory: 13`, and every rule of that pack holds for it: what a row may state, how each reference is
spelled, and what is refused.

**What format 13 moved.** One thing: a flow states its one-at-a-time rule
(`flows.<flow>.serialize`, its key in the flow's input names), and an endpoint no longer does. A
template may also offer flows as tools to AI apps in a `tools` section; the new project then
serves them at its own `/mcp` address from its first moment
(project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`)).

**What format 12 moved in a template's document.** A file written as `kipory: 11` reads differently:

- A table's `queries` and `selections` sit under that table, as maps by key; a flow it ships reads
  one with `record.query` and `query: <table>.<key>`.
- `events` holds the event types directly, keyed `<category>/<key>`, with no `types` level.
- `endpoints`, `triggers` and `schedules` are top-level sections; `surfaces` is gone, and so are
  sources: a trigger holds what it watches.
- Embeddings live in the `project` section, under `ai.embeddings` (`{ model, matchExactWords,
chunking }`) with `ai.defaultEmbedding` beside them; `vectors` is gone. A table names one with
  `uses.search.embedding`, or none for `default`, which a new project gets made on first use.
  `chunking`, on an embedding or a table's search, is `whole` or `{ tokens, overlap }`.
- A relation a field produces says `from: <table>.<field>` and `to: <table>`.

A `delete: true` row, a config namespace's too, finds nothing to remove in a new
project. A template that breaks one is refused like any other document. A table there names its
type by key with `type` — the type stated under `types` — never inline. Check
each `evals` suite's `applyWrites` before you run it: `true` means a run saves the records the
flow writes into your new project. Check each endpoint's `auth` too: `none` would
make it public, callable with no credential, and a public endpoint is unlimited until
`project.credits.publicEndpointsLimit` sets a cap. No shipped template declares one, so every
endpoint a template gives you needs a key or a session until you decide otherwise. An endpoint there is written as on
`POST /v1/api-endpoints`, `responseType`, `answer` and a `from: "patch"` input included: read `responseType`
to know an endpoint answers CSV or other text rather than JSON, and `answer` to know it answers in one
of the template's selections, named `<table>.<key>` (the table key may start with a capital). A
template file may leave out a
parameter's `type` and `required`, a path parameter's entry and an endpoint's `inputs`, as any
project document may; the project it creates stores them whole. A template's people tables (`owner:
user`) are read as any document's are: a run that acts for nobody reaches every person's records,
a key may be `{ kind: key, scope: project }`, and a `flow.invoke` may say `as: project`.

## Create a project from one

`POST /v1/projects` takes an optional `template`: a slug. The template's configuration is applied
in the SAME transaction that creates the project, so creation is all or nothing. If the platform
refuses any row, the answer is `422` with `details.reason: "TEMPLATE_APPLY_FAILED"` and the plan
as `plan` beside it — and no project exists afterwards, no node, and the address is still free.
That should never happen with a shipped template (each one is created and exported back in the
platform's own CI), so treat it as a platform defect to report, not something to retry around.
An unknown slug is refused before anything is made (`details.reason: "TEMPLATE_UNKNOWN"`).
The same call takes a `document` instead — a whole project document of your own, applied the same
way; the project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) says how a refusal reads there. `template` and
`document` together are refused before anything is made.

Four things to know about the result:

- The create call's `name` wins. The `name` and `description` in a template's own `project`
  section are ignored; the rest of its `project` section (config namespaces, built-in routes it
  switches off, its `ai`, `identity`, `credits` and `mail`) applies.
- A schedule or trigger lands enabled unless the template states `enabled: off` on it —
  the same field the document carries, so an exported project's switched-off rows stay off. A
  row carries `failurePolicy` across too; a `paused` marker the platform put on the source row
  does not travel — the new project's rows start unpaused.
- A template renames nothing. `renameFields`, `renameInputs`, `renameOutputs`, `keepExpressions` and `rewriteExpressions` state a
  rename of words a project already holds (the project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`)), and a new project holds
  none.
- Nothing a template creates is a contract change: a new project has no endpoint or table before
  it, so the create judges no break and asks nobody to accept one. No shipped template states
  `acceptBreaks`.
- A template's `ui` section is applied as written: `ui: {}` gives the new project the pages
  derived from its endpoints, with their header buttons and dialogs: a list page is a card with
  search and a count, a record page has a header, its related lists and a Details column.
- The answer carries `requires` — the secrets the project will not work without. A template never
  holds a secret value, so storing those is your next call.
- In the project's history the whole template is ONE entry, a document apply, at the project's
  first version. Nothing records which template it came from: the project is yours from the first
  moment, and the link is deliberately not kept.

A template is written in the current document format (`kipory: 13`), so its flows are stated as
`steps` in written order, and they are judged as a document's are: a step the save refuses — a read
it cannot prove, a condition whose list key is misspelled — refuses the project's creation, and
nothing is made. A template's flows use today's catalog: a list read is `record.query` (with its
status, owner and include settings, and `order: { by: updated }`, where it needs them), and a refusal
is a `fail` step with `refuse: true`.

## A template on a project that already exists

There is no "apply a template" call, and none is needed: a template's `document` is an ordinary
project document, with the document's own rules. Two of them decide what lands:

- A vocabulary that omits `resolver` takes the platform's default binding on the deployment it lands
  on; one that states `resolver: null` lands unbound everywhere.
- A vocabulary that omits `termAttributes` declares none, and a term that states no labels in other
  languages or attribute values holds none: a stated element is whole.
- A relation that omits `properties`, or states `null`, lands with no properties type — over a
  relation the project already holds too, since a stated element is whole.

Read it with `GET /v1/templates/{slug}`, plan it against your project to see what it would add or
change, and apply it like any other document. A template carries no `basedOn` (a read names one
project, and a template is no project's): plan it with the version of your own read of the
project (`?basedOn=<version>`), then apply the kept plan by `{planId, note}`. Rows your project already has under the same keys
are UPDATED to the template's, which is rarely what you want for a whole template — plan first,
and send the sections you mean. Over a project that already serves callers it is judged as any
document is: an update that breaks one of your endpoints or tables is refused until an admin
names it in the document's top-level `acceptBreaks`, and the plan lists it in `contractChanges`
first.

A template's flows carry the same fields a document's do — each step's `with` and its run settings
(`onOversize` among them) included, a flow's `caller: user` (it runs only for a signed-in
user) and an input's `internal: true` (no endpoint binds it): a project created from the template gets them as written. Its tables
likewise carry `computed` (a rollup's `ifNone` included), `reprocessOn` and `sharing` as a document's do —
`renameComputed` too, though a
template rarely renames — and a plan of one lists the `recompute` consequence for a table whose
stored records get computed values. A table marks its `search`
fields with no `role`, and the template names no collection and no slot.

## When not to use one

A template is a starting point for a project that does not exist yet. It is not a way to keep
projects in sync: two projects created from one template share nothing afterwards, and a change
to the template reaches neither. To move configuration between projects deliberately, export the
one and apply to the other.

## Related

- The project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) — the format a template is written in.
- Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`) — turn zero, what one create call does.
