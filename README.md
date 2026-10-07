# Kipory agent skills

Skills that teach a coding agent how to build a product on **Kipory**, over its HTTP API.

Kipory is a platform for building a product's backend — its processes, its data, and the entry points the outside uses. A product on Kipory is a **project**, and a project is not code — its flows, record types, HTTP endpoints, triggers, schedules, vocabularies and events are validated configuration rows you author by calling the design API. So an agent with an API key can build a product's whole backend without writing an application, which is what these skills are for. The frontends people use are clients of what the project exposes.

## Words on the site and in the API

Kipory's site and its app name some things with different words than the API does. These skills use the API's words, because those are the ones in the routes, the fields and the handler keys an agent reads and writes. When you describe what you want in the site's words, this is what your agent will call it:

| On the site and in the app | In the API and in these skills     | Where an agent meets it                                 |
| -------------------------- | ---------------------------------- | ------------------------------------------------------- |
| Type                       | schema entry                       | `/v1/types`                                             |
| Table                      | record type                        | `/v1/tables`, the field `recordType`                    |
| Record                     | record, and entity in handler keys | `/v1/records`; handlers such as `record.read`           |
| Relation                   | relation kind                      | `/v1/relations`                                         |
| Link                       | edge                               | `/v1/links`; the handler `record.links`                 |
| Vocabulary                 | facet                              | `/v1/vocabularies`; the handler `vocabulary.aggregate`  |
| Term                       | term                               | `/v1/terms`                                             |
| Function                   | handler                            | `/v1/handlers`, the field `handlerKey`                  |
| Action                     | step, stored as a skill            | `/v1/steps`; the fields `skill`, `skills` and `skillId` |

A "skill" in that last row is one step of a flow. It is not one of the agent skills in this repository.

## Install

**Claude Code** — as a plugin, which keeps it updatable:

```
/plugin marketplace add KiporyOrg/kipory-skills
/plugin install kipory@kipory-skills
```

In the Claude desktop app `/plugin` opens a dialog and ignores what follows it; run the same two commands from a terminal instead, in the project's folder:

```
claude plugin marketplace add KiporyOrg/kipory-skills
claude plugin install kipory@kipory-skills --scope project
```

**Any agent that reads the Agent Skills format** (Codex, Cursor, Gemini CLI, Copilot and others):

```
npx skills add KiporyOrg/kipory-skills
```

**By hand** — copy the skill directories into wherever your agent looks (`.claude/skills/`, `.agents/skills/`):

```
git clone https://github.com/KiporyOrg/kipory-skills
cp -R kipory-skills/skills/* .claude/skills/
```

Install them together. Each skill's `references/` and `scripts/` live inside it and its links never leave it, but the skills lean on each other by name: the handler catalog and the worked flow patterns ship inside `kipory-build`, and the conventions every route shares inside `kipory-connect`. Then tell your agent what you want to build. Start with `kipory-connect` — it is turn zero, and it hands off to everything else.

## What is here

Three layers. The first two come from the deployment you build on; the third is this repository — and this repository also carries a **generated snapshot** of the first two, so an agent can read a handler's config table or a route's fields without a network round trip per question.

| Layer                                                | Source of truth                                                       | In this repo                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Facts** — what exists                              | `GET /v1/openapi.json`, `GET /v1/handlers` on your deployment         | `references/api/*.md` and `references/handlers/*.md`, generated from the same model the deployment serves |
| **Judgment** — how to think about each capability    | `GET /v1/capability-packs` on your deployment (public, no credential) | `references/packs/*.md`, mirrored                                                                         |
| **Procedure** — which job, in what order, what bites | this repo                                                             | every `SKILL.md`, plus the hand-written references beside it                                              |

Every generated file opens with a stamp naming its source, and the content hashes the whole layer was generated from are recorded once, in `kipory-connect/references/versions.md`. The deployment serves the same hashes live — `version` on `GET /v1/capability-packs` and on `GET /v1/handlers`, and `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` — and `kipory-connect` runs a small script at turn zero that compares them. Beside it, `manifest.json` records one hash per pack, handler and route, which the same three reads serve, so the script names the items that differ and only those pages need a live read. **When they differ, the deployment wins.** That is also why these skills name endpoints and never hosts: Kipory is deployed per installation, and a URL baked into documentation belongs to whoever wrote the documentation.

## The skills

| Skill             | For                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kipory-connect`  | **Start here.** Prove the deployment and the key, read the project in one call, learn the conventions every route shares                                                          |
| `kipory-plan`     | Turn an idea into a build sheet — everything that will exist, before authoring                                                                                                    |
| `kipory-model`    | Record types and shapes, vocabularies and terms, relation kinds, the embedding profile that makes records searchable                                                              |
| `kipory-build`    | Build and edit flows over the handler catalog: steps, slots, output binding, health, preview, checkpoints                                                                         |
| `kipory-data`     | Read and write records, files and edges by hand: import, correct, reprocess, delete; the processing stream                                                                        |
| `kipory-gather`   | Reach outside the project: fetch and scrape pages, call an API with or without a stored key, send a request to an outside system, web search, social platforms, places, geocoding |
| `kipory-extract`  | Turn a file into something a flow can use: PDF text, page renders, transcripts, image data, signed links                                                                          |
| `kipory-retrieve` | Search the project's own records and answer over them: chunk, embed, search, re-rank, and sanitize                                                                                |
| `kipory-expose`   | Put a flow on HTTP as the product's own endpoint — sync, async or streaming — and sign its users in                                                                               |
| `kipory-prove`    | Pin what "working" means: eval suites — assertions for pass/fail, scorer flows for quality, the run-to-run delta                                                                  |
| `kipory-operate`  | Schedules, triggers, the event registry, runtime config, and what it all spent                                                                                                    |
| `kipory-channels` | Send mail from the project's own address; subscribe to Telegram channels                                                                                                          |
| `kipory-secrets`  | Store a credential a flow needs — a vendor key, or the key a step sends to an outside API — and decide whose key pays the vendor                                                  |
| `kipory-diagnose` | Find a run, read its step log, its writes and its trace, and see which step moved                                                                                                 |
| `kipory-evolve`   | Change a project that already holds records or serves callers: rehearse a change, read a refusal, roll a flow back                                                                |

## Before you start

You need two things, and **an agent cannot discover either of them** — they come from you:

1. **The base URL** of your Kipory deployment's api host.
2. **An API key.** Only a signed-in human can mint one: a key cannot mint another key, so that a leaked key cannot manufacture siblings that outlive revoking the original. Mint it with the role the work needs — a key is `viewer` unless you ask, and previewing or testing a flow needs `admin`.

The project's id is not one of them. The key reads its own grant — its node, its role and the projects it reaches — from `GET /v1/grant`, which `kipory-connect` does at turn zero.

## Contributing

These files are **mirrored from a private monorepo** on every merge to its main branch, so an edit made here is overwritten by the next sync. **Please open an issue rather than a pull request.** The most useful report is _"this skill told me to do X and the platform refused"_ — that is the failure these files exist to prevent and the one that is hardest to catch from the inside.

What stands behind them: on every build of the monorepo, each skill's frontmatter is checked against the Agent Skills spec; every endpoint citation is resolved against the route manifest, with the parameter names the API uses; every route a customer's key can never call is refused from prose that would prescribe it — a curated table, complete for the gates it has learned to see; every cited capability pack is one the deployment actually serves; links stay inside the skill that ships them; every route and handler the generated references document is named somewhere in the hand-written text, or excused with a reason; an `expand` value is checked against the route it is written beside; a sentence saying a route does not exist is checked for the day it does; the generated references are compared byte for byte with their generators; and the mirror is measured against this repository daily. What none of that can see is **prose** — a sentence about what the platform re-checks, caches or refuses resolves no route and names no id. That is the class of error most worth reporting.

## Versions

`VERSION` and `CHANGELOG.md` are written by the publish job; every publish is also a git tag. `kipory-connect/references/versions.md` carries the content hashes that matter for correctness.

## License

MIT — see [LICENSE](LICENSE). Copy them, change them, vendor them into your own tooling.
