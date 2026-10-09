<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Schedules

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

The time-triggered sibling of an endpoint. A schedule binds one flow, a fixed set of inputs, a
five-field cron pattern and an IANA timezone. A tick every minute fires it down the same
asynchronous path a dynamic endpoint uses.

The fire is attributed to the **project**, not to a person, and billed to the project's payer.

<!-- field-ok: userInfo — a run-ambient PROVIDER slot seeded by the engine, not a wire field a caller sends -->

**A fire has no end user.** `userInfo` is absent from the run. An action that reads only provider
slots still runs, with no user behind it — so a per-user table refuses there, a project-wide
one reads normally, and a `user`-scoped emit is dropped. An action that reads `userInfo` beside
another slot waits on that other slot. Carry the person you mean as an input, and preview the flow
with `"principal": "no-end-user"`, which is the run a fire makes.

## When you need it — and when you don't

- **Against an endpoint:** use an endpoint when an outside caller decides _when_. Use a schedule
  when the clock decides. Because there is no caller, every input has to be fixed in advance.
- **Against a trigger:** a schedule fires on wall-clock time; a trigger (capability pack `triggers` — `GET /v1/capability-packs/triggers`) fires when
  something happens. "Every ten minutes" is a schedule. "Whenever a record of this table appears"
  is an event — model the producer to emit one and bind a trigger to it rather than polling for it
  on a timer.

Polling on a schedule what an event could tell you is the most common way to spend money on
nothing.

## The sequence

```
POST /v1/schedules                    bind flow + inputs + cron + timezone
GET  /v1/schedules/{id}/runs?limit=N  what actually fired, and what happened (cursor-paged)
PATCH /v1/schedules/{id}            { enabled: false, version } stops it; { enabled: true, version }
                                      starts it, recomputing the next run from now
```

Scoped by `project`. Create takes a **key**, the flow, the inputs keyed by input slot, the cron
pattern and the timezone; optionally a display **label**, a start, an end, a maximum number of runs,
and an overlap policy of `skip` or `allow` — ⚠️ omitting the policy means `skip`, which is the one
that suppresses fires, so state it when you meant `allow`.

## The key you author

A schedule is addressed by its `key`, a string **you** choose rather than the row id. Schedules,
triggers, sources, endpoints, types, eval suites and eval cases share one format, the
**address key**, checked on write:

```
letters, digits, dots, dashes, underscores
first character a letter or a digit
64 characters maximum
```

It is not the flow-key rule (strict lower-case kebab): each element's key has exactly one format,
and a key outside its format is refused, never re-cased for you.
Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`) sets the formats side by side and says
why the charset is what it is.

⚠️ The schedule key is **immutable**, and the patch body has no `key` member at all — sending one
is a 422 naming the field, not a silent no-op. An address that moves is a link that breaks.

**Rename through `label`.** A schedule carries a display label beside its key, editable at any time —
the same `key`+`label` pair a flow, a trigger and a source carry. On the read it is **nullable**:
`null` means nobody has labelled this schedule; fall back to the bound flow's label there. On the
create it is optional
**and nullable** — omitting it and passing `null` both mean "no label", so a client holding the
`string | null` the read gave it can post that value back without branching first. On
the patch it is a tri-state — omit it to leave the label alone, pass a string to replace it, pass
`null` to clear it back to unnamed. A blank string is a 422 rather than a clear, so emptying a label
by accident and removing one on purpose are not the same request.

The next-run time you get back is derived by the same computation the tick uses to decide what to
fire — so it is a prediction you can hold the platform to, not a display value worked out a second
way.

## When it fires — ask, do not expand the pattern

`GET /v1/schedules?project=…&expand=timing` (and the item read) answers three things per schedule,
as fields at the top level of each schedule row — there is no `timing` object; `timing` is only the
expand word —
walked by the rule the tick advances by — each occurrence found from the one before, each spending
one of `maxRuns`, `startsAt` opening the walk and `endsAt` closing it:

- **`nextRun`** — `scheduled`, `exhausted` (run limit spent, or nothing before the end date) or
  `invalid` (timing that cannot run), with the scheduler's own `reason` when it is not scheduled.
- **`upcoming`** — the next five occurrences however far ahead, and `stoppedBy` naming what ends the
  schedule first when there are fewer.
- **`firings`** — every occurrence in a window opening at the read, `windowHours` long (default 24,
  at most 48), with `truncated` when the list is capped. This is what lays several schedules on one
  clock.

⛔ **Do not expand a cron pattern yourself to draw these.** A wall-clock expansion disagrees with the
tick on daylight-saving nights — `23 2 * * *` in `Europe/Berlin` fires ONCE on the fall-back night
and once on the spring-forward night, where reading the local clock gives two and none — and cannot
see `maxRuns` at all.

⚠️ **A disabled schedule answers `nextRun.kind: "disabled"`, with no upcoming runs or firings.**
A `validateOnly` PATCH that switches it off answers an empty `derived.upcoming` the same way.
Enabling it computes the timing afresh, from then. Its `nextRun.stop` says whether that can work:
null when it is merely paused; `exhausted` or `invalid`, with the stop in `reason`, when the
scheduler switched it off itself (its last run fired, its end date passed) — enabling that one is
refused with 422. On an enabled schedule the walk assumes every
occurrence fires — a skipped or blocked one spends no run, so a schedule near its limit can fire
later than `upcoming` ends. The walk is CPU on the platform, one cron search per occurrence, so ask
for it where you draw it and size the window to what you draw.

⚠️ **A list read spends a bounded time on timing.** It walks the project's schedules in order and stops
starting new ones once that time is spent; a schedule past it answers `nextRun`, `upcoming` and
`firings` as **`null`** together — not measured, and no statement that nothing fires. Absent means you
did not ask for `timing`. The item read (`GET /v1/schedules/{id}?expand=timing`) has no such bound, so
read the one schedule you are about to show from it when the list left it `null`.

## What the platform refuses

- **Every declared input slot must have a value.** A scheduled fire has no request to fill gaps,
  so there is no such thing as an optional slot here — and a blank is not a value: an empty
  string, `null` or an empty list is refused with a 422 `FLOW_INPUT_BLANK`, in the save and the
  `validateOnly` dry run, carrying one issue per blank slot whose `field` is its place in the body
  (`inputs.<slot>`). A missing slot is addressed the same way under
  `VALIDATION_FAILED`. The flow's _live_ signature is read at save
  time to check it, and **nothing is stored** — the same question is asked again at fire time,
  from the same code, so the two cannot drift apart.

  Coverage is presence; the TYPE is judged where inputs are stored. A value its slot's type
  refuses is refused at the schedule's save (`SCHEDULE_INPUT_MISTYPED`, one issue per slot), and
  a change that narrows the flow or a shape under it — a document plan, or a type or flow
  PATCH with `validateOnly` — reports every schedule and trigger it would leave unable to fire,
  with the same code, even when it never names them. The fire itself asks only presence, so a
  schedule stored before a change keeps firing until you patch its `inputs`.

- **A schedule that could never fire is refused at the write**, not stored and quietly ignored:
  an end at or before the start, a maximum already spent, or a pattern whose next occurrence
  falls past the end. Any timing field in an update re-derives the next run — editing the start
  alone is enough to trigger it.

- **A cron pattern that is not exactly five fields is refused with a `422`.** The five, in order,
  are minute, hour, day of month, month and day of week, counted on runs of whitespace, and the
  refusal says how many fields the one you sent had. So a six-field _seconds_ pattern like
  `0 */5 * * * *` is refused, and so are a four-field pattern, a blank or whitespace-only one, and
  an `@daily`-style macro. The pattern is counted on the create, and on an update whose body names
  `cronPattern`.

- **A pattern with no future occurrence at all is refused.** Granularity is one minute — ⚠️ and that
  comes from the TICK, not from the pattern grammar, so nothing here fires faster than once a minute
  whatever the pattern asks for. Daylight-saving transitions are handled by the underlying cron
  library's timezone support.

- **Updating, enabling and disabling all require the version you last read.** Unlike some
  resources here, it is not optional.

## What the platform guarantees

- **Exactly once per occurrence.** The claim and the advance of the next-run time happen in one
  transaction _before_ the external fire, so a crash cannot double-fire.
- **At most one catch-up.** A backlog advances to the next future occurrence; it never replays
  every missed minute. Come back from an outage and you get one run, not four hundred.
- **One bad schedule does not stall the others.**
- **No retries.** A fire refused after it was claimed — a suspended payer, a transient fault — is
  recorded as blocked with a reason, and the schedule has already advanced. That occurrence does
  not come back. Anything requiring delivery guarantees needs to be idempotent and re-driven by
  the next occurrence.

## Reading what happened

`GET /v1/schedules/{id}/runs` is the debugging surface, and there are **two** error fields on a
run's invocation. Reach for them in this order:

- **`failure`** — `{ actionName, phase, reason? }`. This is the one that tells you something: it
  **names the action that failed** and the category of failure. Present only for an action-level failure.
  `reason` is set only for a refusal a caller may read: a mail action's sender refusal, or
  `project-mail-cap-reached` past the project's daily mail cap; `statusError` then names it too.
- **`statusError`** — a short message, and ⚠️ **generic on purpose.** For an ordinary action failure
  it is the fixed string _"The flow failed to run."_ on every run, because the raw error can carry
  provider bodies and prompt fragments and is deliberately not put there. The action's own words, cut
  to 500 characters, are on its `action-failed` row in `GET /v1/runs/{runId}/timeline`. Three other shapes exist:
  a validation failure surfaces the operator-authored message verbatim, a missing record says so,
  and a flow that produced none of its declared output reports that instead.

So a schedule whose runs all read _"The flow failed to run."_ often means you are reading the wrong
field: `failure.actionName` names the action. ⛔ **But `failure` is `null` whenever the failure happened
before any action, or came out of the catch-all** — and that combination (generic message, no failure
summary) is common rather than exotic. When you hit it, take the occurrence's invocation id to
`GET /v1/runs/{runId}/timeline`: that is the per-action execution record, it says which actions ran and
what happened to each, and unlike a flow trace it is **never sampled**.

Outcomes worth telling apart:

- **fired** — it ran; read the invocation status.
- **skipped** — with an overlap policy of `skip`, the previous fire was still going.
- **blocked** — refused after claiming, with a reason. Usually a suspended or over-cap payer.

⭐ **Count `status`, not the invocation.** Every run carries `status` — `succeeded`, `failed`,
`running`, `skipped` or `blocked` — from the same function the list's `lastRunStatus` uses, so a
success rate or a day strip built from it agrees with the "Last run" column. ⚠️ A fired occurrence
whose invocation is not linked (yet, or any more) reads `running`; classifying the raw invocation
yourself tends to call that row a failure.

### The cursor says whether you hold the whole history

The runs read is **cursor-paged**, newest first: it answers `{ runs, paging: null, nextCursor,
prevCursor }`. Pass `after=<nextCursor>` for older occurrences (`before=<prevCursor>` for newer) and
keep going until `nextCursor` is `null`.

⛔ **Read the cursor; do not infer it from how many rows came back.** A page that came back full is
not evidence of anything — a schedule holding exactly `limit` occurrences and no more fills it, and
a client comparing the count against its own `limit` then warns about older runs that do not exist.
While `nextCursor` is set, every figure you compute from the rows you hold — a success rate, a
median duration, a spend total — is over those rows rather than over the schedule, and saying so is
the difference between a recent rate and an all-time one. (`limit` defaults to 50 and caps at 200,
so one page is narrower than most people assume.)

⛔ **And a spend total in particular: `creditCost` is `null` when no cost was recorded, which is not
a zero.** Summing nulls as zeroes reports a schedule that has been running expensively as one that
cost nothing. Count the nulls and say how many, or leave the total out.

⚠️ **Run history is kept for 30 days.** A once-a-minute schedule writes about 1,440 rows a day, so
history is deliberately bounded — do not build anything that treats it as a permanent record. A
walk can therefore end (`nextCursor: null`) and still be missing everything older than the
retention edge; the cursor answers for what is kept, not for time.

**Exhausting the bounds disables the schedule** — crossing the end date or spending the maximum
sets it disabled with no next run, by itself: its `version` does not move, so a `version` you held
from before still matches, and nothing tells you it happened except `enabled: false` on the next
read.

A PATCH of `{enabled: false}` clears `nextRunAt` to null and moves the version. ⭐ **Switching an
exhausted schedule back on is REFUSED with a `422` naming the spent bound**, rather than quietly
granting it a new lease. Raise `maxRuns` or move `endsAt` — in the same PATCH as `enabled: true`, or
before it. (Switching on does recompute the next run forward from now, so a schedule disabled across
a window still fires no backlog — that is a different thing.) On a retired project, a PATCH whose
only change is `enabled: false` is still accepted, so a closed project's schedules can be stopped;
every other write waits for a restore.

## Asking when it would fire — `validateOnly`

`POST /v1/schedules` and `PATCH /v1/schedules/{id}` take **`validateOnly: true`** in the body. Each
runs every rule its write runs, writes nothing, and answers **200** with a verdict and the
occurrences the draft would fire:

```json
{
  "ok": true,
  "complete": true,
  "diagnostics": [],
  "derived": {
    "upcoming": {
      "at": ["2026-08-24T06:00:00.000Z", "2026-08-31T06:00:00.000Z"],
      "stoppedBy": "its run limit"
    }
  }
}
```

⭐ **`derived.upcoming` is why this is worth a round trip.** A cron pattern is write-only — you type
it, you save it, and the first confirmation is a firing. These are the same occurrences
`expand=timing` returns for a schedule that exists, walked by the scheduler's own advance against
your draft, so the times you are shown before creating are the times you get afterwards. It is not
the resource: there is no id and no version, because nothing was created.

⭐ **On a PATCH it answers about the EFFECTIVE post-edit bounds**, which is the part no client can
compute. A patch is judged on this body mixed with the stored row — `runCount` above all. A schedule
three runs into a limit of five, patched to a limit of five, has **two** occurrences left, not five.

⚠️ **There is no `nextRun` beside it, deliberately.** This write refuses a schedule that would never
fire, so a draft that got far enough to be walked always has one ahead — a field carrying the same
answer every time is one you are entitled to mistake for something that was measured.

⚠️ **An invalid draft is not a failed request.** The dry run succeeded — it computed a verdict, and
the verdict is "no". A 4xx here means the _validate request itself_ was malformed, or that there is
nothing to validate against: a `PATCH` to an id that does not exist answers **404**, not a verdict.

⛔ **Gate on `severity`, never on `code`.** The code is a deliberately open string: a rule added to
the platform tomorrow arrives with a code your build has never heard of and a severity it has.
Treat an unrecognised code as a generic finding of its stated severity. A severity is one of three: `error` (the body will not save as it stands), `warning` (advisory, blocks nothing) and `info` (a note about something the platform left alone — a whole-project plan reports the ids it ignored this way; a row-level verdict rarely carries one).

⚠️ **`complete: false` means checking stopped early**, because an earlier finding made the later
rules unanswerable. Fix what is listed, ask again, and expect more. **A shorter list is not a
healthier draft.** `derived` is absent in that case — nothing coherent enough to walk survived.

⚠️ **`ok: true` is a snapshot, not a promise.** On a create, the key's uniqueness is a database
constraint the write learns about by attempting it — a collision found here is certain, its absence
is not. Nothing stops another write taking the key between your check and your create.

⛔ **A `PATCH` answers ONE status with TWO bodies.** A create can spend `201` on the resource and
leave `200` for the verdict; an edit has no second success code, so its `200` is a `oneOf` — the
saved schedule, or a verdict about one that was not saved. They are mutually exclusive by their
required members: narrow on `ok`, which only the verdict declares, or on `id`, which only the
schedule does.

It is a flag on the real route rather than a sibling `/preview`, deliberately. One route is one set
of rules, so a check that passes and a save that refuses cannot come apart.

A delete asks the same way: `DELETE /v1/schedules/{id}?validateOnly=true` answers whether it would
go through, writing nothing. Nothing refuses a schedule's delete, so the verdict is `ok` for any
schedule the id addresses. The flag is the delete's only query parameter; anything else in the
query is refused.

## What will bite you

- **There is no owner to name.** A schedule belongs to the project. The creator is recorded as
  provenance only, read by nothing at fire time, and is empty for a token-authenticated caller.
  This is deliberate: a departed creator's account can never stop or misattribute a run.
- **A flow that works from an endpoint can do nothing on a schedule.** The endpoint run had a
  signed-in user and the fire has none (above): a per-user table refuses and a `user`-scoped
  emit drops. A preview run as yourself resolves you and reports the flow healthy, so preview with
  `"principal": "no-end-user"`.
- **A schedule stored before a change keeps firing.** The fire asks only presence, so a value a
  later change made the wrong type still reaches the flow. The change's own rehearsal or plan
  named it (`SCHEDULE_INPUT_MISTYPED`); patch the schedule's `inputs` when it does.

## Related

- Flows & actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`) — the flow being bound, and why its signature is locked
  while you are bound to it.
- Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`) — the caller-triggered sibling.
- Triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`) — when the trigger is something happening rather than a time.
- Events (capability pack `events` — `GET /v1/capability-packs/events`) — what a trigger listens to.
