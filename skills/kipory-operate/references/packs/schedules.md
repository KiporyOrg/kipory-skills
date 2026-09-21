<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 862785fdbf4f · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Schedules

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

The time-triggered sibling of an endpoint. A schedule binds one flow, a fixed set of inputs, a
five-field cron pattern and an IANA timezone. A tick every minute fires it down the same
asynchronous path a dynamic endpoint uses.

The fire is attributed to the **project**, not to a person, and billed to the project's payer.

## When you need it — and when you don't

- **Against an endpoint:** use an endpoint when an outside caller decides _when_. Use a schedule
  when the clock decides. Because there is no caller, every input has to be fixed in advance.
- **Against a trigger:** a schedule fires on wall-clock time; a trigger (capability pack `triggers` — `GET /v1/capability-packs/triggers`) fires when
  something happens. "Every ten minutes" is a schedule. "Whenever a record of this type appears"
  is an event — model the producer to emit one and bind a trigger to it rather than polling for it
  on a timer.

Polling on a schedule what an event could tell you is the most common way to spend money on
nothing.

## The sequence

```
POST /v1/schedules                    bind flow + inputs + cron + timezone
GET  /v1/schedules/{id}/runs?limit=N  what actually fired, and what happened
POST /v1/schedules/{id}/disable       stop it
POST /v1/schedules/{id}/enable        start it, recomputing the next run from now
```

Scoped by `project`. Create takes a **key**, the flow, the inputs keyed by input slot, the cron
pattern and the timezone; optionally a display **name**, a start, an end, a maximum number of runs,
and an overlap policy of `skip` or `allow` — ⚠️ omitting the policy means `skip`, which is the one
that suppresses fires, so state it when you meant `allow`.

## The key you author

Three design objects are addressed by a string **you** choose rather than by the row id: an
endpoint's `endpoint`, a schema entry's `name`, and a schedule's `key`. All three share one charset
rule, and it is checked on write:

```
letters, digits, dots, dashes, underscores
first character a letter or a digit
64 characters maximum
```

<!-- field-ok: subscriptionsList — an example of a key an operator authored, not a platform field -->

⚠️ **This is not the flow-slug rule.** A flow's `slug` is strict lower-case kebab; these are not,
and deliberately — camelCase endpoint keys like `subscriptionsList` are ordinary and legal here.
Do not assume one rule from the other.

The reason for the charset is narrow and worth knowing: these keys end up as **one segment of a
URL**. Anything needing an escape to survive that — a slash, a space, a `{}` placeholder, a `?` or
a `#` — is refused at the write rather than mangled later.

⚠️ The schedule key is **immutable**, and the patch body has no `key` member at all — sending one
is a 422 naming the field, not a silent no-op. An address that moves is a link that breaks.

**Rename through `name`.** A schedule carries a display name beside its key, editable at any time —
the pair a flow has as `slug`+`name` and an event as `key`+`label`. On the read it is **nullable**:
`null` means nobody has named this schedule, which is true of every row created before the field
existed, and tooling should fall back to the bound flow's name there. On the create it is optional
**and nullable** — omitting it and passing `null` both mean "no name", so a client holding the
`string | null` the read gave it can post that value back without branching first. On
the patch it is a tri-state — omit it to leave the name alone, pass a string to replace it, pass
`null` to clear it back to unnamed. A blank string is a 422 rather than a clear, so emptying a name
by accident and removing one on purpose are not the same request.

The next-run time you get back is derived by the same computation the tick uses to decide what to
fire — so it is a prediction you can hold the platform to, not a display value worked out a second
way.

## When it fires — ask, do not expand the pattern

`GET /v1/schedules?project=…&expand=timing` (and the item read) answers three things per schedule,
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

⚠️ **None of the three reads `enabled`.** They are what the timing gives, which is also what enabling
it now would give; a disabled schedule fires nothing whatever they say. And the walk assumes every
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
  so there is no such thing as an optional slot here. The flow's _live_ signature is read at save
  time to check it, and **nothing is stored** — the same question is asked again at fire time,
  from the same code, so the two cannot drift apart.

  ⚠️ Coverage is **presence, not type**. A slot whose declared type changed is still "covered" by
  the old value, and nothing type-checks the input bag. A schedule can therefore keep firing a
  flow it no longer fits.

- **A schedule that could never fire is refused at the write**, not stored and quietly ignored:
  an end at or before the start, a maximum already spent, or a pattern whose next occurrence
  falls past the end. Any timing field in an update re-derives the next run — editing the start
  alone is enough to trigger it.

- **A cron pattern that is not exactly five fields is refused with a `422`.** The five, in order,
  are minute, hour, day of month, month and day of week, counted on runs of whitespace, and the
  refusal says how many fields the one you sent had. So a six-field _seconds_ pattern like
  `0 */5 * * * *` is refused, and so are a four-field pattern, a blank or whitespace-only one, and
  an `@daily`-style macro. ⚠️ **The seconds form is the one that used to bite**: the cron library
  reads six fields SECONDS-FIRST, so before the count was checked a stray token after a
  Monday-06:00 pattern stored as "minute 6 of every hour, on Tuesdays in January" — accepted, given
  a confident next-run time, and nobody the wiser.

  ⚠️ **Only a pattern the request CARRIES is counted** — on the create, and on an update whose body
  names `cronPattern`. A row stored before the rule therefore keeps firing on the pattern it has,
  and can still be enabled, disabled, renamed or re-zoned; it is refused the moment someone writes
  its pattern, which is the request where they can fix it.

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

- **`failure`** — `{ skillName, phase }`. This is the one that tells you something: it **names the
  step that failed** and the category of failure. Present only for a step-level failure.
- **`statusError`** — a short message, and ⚠️ **generic on purpose.** For an ordinary skill failure
  it is the fixed string _"The flow failed to run."_ on every run, because the raw error can carry
  provider bodies and prompt fragments and is deliberately not published. Three other shapes exist:
  a validation failure surfaces the operator-authored message verbatim, a missing record says so,
  and a flow that produced none of its declared output reports that instead.

So a schedule whose runs all read _"The flow failed to run."_ often means you are reading the wrong
field: `failure.skillName` names the step. ⛔ **But `failure` is `null` whenever the failure happened
before any step, or came out of the catch-all** — and that combination (generic message, no failure
summary) is common rather than exotic. When you hit it, take the occurrence's invocation id to
`GET /v1/runs/{runId}/steps`: that is the per-step execution record, it says which steps ran and
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

### The window says whether it is the whole history

`limit` is a **ceiling, not a page** — there is no cursor here and no way to ask for what fell
outside it. So the response carries `truncated` beside `runs`: true when older occurrences exist
beyond the window you asked for.

⛔ **Read the flag; do not infer it from how many rows came back.** A window that came back full is not
evidence of anything — a schedule holding exactly `limit` occurrences and no more fills it, and a
client comparing the count against its own `limit` then warns about older runs that do not exist.
That inference is the reason this field is here. When `truncated` is true, every figure you compute
from the returned rows — a success rate, a median duration, a spend total — is over the WINDOW rather than over
the schedule, and saying so is the difference between a recent rate and an all-time one.
(`limit` defaults to 50 and caps at 200, so the default window is narrower than most people assume.)

⛔ **And a spend total in particular: `creditCost` is `null` when no cost was recorded, which is not
a zero.** Summing nulls as zeroes reports a schedule that has been running expensively as one that
cost nothing. Count the nulls and say how many, or leave the total out.

⚠️ **Run history is kept for 30 days.** A once-a-minute schedule writes about 1,440 rows a day, so
history is deliberately bounded — do not build anything that treats it as a permanent record. A
window can therefore be complete (`truncated: false`) and still be missing everything older than the
retention edge; the flag answers for the window, not for time.

**Exhausting the bounds disables the schedule** — crossing the end date or spending the maximum
sets it disabled with no next run. ⭐ **Re-enabling an exhausted schedule is then REFUSED with a
`422` naming the spent bound**, rather than quietly granting it a new lease. Raise `maxRuns` or move
`endsAt` in a PATCH first, then enable. (Enable does recompute the next run forward from now, so a
schedule disabled across a window still fires no backlog — that is a different thing.)

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
Treat an unrecognised code as a generic finding of its stated severity.

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

## What will bite you

- **There is no owner to name.** A schedule belongs to the project. The creator is recorded as
  provenance only, read by nothing at fire time, and is empty for a token-authenticated caller.
  This is deliberate: a departed creator's account can never stop or misattribute a run.
- **Presence-not-type coverage, again**, because it is the failure that looks like nothing is
  wrong: the schedule stays green, fires on time, and hands the flow a value it can no longer
  use.

## Related

- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the flow being bound, and why its signature is locked
  while you are bound to it.
- Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`) — the caller-triggered sibling.
- Triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`) — when the trigger is something happening rather than a time.
- Events (capability pack `events` — `GET /v1/capability-packs/events`) — what a trigger listens to.
