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
POST  /v1/flows              create with its signature — starts INACTIVE
POST  /v1/skills             add nodes (also /v1/skills/batch and /v1/skills/replace)
PATCH /v1/flows/{id}         bind the output slots  ← without this it returns nothing
POST  /v1/flows/{id}/preview run against real inputs and read the transcript
```

## What will bite you

- **A save succeeding is not a promise it will run.** Saves return 2xx with an `outstandingIssues`
  array; only _blocking_ problems refuse the write, and activation is stricter than authoring. Read
  `outstandingIssues` on every save — treating a 201 as "done" is the most common way a flow reaches
  preview broken.
- **An unbound output is the single most common cause of a dead endpoint.** The flow runs, the
  transcript looks right, and every call through an endpoint is a 502. Bind the slots.
- **Preview costs money.** It avoids _side effects_, not spend: it resolves the payer, refuses a
  suspended one, and charges provider work. Budget for iteration; do not treat it as a free dry run.
- **Checkpoint before a risky edit, not after.** Capture is cheap, and `restore-preview` tells you
  what a rollback would change before you commit to it. Reads never return the payload, so the
  preview is the only way to see inside one.
- **`/v1/skills/replace` replaces the whole node set.** Reach for it deliberately; when you meant to
  change one node, patch that node.

## If a facet sent you here

A facet's resolver is an ordinary flow. Build it, then go back and patch the facet to bind
`resolverFlowId` — the facet is inert until you do, and it fails silently rather than loudly.

## Then

`kipory.expose` to put it on HTTP, `kipory.prove` to pin what "working" means before you edit it
again.
