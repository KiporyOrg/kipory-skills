---
name: kipory-plan
description: Turn a product idea into a Kipory build sheet — every record type, shape, flow, step, endpoint, facet, relation, schedule, event, secret and test that will exist, each marked buildable-as-configuration or needs-software-written — and stop for the human to reject it cheaply. Use before authoring anything, when the user describes what they want to build rather than which endpoint to call, or when an existing project is about to grow a new capability. Not for building (that is every other skill) and not for a single endpoint the user has already specified.
license: MIT
---

# Plan a project

**This skill is a pointer, not a copy.** The eight-step protocol is served by the deployment you are building on — `references/packs/planning-protocol.md`, live at `GET /v1/capability-packs/planning-protocol` — and that is where it must stay: a second copy would drift toward whichever deployment happened to be in front of the person who wrote it. What this file adds is the order of reads, the three rules agents skip, and a worked build sheet to imitate. The fact most people get wrong: **nothing on the platform stores or executes a build sheet.** It is delivered in the conversation, and executing it is ordinary design-API use — the same calls a person makes by hand.

## Before the first call

- `kipory-connect` has run: you hold the base URL, a live key and the project's node id, and you know whether the project exists.
- Read `references/packs/limits.md` **before decomposing anything**. It is short, and it is the difference between a plan that can be built and one that dead-ends after three days of work.

## The sequence

1. **Fetch the protocol** — the eight-step walk, the four rules, and the build-sheet shape.
2. **If the project exists, read what it already has**: `GET /v1/bootstrap?project={nodeId}`. A plan that re-authors an existing record type is wrong before it starts.
3. **Read the whole handler catalog** — `kipory-build`'s `references/handlers/README.md`, or `GET /v1/handlers` — before step 3 of the walk, not a filtered view. A keyword search encodes what you already believe. The first recorded run of this protocol searched for the words it expected, missed a handler entirely, and turned what should have been a `seed` row into a `code` row.
4. **Fetch the pack each step points at, when you reach that step** — not all of them up front.
5. **Confirm every fact live** — handler keys from `GET /v1/handlers`, routes and shapes from `GET /v1/openapi.json`, on this deployment. This is Rule 0 and it is not optional.
6. **Emit the build sheet, then stop.**

## Three the protocol states that an agent most often skims past

**A `code` row is a finding, not a failure.** The count of them is the number that makes the plan real; surface it rather than designing around it to keep the sheet tidy.

**An empty step is a decision.** An omitted step and a forgotten one look identical to the reader, and the reader is the person who needs to catch your mistake. Write "none, because…".

**The four primitives easy to leave out and expensive to discover later**: a record type declared searchable needs an **embedding profile** to name; a flow calling a paid web vendor may need a **secret**; a threshold you will want to tune belongs in a **project-config namespace**, not baked into a flow; and the **test cases** in step 8 are the only part of a plan that survives a later rewrite.

## What will bite you

- **Emitting the sheet and continuing straight into building it.** The sheet exists to be rejected cheaply, and it is only cheap if you stopped and let it be read.
- **Skipping step 8 because the project is small.**
- **A per-user record type in a plan a key will execute.** A key's runs are project-owned; a type whose records belong to individual end users cannot be written by it. If the product has end users who own their data, the sheet needs an endpoint they call signed in (`kipory-expose`), and the plan should say so.
- **Planning a record write as a coded route.** There is no `POST` for records; a record is written by a flow step reached through an endpoint, a schedule or processing. The sheet's exposure step is where the write lives.
- **Forgetting the two hosts.** Every endpoint row in the sheet is served on the project's host; everything else the sheet authors is on the api host.

## References

| File                                    | What it answers                                        |
| --------------------------------------- | ------------------------------------------------------ |
| `references/packs/planning-protocol.md` | the eight steps, the four rules, the build-sheet shape |
| `references/build-sheet-example.md`     | one complete sheet for a small product, to imitate     |

## Then

`kipory-model` for steps 2 and 5, `kipory-build` for step 3, `kipory-expose` for step 4, `kipory-operate` for steps 6 and 7, `kipory-prove` for step 8, `kipory-secrets` and `kipory-channels` when a row calls for them.
