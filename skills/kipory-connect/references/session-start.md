# Session start, in depth

`SKILL.md` has the short sequence. This page has the long parts of it: what `scripts/sync.mjs` reports, reading only what you will change, confirming facts live, a model account that runs out, the descriptions and metadata reads, converting an older project document, a project whose flows are empty, and filing a report.

## What `scripts/sync.mjs` reports

Run `node <this skill's directory>/scripts/sync.mjs` now, with `KIPORY_BASE_URL` (and `KIPORY_API_KEY`, to compare functions and the document format) in the environment. It compares four layers bundled with these skills — the packs, the function catalog, the API pages and the refusal-code page — against what this deployment serves, and writes nothing.

Right after the line naming the deployment it prints a `notices` line: what the platform tells each project your key reaches (`GET /v1/grant`, then `GET /v1/notices?project=` for each), and only for a project it tells something. That is a flow a platform build turned red, with its codes; a count of flows your own changes turned red; and a notice of a change that reaches your project, which you have not read yet. **Read each one with the call printed under it** — a flow's health names every error and how to fix it; a notice says what changed and carries a report on which of your project's fields or routes it touches. That first read of a notice is also how Kipory knows your project heard. A change that breaks nothing you stored is not a notice: when this build added or raised a save rule, one `rules` line names the codes. While a change is still ahead, a key's responses on a route its notice names carry `Deprecation`, `Sunset` and `Link` headers; a removed route answers 410 `ROUTE_REMOVED` for 90 days. The routes are on `references/api/notices.md`.

Its `document` line compares the project document format these skills write with the one format the deployment reads, `documentFormat.version` on `GET /v1/platform-status` (it needs `KIPORY_API_KEY`). A new format replaces the old one with no overlap, so ✗ on that line means every document these skills write is refused with `DOCUMENT_VERSION_UNSUPPORTED` until the two match; the line says which side is newer and what to install.

Its first line names the bundle that ran: `skills bundle <version> — <directory>`. Several versions of these skills can sit side by side on one machine (a plugin cache keeps old ones), and each copy of the script compares its own pages, so a run from an older copy reports every layer as differing. If the directory on that line is not the one this skill was loaded from, run the script from this skill's directory.

Then a `skills` line says whether these skills are ahead of the deployment. They are published when a change to them merges into the platform's code, and a deployment rolls later, so a skill can describe behaviour your deployment does not run yet. The line names each skill change merged after the deployment's build, and reads ✓ when the deployment runs them all — including a build newer than these skills, which is the usual case. Until the deployment rolls the changes it names, where a refusal contradicts what a skill says about one of them, the deployment is right. `not known` on that line changes no exit code.

| Exit | Means                                                                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | every layer was compared and is current                                                                                                                                                             |
| `1`  | at least one layer differs, or these skills carry changes the deployment does not run yet. It does not mean the others matched: a layer marked `not compared` can sit beside it, so read every line |
| `2`  | nothing differs, and something could not be compared — the deployment was unreachable, or a layer could not be read; the line says which                                                            |

Without `KIPORY_API_KEY` the function catalog and the document format cannot be read, so the best outcome is exit 2. Under a layer that differs it prints one line per pack, function or route:

- `changed` — both sides have it, with different content;
- `added` — the deployment has it, these files do not;
- `removed` — these files have it, the deployment does not.

Each `changed` or `removed` line names the bundled page that documents the item, when it has one, as a path from the directory that holds these skills (`kipory-build/references/functions/…`); an `added` item has no page. Read those items live; the rest of the layer is what the deployment serves. A deployment too old to serve per-item hashes gets `which items differ: not known`, and then the whole layer is read live. A difference does not say which side is newer — a deployment older than these files is ordinary — and either way **the deployment wins**.

Keep the `sha` you read. A deployment is rolled while you work — several times a day on a busy one — and a roll can change the function catalog, the model catalog and the task bindings your steps inherit. When something that worked starts failing with no edit of yours, read `/health` again first: a different `sha` means re-run `scripts/sync.mjs`, update these skills from their source if it reports a layer that differs (not when its `skills` line says they are ahead — then updating changes nothing, and the deployment wins until it rolls), and re-read the page for whatever failed before changing your own work.

Installed as a Claude Code plugin, these skills update only when someone updates them: auto-update is off for this marketplace until the user turns it on. Updating is `claude plugin marketplace update kipory-skills`, then `claude plugin update kipory@kipory-skills` (with `--scope project` for an install made in one project's folder), and the updated skills load only in a new session. Updating changes the user's machine, so tell the user what `scripts/sync.mjs` reported and give them the two commands rather than running them yourself; then mention that auto-update can be turned on for `kipory-skills`, in their user settings or under Marketplaces in `/plugin`.

## Reading only what you will change

```
GET /v1/projects/{nodeId}                             → 200 and you are connected
GET /v1/projects/{nodeId}/map                         → one entry per flow: what starts it, what it reads, writes, calls, announces
GET /v1/flows/{id}/outline                            → one flow as an indented outline
GET /v1/bootstrap?project={nodeId}&sections=flows     → the authored configuration, one section at a time
GET /v1/bootstrap?project={nodeId}&sections=tenancy   → your grant: the nodes you reach, with your role on each
```

Read the map at the start of a session **instead of** the whole bootstrap or document: about 0.5 KB a flow, against megabytes for the whole configuration. A member with nothing to say is left out: read an absent one as none. Then read a flow's outline when you need its shape, and the bootstrap's `sections=` only for what you are about to edit. Before you rename or remove anything, ask who uses it: `GET /v1/projects/{nodeId}/references?of=field:review.stars` (`kipory-evolve` says how to read the answer).

The bootstrap read returns ten sections <!-- count: bootstrap-sections --> — project, schema, relations, views, events, flows, surfaces, vectors, evals, tenancy — each the resource's own envelope, with a `structureVersion` to cache against and a `sections` map that says which moved. The `tenancy` section is the grant `GET /v1/grant` returns, drawn as a tree: the shallowest node in `nodes[]` is the grant node and `role` on every node is the grant's role. Do not probe ids to discover reach.

## Confirm facts live

Function keys come from `GET /v1/functions`, request shapes from `GET /v1/openapi.json`, the platform's own paths from `GET /v1/coded-routes` — all on _this_ deployment, never from memory. The bundled `references/` are a snapshot of the same sources with the hash they were taken at; `scripts/sync.mjs` told you whether it is current.

## A model account that runs out

`GET /v1/nodes/{nodeId}/task-models` lists each task a step inherits its model through. Read it before the first run and again after a `sha` change: a roll can move a binding above the project that the project never chose. `callable: true` says the deployment holds an account for the model and it is switched on — not that the account has credit. Model calls run on the platform's own provider accounts; when one runs out, every call on it fails with `… provider account exhausted (quota/billing)` under `detail.phase: "platform-fault"`, uncharged, while the row still reads `callable: true`. The row's `serving.state` is what turns to `refusing` (with `since`), and `GET /v1/platform-status` reads the same for every vendor and model-provider account the platform holds — check it when a run fails with that phase, before changing anything. That is the deployment's fault, not the flow's: tell whoever runs it, and see `kipory-build`'s `references/models.md` for moving a task meanwhile.

## Descriptions and metadata

The platform also writes a plain-language description of each element of a project. `GET /v1/descriptions?project={nodeId}` reads the newest of each, with `describer` saying whether it is switched on, how far it has described and how its last run ended. `GET /v1/descriptions/history?project={nodeId}&element=<elementRef>` pages one element's earlier ones (`elementRef` is on each row of the first read). `POST /v1/descriptions/describe { project }` (EDITOR) asks for a run now, at no charge; it answers 202 either way, and `enqueued: false` with a `reason` means none started. An element's own authored `description` is on the element's route, not here. The three routes are on `references/api/projects.md`.

You can also keep your own notes on any element as metadata: free key-values such as who owns a flow or the ticket an endpoint was built for. `POST /v1/metadata { project, element, key, value }` (EDITOR) sets one key; `element` is the same `elementRef`, and `value` is any JSON. Leave `version` out to create the key and send the `version` you read to replace it; a stale one is 409 `VERSION_CONFLICT` with the stored entry in `details.current`. `GET /v1/metadata?project={nodeId}` reads every key with the `limits` a write is held to (add `&element=<elementRef>` for one element), and `DELETE /v1/metadata/{id}` (ADMIN) removes one. Metadata is not configuration: no flow reads it and setting it changes nothing the project does. Keys starting `kipory.` are the platform's and are refused. The three routes are on `references/api/projects.md`.

## Creating a project, and an older document

The create also takes a `template` slug (`GET /v1/templates` lists them) or a whole `document`
(`kipory-build`'s `references/packs/project-document.md`), one or the other, applied in the same
transaction — a refused one leaves no project behind.

A project document you hold can be one the platform refuses. The deployment reads exactly one
format, with no overlap: `documentFormat` on `GET /v1/platform-status` names it, and an older
document is refused with `DOCUMENT_VERSION_UNSUPPORTED`. When the deployment's format is newer than
these skills', update the skills first — they are published when the change merges, normally before a
deployment rolls it.

## Projects from before format 11

The platform reads document format 11 only, and a format-10 document is refused with
`DOCUMENT_VERSION_UNSUPPORTED`. When it moved to format 11, the development and staging
deployments were reset: every project and account was cleared, and only Kipory's own configuration
stayed, so a project from before is not there to read — build it again in format 11.

## A flow with no steps yet

A new flow is created with `steps: []`, and an endpoint, a trigger or a schedule can name it before
its steps are written. A flow with no steps yet is not started: the run answers `FLOW_NOT_AUTHORED`
(409) with `details.flowKey`, and is never retried. Write its steps with `PUT /v1/flows/{id}/steps` or a project document
(`kipory-build`).

`GET /v1/projects/address-availability?candidate=` says whether a slug is free before you send it. A
project's address — its subdomain — can move later and its slug never does; moving it is `kipory-evolve`.

## Filing a report

Tell Kipory with `POST /v1/reports`, then carry on with whatever workaround you have. Any key of the project files one, whatever its role. File a report when:

- an answer was unexpected — a `500`, or a `platform-fault` in a run's timeline that `GET /v1/platform-status` does not already show (one report per outage, not one per run, with the run ids in `runIds`);
- a workaround cost you more than a few minutes;
- a doc or skill said something untrue, or left out what you needed;
- something you need does not exist;
- an answer told you something went wrong but not what to do about it.

Do not file a refusal whose remedy you can apply — a `422` that names your field, a `403` whose `requiredRole` you lack — nor a failure your own configuration caused, such as your `$assert`, a `FLOW_OUTPUT_MISSING` or a step that read the wrong value: `kipory-diagnose` first. Fix those.

One problem per report: the second problem is a second report, and a summary of your session is not a report. The body needs `project`, `trying` (the goal, not the call), `happened` (the answer, the code, what you tried next) and `impact` — `blocked`, `worked-around` or `annoyance`. Add `kind` (one of `bug`, `missing-capability`, `docs-wrong`, `unclear-message`, `question` or `praise`; any other value is refused `VALIDATION_FAILED`), `surface` (the route or function key), `expected`, the `requestId` of each failing answer in `requestIds`, a failing run's id in `runIds`, the skill you were following in `skill`, your model and host in `agent`, and about how many minutes it cost in `timeLostMinutes`. Never paste a key or a secret: it is replaced before the report is kept, and the report is less useful for it.

The answer carries the report's `id` and `statusUrl`. **At the start of every session, read `GET /v1/reports?project=<nodeId>`** and look at what changed — `&state=received&state=looking&state=planned` narrows it to the open ones. A report reads `fixed` when its fix shipped, `answered` when Kipory answered it without one, and `staffAnswer` says what to do. The same text from the same key or person within 24 hours answers `200` with the first report. A key or person files at most 10 a minute and 20 in any 24 hours in one project, and the project takes at most 100 reports in any 24 hours from every key and person together; past either cap a report answers `429 RATE_LIMITED`, with `details.scope: "project"` for the project's and `details.retryAfterSeconds` saying when to file again.

## What the platform refuses a key, always

<!-- key-unreachable-ok: GET /v1/projects — named ONLY to warn it is refused, never prescribed -->
<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn it is refused, never prescribed -->

The full list with reasons is `references/api/routes-a-key-cannot-call.md`. The ones you will meet:

- **A key cannot mint a key.** Key management accepts a signed-in session only. The human mints it, on the api host; `GET /v1/grant` tells you the node, the role and the expiry.
- **A key is never platform staff.** `GET /v1/projects` — every project on the installation — answers 403 to every customer key. `GET /v1/grant` lists the ones your key reaches.
- **A key has no `me`.** Every `/v1/me*` route and the charges statement `GET /v1/credits/events` answer 401 from inside the function. Reading a node's members, or the node itself through `/v1/nodes`, is a human's surface too; `GET /v1/grant` and the bootstrap's `tenancy` section are yours.
- **A key cannot act as an end user.** A flow that reads or writes person-owned records, or an events subscription scoped to a user or a record, refuses a key with 403; a key's runs are project-owned.

## What will bite you

- **Silence about the node id.** Nothing at mint time tells the key its grant. Read `GET /v1/grant` at turn zero, not at the first 403.
- **`parentNodeId` omitted on create** — defaults to the platform organisation, refuses, and reads like an auth failure.
- **The 201 is not proof of everything.** Project creation is atomic, but the flow-provider types are seeded afterwards, best-effort. Read them back before referencing one, or call `POST /v1/types/seed`.
- **A retired project stops its own keys.** A key granted at the project answers `401` to every call, reads included, until the project is restored. A key granted at the organisation above still reads it, and a write naming it answers 409 — except the restore and the purge, switching off a schedule, trigger or source, and deleting a secret.
- **A declared query string is strict.** On a route whose reference lists query parameters, an unlisted key or value — `expand` on a resource that has none, an `expand` value that resource does not offer, a typo — is a 422. A read whose reference lists no query parameters ignores any you send, so a misspelled flag there is silent. A write — POST, PUT, PATCH or DELETE — refuses any query key it does not list (422) and writes nothing, and one that takes no body refuses a body with any key. Your project's own endpoints (defined with `/v1/api-endpoints`) are not part of this rule: what each accepts is set by its own definition.
- **A new build can turn an untouched flow red.** When `sha` on `GET /health` changes, read
  `GET /v1/flows?project=<nodeId>&expand=health` and fix any errors: a rule the build added or
  tightened can fail a flow nobody edited while its runs keep succeeding, and the next write that
  rewrites the step it is on is refused for it. `GET /v1/platform-status` names those codes
  (`rules`); a trigger on
  `platform/flow-health.failing` is told without asking.
- **Versions on the bootstrap are decimal strings.** Compare them as big integers; `"9" > "10"` as text is the documented failure.

## A role-floor 403, in full

A role-floor `403` carries `details: { reason: "insufficient_project_role", requiredRole, grant: { nodeId, role } }` — what the route needs, and what your key holds. Compare the two roles: if `grant.role` is below `requiredRole`, ask the human for a key with that role. If it is at or above it, the role was never the problem: the node you addressed is not `grant.nodeId` or beneath it — you were given another project's id, or one that does not exist. The body cannot say which of those two, deliberately: an unresolvable node, a project never created and an insufficient role all refuse identically, so a `403` is not an existence oracle. A key holds **one node and one role**. Reach is plain descent — a grant at an organisation reaches every project beneath it; a grant at one project reaches that project only. The role is uniform over the whole reach and cumulative: read → `viewer`, design mutation → `editor`, destructive or structural → `admin`; creating a project needs `owner` at the parent. **A key is minted at `viewer` unless a role was asked for**, so if every write refuses while reads succeed, suspect the role first. Previewing or testing a flow — preview, eval runs, vector search — is `admin`. A record write that queues processing, a reprocess and a trigger replay are `editor`, and are charged like any live run.
