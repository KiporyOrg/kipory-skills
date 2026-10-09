---
name: kipory-plan
description: Turn a product idea into a Kipory build sheet before anything is authored — every table, type, flow, action, endpoint, vocabulary, relation, schedule, trigger, source, event, secret and eval that will exist, each marked buildable-as-configuration or needs-software-written — and stop for the human to reject it cheaply. Use when the user describes what they want to build rather than which call to make, asks whether Kipory can do something, or wants an existing project to grow a new capability (plan it here, then read kipory-evolve before changing what is live). Then kipory-build writes the accepted sheet as one project document and plans it. Not for a single endpoint or flow the user has already specified (kipory-build, kipory-expose).
license: MIT
---

# Plan a project

**This skill is a pointer, not a copy.** The eight-step protocol is served by the deployment you are building on — `references/packs/planning-protocol.md`, live at `GET /v1/capability-packs/planning-protocol` — and that is where it must stay: a second copy would drift toward whichever deployment happened to be in front of the person who wrote it. What this file adds is the order of reads, the three rules agents skip, and a worked build sheet to imitate. The fact most people get wrong: **nothing on the platform stores or executes a build sheet.** It is prose, delivered in the conversation, for a person to say no to. What the platform runs is the **project document** the accepted sheet describes — the same project as one name-addressed file — and it is planned (`POST /v1/projects/{nodeId}/document/plan`) before it is applied. The plan is the second moment a person can say no, and a better-informed one: every row that would be created, changed and removed, every refusal on the path that caused it, and what the change does to stored data, with nothing written. Applying it is ordinary design semantics — every row goes through the same write a person makes by hand, composed into one transaction. There is no privileged path.

## Before the first call

- `kipory-connect` has run: you hold the base URL, a live key and the project's id (from `GET /v1/grant`), and you know whether the project exists.
- Read `kipory-connect`'s `references/packs/limits.md` **before decomposing anything**. It is short, and it is the difference between a plan that can be built and one that dead-ends after three days of work.

## The sequence

1. **Fetch the protocol** — the eight-step walk, the four rules, and the build-sheet shape.
2. **If the project exists, read what it already has**: `GET /v1/bootstrap?project={nodeId}`. A plan that re-authors an existing table is wrong before it starts.
3. **Read the whole function catalog** — `kipory-build`'s `references/functions/README.md`, or `GET /v1/functions` — before step 3 of the walk, not a filtered view. A keyword search encodes what you already believe. The first recorded run of this protocol searched for the words it expected, missed a function entirely, and turned what should have been a `seed` row into a `code` row.
4. **Fetch the pack each step points at, when you reach that step** — not all of them up front.
5. **Confirm every fact live** — function keys from `GET /v1/functions`, routes and shapes from `GET /v1/openapi.json`, on this deployment. This is Rule 0 and it is not optional. Models are facts too: `GET /v1/nodes/{nodeId}/task-models` at the project's id lists the task each model action will inherit its model through, and a row with `callable: false` fails every action on that task. Put a binding row in the sheet for each such task the plan uses (`kipory-build`'s `references/models.md`).
6. **Emit the build sheet, then stop.**
7. **When it is accepted, write the document and plan it** — `kipory-build` owns how (its
   `references/packs/project-document.md`: keys not ids, a partial document leaves the rest
   untouched, absence never deletes). **Show the plan, and stop again.** A plan writes nothing,
   so it is as cheap to reject as the sheet was.
8. **Apply it only after the plan was read** — one transaction, however many rows. A project
   that does not exist yet can be created from the document in one call (`POST /v1/projects`
   with `document`): a refused document leaves no project behind.

## Three the protocol states that an agent most often skims past

**A `code` row is a finding, not a failure.** The count of them is the number that makes the plan real; surface it rather than designing around it to keep the sheet tidy.

**An empty step is a decision.** An omitted step and a forgotten one look identical to the reader, and the reader is the person who needs to catch your mistake. Write "none, because…".

**The four primitives easy to leave out and expensive to discover later**: a table declared searchable needs an **embedding profile** to name; a flow calling a paid web vendor, or any outside API through `url.fetch` or `url.send`, may need a **secret**; a threshold you will want to tune belongs in a **project-config namespace**, not baked into a flow; and the **eval cases** in step 8 are the only part of a plan that survives a later rewrite.

## What will bite you

- **Emitting the sheet and continuing straight into building it.** The sheet exists to be rejected cheaply, and it is only cheap if you stopped and let it be read. The same is true of the plan: applying a document whose plan nobody read spends the one cheap moment the loop has.
- **No one to stop for.** When you were told to build end to end and no person will answer, the stops become records instead of waits. Put the sheet, and later the plan's `diagnostics` and `consequences`, into your report or log. Write down each question you would have asked, with the answer you chose. Then read the plan yourself against the sheet before you apply it. Stop only for something you cannot undo, such as a document that deletes rows.
- **Writing the document with ids.** A document carries names; an id in it is matched only when this project holds a row with it, and otherwise ignored (`ignoredIds`). A document written from another project's export plans cleanly here — its ids are noise, its names are the content.
- **Skipping step 8 because the project is small.**
- **Writing "model" on the sheet instead of the function.** A judgement — is it, which one, how much — is a `text.decide` action, which costs a small fraction of a prompt. Only an action that must write words is `text.generate`. Deciding this on the sheet is what keeps a per-record flow cheap (`kipory-build`'s `references/models.md`).
- **A per-user table in a plan a key will execute.** A key's runs are project-owned; a table whose records belong to individual end users cannot be written by a flow it runs (a key can only hand-write one such record at a time, naming the owner). If the product has end users who own their data, the sheet needs an endpoint they call signed in (`kipory-expose`), and the plan should say so.
- **Planning a record write as a coded route.** A product's record writes belong in a flow action reached through an endpoint, a schedule or processing; the sheet's exposure step is where the write lives. `POST /v1/records` exists, but it is an operator's one-record correction path (EDITOR, `kipory-data`), not a product's write.
- **A top-level vocabulary whose terms overlap.** A vocabulary another vocabulary nests under holds one value per record (`kipory-model`'s `references/packs/vocabularies.md`), and neither that nor a term's key can be changed later. Put the term list in the sheet and check each pair for "can one item be both?" before it is seeded; state how a new value is admitted (`mint`), because supervised minting needs a person reading candidates.
- **Forgetting the two hosts.** Every endpoint row in the sheet is served on the project's host — its `baseUrl`, read from `GET /v1/grant` — and everything else the sheet authors is on the api host (`kipory-connect`'s `references/conventions.md`).

## References

| File                                    | What it answers                                        |
| --------------------------------------- | ------------------------------------------------------ |
| `references/packs/planning-protocol.md` | the eight steps, the four rules, the build-sheet shape |
| `references/build-sheet-example.md`     | one complete sheet for a small product, to imitate     |

## Then

`kipory-build` for the document itself — export, plan, apply — and for step 3 when a flow needs
hand-wiring after the apply. By step of the walk:

| Step                                    | Skill                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 records, 5 classification and linking | `kipory-model`                                                                                                                                             |
| 3 processing — what an action can do    | `kipory-gather` (reading from and sending to outside services), `kipory-extract` (files), `kipory-retrieve` (search and answer over the project's records) |
| 4 exposure                              | `kipory-expose`                                                                                                                                            |
| 6 time and reaction, 7 signals          | `kipory-operate`; `kipory-channels` for a Telegram source and for mail                                                                                     |
| 8 correctness                           | `kipory-prove`                                                                                                                                             |
| a row that needs a stored credential    | `kipory-secrets`                                                                                                                                           |
| seeding or importing the first records  | `kipory-data`                                                                                                                                              |

When the project already holds records or serves callers, read `kipory-evolve` before applying
anything that changes an existing row.
