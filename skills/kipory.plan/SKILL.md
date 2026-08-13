---
name: kipory.plan
description: Turn a product idea into a Kipory build sheet — every record type, flow, endpoint, schedule and test that will exist, each marked buildable-as-configuration or needs-software-written. Use before authoring anything, when the user describes what they want to build rather than which endpoint to call.
---

# Plan a Kipory project

**This skill is a pointer, not a copy.** The protocol is served by the deployment you are building
on, and that is where it must stay — a second copy here is a second thing to drift, and it would
drift toward whichever deployment happened to be in front of the person who wrote it.

## Run it

1. **Fetch the protocol** — `GET /v1/capability-packs/planning-protocol`. It carries the eight-step
   walk, the four rules, and the build-sheet shape.
2. **Fetch `GET /v1/capability-packs/limits` before decomposing step 3.** It is short, and it is the
   difference between a plan that can be built and one that dead-ends after three days of work.
3. **Fetch the pack each step points at, when you reach that step** — not all of them up front.
4. **Confirm every fact live** — `GET /v1/handlers` for handler keys, `GET /v1/openapi.json` for
   routes and shapes. This is Rule 0 and it is not optional.
5. **Emit the build sheet, then stop.**

## What this skill adds to the protocol

Three things the protocol assumes and does not say, because they only bite an agent:

**Read the whole handler catalog before step 3, not a filtered view.** A keyword search encodes what
you already believe. The catalog's job is to show you what you did not think to ask for — the first
recorded run of this protocol searched for the words it expected and missed a handler that would
have collapsed two `code` rows into one `seed` row.

**A `code` row is a finding, not a failure.** The count of them is the number that makes the plan
real, so surface it rather than designing around it to keep the sheet tidy. A plan with four honest
`code` rows is worth more than one with zero and a hidden assumption.

**Nothing executes a build sheet.** There is no plan runner and no privileged path — executing a
plan is ordinary design-API use, the same calls a person makes by hand. Do not go looking for an
endpoint that takes a plan.

## What will bite you

- **Emitting the sheet and continuing straight into building it.** The sheet exists to be rejected
  cheaply. Nothing on the platform stores it, so a rejected plan costs nothing — but only if you
  stopped and let it be read.
- **Skipping step 8 because the project is small.** The assertions are the only part of a plan that
  survives a later rewrite.
- **Recording an empty step by omitting it.** An omitted step and a forgotten one look identical to
  the reader, and the reader is the person you need to catch your mistake. Write "none, because…".

## Then

`kipory.model` for steps 2 and 5, `kipory.build` for step 3, `kipory.expose` for step 4,
`kipory.operate` for steps 6 and 7, `kipory.prove` for step 8.
