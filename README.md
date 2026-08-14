# Kipory agent skills

Skills that teach a coding agent how to build a product on **Kipory**.

Kipory is a platform for building products. A product on Kipory is a **project**, and a project is
not code — its record types, flows, HTTP endpoints, facets, schedules and events are validated
configuration rows you author by calling the design API. So an agent with an API key can build a
whole project without writing an application, which is what these skills are for.

## Install

Copy the skills you want into your agent's skill directory. For Claude Code:

```bash
git clone https://github.com/KiporyOrg/kipory-skills
cp -R kipory-skills/skills/* .claude/skills/
```

Then tell your agent what you want to build. Start with `kipory.connect` — it is turn zero, and it
is the one that gets you to everything else.

## What is here, and what deliberately is not

There are three layers, and only the third one lives in this repository.

| Layer         | Where it lives                     | Why there                                                         |
| ------------- | ---------------------------------- | ----------------------------------------------------------------- |
| **Facts**     | your deployment's API              | `GET /v1/openapi.json`, `GET /v1/handlers` — what actually exists |
| **Judgment**  | your deployment's capability packs | `GET /v1/capability-packs` — how to think about each capability   |
| **Procedure** | **this repo**                      | which job to do, in what order, and what bites you                |

**The capability packs are not copied here on purpose.** They are served by the deployment you are
building on, so they answer for _that_ deployment and move when it moves. A copy in this repository
would answer for whichever deployment happened to be in front of whoever last edited it. The
packs are public — no credential needed — and every response carries a `version` that is a content
hash of the whole set, so an agent can cache against it and refetch when it moves.

That is also why these skills name **endpoints and never hosts**. Kipory is deployed per
installation; there is no canonical host, and a URL baked into documentation belongs to whoever
wrote the documentation.

## The skills

| Skill             | For                                                                              |
| ----------------- | -------------------------------------------------------------------------------- |
| `kipory.connect`  | **Start here.** Confirm the credential, learn what it reaches, load the packs    |
| `kipory.plan`     | Turn an idea into a build sheet — everything that will exist, before authoring   |
| `kipory.model`    | Record types, facets, relations, and the vector space that makes them searchable |
| `kipory.build`    | Build and edit flows over the handler catalog                                    |
| `kipory.expose`   | Put a flow on HTTP, and get a credential that can call it                        |
| `kipory.prove`    | Pin what "working" means and re-check it after every edit                        |
| `kipory.secrets`  | Store a credential a flow needs — and decide whose key pays the vendor           |
| `kipory.operate`  | Schedules, events, and runtime config                                            |
| `kipory.diagnose` | Read a flow's runs and see what each skill actually emitted                      |

## Before you start

You need three things, and **an agent cannot discover any of them** — they come from you:

1. **The base URL** of your Kipory deployment.
2. **An API key.** Only a signed-in human can mint one: a key cannot mint another key, so that a
   leaked key cannot manufacture siblings that outlive revoking the original.
3. **The node id your key was granted at.** Nothing echoes a grant back to its holder, so if your
   agent is not told, it cannot find out.

`kipory.connect` explains what each is for and how to check the key works before anything is built.

## Contributing

These files are **mirrored from a private monorepo** and are overwritten on each sync, so an edit
made here would be lost.

**Please open an issue rather than a pull request.** A correction is genuinely welcome — the most
useful kind is _"this skill told me to do X and the platform refused,"_ because that is the failure
mode these files exist to prevent and the one that is hardest to catch from the inside.

For transparency about how much checking stands behind them: every file here is linted on each
build of the monorepo it is mirrored from. Endpoint citations resolve against the live route table,
capability-pack ids against the set a deployment actually serves, and a skill that prescribed an
endpoint your key could never clear fails that build — the check asks whether **you may call** a
route, not merely whether it exists. The mirror is measured rather than asserted: the published
copy is compared byte for byte against its source.

**What none of that can see is prose.** A sentence describing how the platform behaves at runtime —
what it re-checks, what it caches, what it refuses and why — resolves no route and names no id, so
nothing verifies it. That is the class of error most worth reporting, and on request and response
shapes the live `GET /v1/openapi.json` on your own deployment stays the authority.

## License

MIT — see [LICENSE](LICENSE). Copy them, change them, vendor them into your own tooling.
