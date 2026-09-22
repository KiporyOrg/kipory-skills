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

A project created by an API call names the template it wants, or none. A new account's first
project always starts from the platform's starter template — applied inside the registration, so
a starter the platform refuses leaves nobody seated in an empty project.

## See what is shipped

`GET /v1/templates` lists every template this deployment ships — each with its slug, its name, a
description, what it requires, and `starter`, true on exactly the one a first project is made
from — with a `version` that is a content hash: it moves when, and only when, a template
changed. `GET /v1/templates/{slug}` adds `document`, the project document the template applies.
Both are public, like these packs: they are documentation, byte-identical for every caller. An
unknown slug answers `404` and names the slugs that exist — any string is an unknown slug, one the
slug grammar would refuse included; there is no `422` on this read.

Read the document before you choose. It is exactly what the new project will hold — there is no
hidden part, and no parameters: a template is applied as written. `Accept: application/yaml`
answers YAML.

## Create a project from one

`POST /v1/projects` takes an optional `template`: a slug. The template's configuration is applied
in the SAME transaction that creates the project, so creation is all or nothing. If the platform
refuses any row, the answer is `422` with `details.reason: "TEMPLATE_APPLY_FAILED"` and the plan
as `plan` beside it — and no project exists afterwards, no node, and the address is still free.
That should never happen with a shipped template (each one is created and exported back in the
platform's own CI), so treat it as a platform defect to report, not something to retry around.
An unknown slug is refused before anything is made (`details.reason: "TEMPLATE_UNKNOWN"`).
The same call takes a `document` instead — a whole project document of your own, applied the same
way; the project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) says how a refusal reads there.

Three things to know about the result:

- The create call's `name` wins. The `name` and `description` in a template's own `project`
  section are ignored; the rest of its `project` section (config namespaces, enabled routes) applies.
- The answer carries `requires` — the secrets the project will not work without. A template never
  holds a secret value, so storing those is your next call.
- In the project's history the whole template is ONE entry, a document apply, at the project's
  first version. Nothing records which template it came from: the project is yours from the first
  moment, and the link is deliberately not kept.

## A template on a project that already exists

There is no "apply a template" call, and none is needed: a template's `document` is an ordinary
project document, with the document's own rules — a facet that omits `resolver` takes the
platform's default binding on the deployment it lands on, and one that states `resolver: null`
lands unbound everywhere. Read it with `GET /v1/templates/{slug}`, plan it against your project to see
what it would add or change, and apply it like any other document. Rows your project already has
under the same names are UPDATED to the template's, which is rarely what you want for a whole
template — plan first, and send the sections you mean.

## When not to use one

A template is a starting point for a project that does not exist yet. It is not a way to keep
projects in step: two projects created from one template share nothing afterwards, and a change
to the template reaches neither. To move configuration between projects deliberately, export the
one and apply to the other.

## Related

- The project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) — the format a template is written in.
- Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`) — turn zero, what one create call does.
