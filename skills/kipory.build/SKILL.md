---
name: kipory.build
description: Build or edit a Kipory flow — add, replace and reorder skills over the handler catalog, bind the output so it actually returns something, and preview against real inputs. Use when implementing the processing a plan called for, or changing a flow that already exists.
---

# Build a Kipory flow

Flows are the main build target and the place most time is spent. Fetch
`GET /v1/capability-packs/flows-and-skills` for the capability judgment, and
`GET /v1/capability-packs/flow-checkpoints` before any edit you would not want to undo by hand.

## Before the first call

**Read the whole handler catalog** — `GET /v1/handlers` — not a filtered view. A keyword search
returns what you already believed existed; the catalog's job is to show you what you did not think
to ask for.

**Confirm every handler key live.** A key you remember is not admissible. A snapshot of this catalog
once went on naming a handler after the deployment had merged it into another, and the flow built on
it burned real calls before anyone noticed.

## The sequence

```
POST  /v1/flows              create with its signature
POST  /v1/skills             add nodes (also /v1/skills/batch and /v1/skills/replace)
PATCH /v1/flows/{id}         bind the output slots  ← without this it returns nothing
POST  /v1/flows/{id}/preview run against real inputs and read the transcript
```

## What will bite you

- **A save succeeding is not a promise it will run.** ⚠️ And the diagnostics are not where you would
  look for them: **skill** writes (`/v1/skills`, `/v1/skills/batch`, `/v1/skills/replace`) return
  2xx with an `outstandingIssues` array, while **flow** writes — `POST /v1/flows` and
  `PATCH /v1/flows/{id}`, both of which this sequence tells you to make — carry no diagnostics at
  all. For the whole-flow verdict ask `GET /v1/flows/{id}/health`. Treating a 201 as "done" is the
  most common way a flow reaches preview broken.
- ⛔ **A flow that saved with problems still runs.** Only a _skill_-level error refuses a write;
  edge- and flow-level errors save cleanly, by design, so you can leave a graph half-wired between
  edits. Nothing re-checks the graph at run time. So a flow with known blocking issues will execute,
  and it will leave a trace you can read — which is usually the fastest way to see what the
  diagnostic was predicting.
- **An unbound output is a common cause of a dead endpoint, and it does not always announce itself.**
  Depending on the slot's type the call either 502s or returns **200 with an empty value** — `[]`,
  `{}`, `""`, `0` — because the invoke path fills an unproduced required slot with its type's empty
  value. Preview does not: check `missingRequiredOutput` in the preview response, which is non-null
  exactly when a live call would come back wrong. Bind the slots.
- ⛔ **Preview costs money AND writes.** It is not a dry run in either sense. It resolves the payer,
  refuses a suspended one, charges provider work — and `apply` defaults to true, so the records it
  stages are really written. Pass `apply: false` to run it in full and throw the change set away.
- **Checkpoint before a risky edit, not after.** Capture is cheap, and `restore-preview` tells you
  what a rollback would change before you commit to it. Reads never return the payload, so the
  preview is the only way to see inside one.
- **`/v1/skills/replace` replaces the whole node set.** Reach for it deliberately; when you meant to
  change one node, patch that node.

## If a facet sent you here

⚠️ **First check you need a flow at all — usually you do not.** A facet whose `matching` is
`exact` needs no resolver. A `semantic` one created _without_ naming a `resolverFlowId` is bound to
a platform default resolver at creation and works as authored; only an explicit `null` births it
unbound. Author your own resolver when the default is not what you want, then patch
`resolverFlowId` onto the facet.

And an unbound semantic facet is not silent: it reads `blocked` with the reason `RESOLVER_UNBOUND`,
and resolving it throws at ingest.

## Then

`kipory.expose` to put it on HTTP, `kipory.prove` to pin what "working" means before you edit it
again. `kipory.secrets` if a handler reported a missing API key — the fix is a stored credential,
not a flow edit.
