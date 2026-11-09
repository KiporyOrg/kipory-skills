---
name: kipory-connect
description: Start a session that builds on Kipory — prove the deployment is there, prove the API key is alive and reaches the project, see what the project already holds in one short read, and get the `kipory` command that plans, applies and tests in single calls. Use at the beginning of any work on a Kipory project, when a call returns 401, 403 or 404 and the cause is unclear, when the user hands over a base URL and an API key, or when you need to know which id, host or role a call wants. This is the entry skill; every other kipory skill assumes it ran.
license: MIT
---

# Connect to Kipory

Kipory is a platform for building a product's backend. A product on Kipory is a **project**, and a project is not code: its tables, flows, HTTP endpoints, schedules and events are **validated configuration rows**, written as one **project document** and applied through the design API. There are **two hosts**: the design API answers on the api host with your key, and the product's own endpoints answer on the project's host (`baseUrl`). A route called on the other host is a 404 that looks like a typo.

## What you need

The **base URL** of the api host and an **API key**. Both come from the human; read them from the environment (`KIPORY_BASE_URL`, `KIPORY_API_KEY`, and `KIPORY_PROJECT_ID` when they gave one). Never write the key into a file you commit or a line you print. Where the human gets a key, and which role the work needs: `references/turn-zero.md`.

## The `kipory` command

This skill ships `scripts/kipory.mjs`. It calls the design API for you, with short answers, so you write no plan, apply or test plumbing of your own. Run it from the folder holding `.env` (Node 18+, no install). Each shell call starts fresh: write the whole `node .claude/skills/kipory-connect/scripts/kipory.mjs …` every time, no variable or alias. Other pages write it `kipory <command>`.

```bash
node .claude/skills/kipory-connect/scripts/kipory.mjs summary                         # the project: host, version, one line per table, flow, endpoint, schedule
node .claude/skills/kipory-connect/scripts/kipory.mjs plan doc.json                   # plan a document (or a .mjs generator that prints it): one line per error
node .claude/skills/kipory-connect/scripts/kipory.mjs apply                           # apply the plan you just made; prints the new version and the host
node .claude/skills/kipory-connect/scripts/kipory.mjs ship doc.mjs                    # plan, then apply when clean
node .claude/skills/kipory-connect/scripts/kipory.mjs user alice                      # a test user, made once and remembered in .kipory/
node .claude/skills/kipory-connect/scripts/kipory.mjs call alice GET "/v1/notes"      # call the project's host as alice (or - for no one): status and body
node .claude/skills/kipory-connect/scripts/kipory.mjs call alice POST "/v1/notes" '{"title":"x"}'
node .claude/skills/kipory-connect/scripts/kipory.mjs preview notify-due --as alice   # run a flow in the sandbox as alice, one line per write
node .claude/skills/kipory-connect/scripts/kipory.mjs docs refuse 409                 # the best-matching section of these skills, instead of reading a page
```

`--json` prints the raw answer. `--env <file>` reads another file than `./.env`. A preview runs 5 items of each `each`, saying so; `--fan-out-cap <n|uncapped>` runs more. Exit code 1 means refused, 2 a usage or environment problem.

## The sequence

1. **The deployment and the key.** `GET /health` answers 200. `GET /v1/grant` answers what the key holds: `node` (where it acts; `node.id` is the project's id when `kind` is `project`), `role` (viewer, editor, admin, owner) and each project's `baseUrl`, the project's host. A `viewer` key passes reads and refuses writes. Then `GET <baseUrl>/v1/credits/balance`: unless `status` is `active` and `creditsRemaining` > `-softCapCredits`, endpoints, previews and schedules stop. `node scripts/sync.mjs` compares these skills with the deployment and says whether it reads the document format they write; where a layer differs, the deployment wins (`references/session-start.md`).
2. **What the project holds.** `kipory summary` (`GET /v1/projects/{nodeId}/document/summary`): one line per element, a few KB. Read the whole document (`GET /v1/projects/{nodeId}/document`) only for the rows you will change. `GET /v1/projects/{nodeId}/map`: what starts each flow, what it touches. An empty project has nothing to read.
3. **Build.** Read `kipory-build`'s `references/quickstart-document.md` (one complete project as a document), then its `references/answers.md` (what agents look up: statuses, the caller, search and paging, running once, rehearsing a job, names). For anything else, `kipory docs <words>`.

## Reading a refusal

- **401:** the credential is missing, malformed, revoked or expired. Ask the human for a live key.
- **403:** the grant does not authorise this. `details.requiredRole` against `details.grant.role` says whether the key's role is too low or the id is another project's.
- **404:** check the path first, then the host, then whether the id is one your key can see.
- **402:** out of credits or at a ceiling. Branch on `code`: `references/conventions.md`, Refusals.

Every refusal code: `references/refusal-codes.md` (`kipory docs <CODE>`). A role-floor 403 in detail: `references/turn-zero.md`.

## When something stops you

File a report, `POST /v1/reports { project, trying, happened, impact }` (`impact`: `blocked`, `worked-around` or `annoyance`), for a `500`, an untrue doc or a missing capability, then carry on (`references/session-start.md`, Filing a report).

## References

| File                          | What it answers                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `references/turn-zero.md`     | each first call in full, creating a project, reading a refusal, what bites at turn zero                                        |
| `references/session-start.md` | what `scripts/sync.mjs` prints, reading only what you change, descriptions, older documents, a flow with no steps yet, reports |
| `references/conventions.md`   | the rules every design resource shares: hosts, ids, roles, `version`, errors, paging; `expand=` is `references/expand.md`      |
| `references/glossary.md`      | the words that collide — agent skill, step, action, function, record, term, event, preview — and which meaning the API uses    |
| `references/refusal-codes.md` | every refusal code once: what it means, what to do                                                                             |
| `references/packs/limits.md`  | what Kipory cannot do, read before designing around it                                                                         |
| `references/api/*.md`         | the routes of projects, bootstrap, nodes, templates, reports, notices, and every route a key cannot call                       |
| `scripts/kipory.mjs`          | the command above                                                                                                              |
| `scripts/sync.mjs`            | compares these skills with the deployment                                                                                      |

## Then

`kipory-build` for anything you author; start at its quickstart. `kipory-plan` if the human described a product rather than a change. `kipory-evolve` the moment the project holds records you will reshape. `kipory-diagnose` when something ran and came back wrong. `kipory-model`, `kipory-data`, `kipory-expose`, `kipory-channels`, `kipory-prove`, `kipory-secrets`, `kipory-operate`, `kipory-gather`, `kipory-extract` and `kipory-retrieve` each go deep on one subject; the quickstart and the answers say when you need one.
