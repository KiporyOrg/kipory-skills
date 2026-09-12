# Kipory agent skills

Skills that teach a coding agent how to build a product on **Kipory**, over its HTTP API.

Kipory is a platform for building products. A product on Kipory is a **project**, and a project is not code — its record types, flows, HTTP endpoints, facets, schedules and events are validated configuration rows you author by calling the design API. So an agent with an API key can build a whole product without writing an application, which is what these skills are for.

## Install

**Claude Code** — as a plugin, which keeps it updatable:

```
/plugin marketplace add KiporyOrg/kipory-skills
/plugin install kipory@kipory-skills
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

Each skill is self-contained: its `references/` and `scripts/` live inside it, so installing one skill alone works. Then tell your agent what you want to build. Start with `kipory-connect` — it is turn zero, and it hands off to everything else.

## What is here

Three layers. The first two come from the deployment you build on; the third is this repository — and this repository also carries a **generated snapshot** of the first two, so an agent can read a handler's config table or a route's fields without a network round trip per question.

| Layer                                                | Source of truth                                                       | In this repo                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Facts** — what exists                              | `GET /v1/openapi.json`, `GET /v1/handlers` on your deployment         | `references/api/*.md` and `references/handlers/*.md`, generated from the same model the deployment serves |
| **Judgment** — how to think about each capability    | `GET /v1/capability-packs` on your deployment (public, no credential) | `references/packs/*.md`, mirrored                                                                         |
| **Procedure** — which job, in what order, what bites | this repo                                                             | every `SKILL.md`, plus the hand-written references beside it                                              |

Every generated file opens with a stamp naming the content hash it was generated from. The deployment serves the same hashes live — `version` on `GET /v1/capability-packs` and on `GET /v1/handlers` — and `kipory-connect` runs a small script at turn zero that compares them. **When they differ, the deployment wins.** That is also why these skills name endpoints and never hosts: Kipory is deployed per installation, and a URL baked into documentation belongs to whoever wrote the documentation.

## The skills

| Skill             | For                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `kipory-connect`  | **Start here.** Prove the deployment and the key, read the project in one call, learn the conventions every route shares |
| `kipory-plan`     | Turn an idea into a build sheet — everything that will exist, before authoring                                           |
| `kipory-model`    | Record types and shapes, facets and terms, relation kinds, the embedding profile that makes records searchable           |
| `kipory-build`    | Build and edit flows over the handler catalog: steps, slots, output binding, health, preview, checkpoints                |
| `kipory-data`     | The records, files and edges a project already holds; the processing stream; what ingest fetched                         |
| `kipory-gather`   | Bring data in from outside: fetch and scrape pages, web search, YouTube, X, Telegram discovery, geocoding                |
| `kipory-extract`  | Turn a file into something a flow can use: PDF text, page renders, transcripts, image data, signed links                 |
| `kipory-retrieve` | Search the project's own records and answer over them: chunk, embed, search, re-rank, and sanitize                       |
| `kipory-expose`   | Put a flow on HTTP as the product's own endpoint — sync, async or streaming — and sign its users in                      |
| `kipory-prove`    | Pin what "working" means: test cases for pass/fail, eval suites for quality, the run-to-run delta                        |
| `kipory-operate`  | Schedules, the event registry, runtime config, and what it all spent                                                     |
| `kipory-channels` | Send mail from the project's own address; subscribe to Telegram channels                                                 |
| `kipory-secrets`  | Store a vendor credential a flow needs — and decide whose key pays the vendor                                            |
| `kipory-diagnose` | Find a run, read its step log, its writes and its trace, and see which step moved                                        |
| `kipory-evolve`   | Change a project that is already live: rehearse a change, read a refusal, roll a flow back                               |

## Before you start

You need three things, and **an agent cannot discover any of them** — they come from you:

1. **The base URL** of your Kipory deployment's api host.
2. **An API key.** Only a signed-in human can mint one: a key cannot mint another key, so that a leaked key cannot manufacture siblings that outlive revoking the original. Mint it with the role the work needs — a key is `VIEWER` unless you ask, and anything that runs a flow is `ADMIN`.
3. **The node id your key was granted at**, or the project's node id. `kipory-connect` explains how a key reads its own grant back once it is connected.

## Contributing

These files are **mirrored from a private monorepo** on every merge to its main branch, so an edit made here is overwritten by the next sync. **Please open an issue rather than a pull request.** The most useful report is _"this skill told me to do X and the platform refused"_ — that is the failure these files exist to prevent and the one that is hardest to catch from the inside.

What stands behind them: on every build of the monorepo, each skill's frontmatter is checked against the Agent Skills spec; every endpoint citation is resolved against the route manifest, with the parameter names the API uses; every route a customer's key can never call is refused from prose that would prescribe it — a curated table, complete for the gates it has learned to see; every cited capability pack is one the deployment actually serves; links stay inside the skill that ships them; the generated references are compared byte for byte with their generators; and the mirror is measured against this repository daily. What none of that can see is **prose** — a sentence about what the platform re-checks, caches or refuses resolves no route and names no id. That is the class of error most worth reporting.

## Versions

`VERSION` and `CHANGELOG.md` are written by the publish job; every publish is also a git tag. The stamps inside the generated references carry the content hashes that matter for correctness.

## License

MIT — see [LICENSE](LICENSE). Copy them, change them, vendor them into your own tooling.
