<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Project templates

> **Source of truth for facts:** the list of shipped templates → live `GET /v1/templates`; endpoint
> paths & request shapes → live `GET /v1/openapi.json`. This pack carries judgment about when a
> template is the right starting point and what it does to the project it seeds.

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
`kipory: 2`, and every rule of that pack holds for it: what a row may state, how each reference is
spelled, and what is refused. A template that breaks one is refused like any other document.

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
  section are ignored; the rest of its `project` section (config namespaces, enabled routes) applies.
- A schedule, trigger or source lands enabled unless the template states `enabled: false` on it —
  the same field the document carries, so an exported project's paused rows stay paused.
- The answer carries `requires` — the secrets the project will not work without. A template never
  holds a secret value, so storing those is your next call.
- In the project's history the whole template is ONE entry, a document apply, at the project's
  first version. Nothing records which template it came from: the project is yours from the first
  moment, and the link is deliberately not kept.

## A template on a project that already exists

There is no "apply a template" call, and none is needed: a template's `document` is an ordinary
project document, with the document's own rules. Two of them decide what lands:

- A facet that omits `resolver` takes the platform's default binding on the deployment it lands
  on; one that states `resolver: null` lands unbound everywhere.
- A relation kind that states `properties: null` lands with no properties type; one that omits the
  field keeps what the project already holds.

Read it with `GET /v1/templates/{slug}`, plan it against your project to see what it would add or
change, and apply it like any other document. Rows your project already has under the same keys
are UPDATED to the template's, which is rarely what you want for a whole template — plan first,
and send the sections you mean.

## When not to use one

A template is a starting point for a project that does not exist yet. It is not a way to keep
projects in step: two projects created from one template share nothing afterwards, and a change
to the template reaches neither. To move configuration between projects deliberately, export the
one and apply to the other.

## Related

- The project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) — the format a template is written in.
- Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`) — turn zero, what one create call does.
