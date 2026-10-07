<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Anatomy of a dynamic endpoint

> **Source of truth for facts:** the contract, action and input grammars, and the `api-endpoints`
> resource wire shape → live `GET /v1/openapi.json`. Which paths the platform itself occupies →
> `GET /v1/coded-routes`, the whole manifest as rows, before you pick a path. Whether a coded route
> already occupies one you have ALREADY saved → request `expand=shadowed` on the api-endpoints read,
> which returns the occupying route's method, path and group as `shadowedBy`, and in
> `partiallyShadowedBy` every coded route with a literal where your path has a parameter; the save
> refuses a collision regardless. This pack is the narrative and the judgment; the schemas are the truth.

**Read this one early.** It traces the whole life of a request, and every other capability —
schedules, events, record processing — rides the same machinery.

## What it is

You author an endpoint through the **design API**. That row declares an HTTP **contract** — method,
path, params — and an **action**: which flow to invoke, and how request fields map onto its input
slots. The endpoint is then live on the project's own host. No redeploy.

A fresh project serves **nothing**. There are no starter endpoints and no starter flows; every
route a project answers is one you authored.

## Two planes, and this is the thing that costs people the most time

- **The design plane** is where you _create and edit_ endpoints: the api host, with your API key.
- **The dynamic plane** is where the endpoint is _called_: the project's own host (`baseUrl`), by a
  signed-in end user's session (cookie or Bearer) or by an API key whose grant reaches the project.

They are different hosts. Creating an endpoint on one and calling it on the other is the normal
flow, and confusing them produces a 404 that looks like the endpoint was never made.

⭐ **Never reconstruct the call URL by hand.** `baseUrl` is the project's own origin — read it from
`GET /v1/projects/{nodeId}` or from the project's entry in `GET /v1/grant` — and every endpoint
read carries a computed, read-only `invokeUrl`: `baseUrl` plus the endpoint's path. Use them. ⚠️
`invokeUrl` is `null` on a deployment with no derivable public host (an api on a bare `localhost`;
a local api at `api.<name>.localhost` has one — the rule follows the deployment's configured
address, not the base URL a caller was handed, so read the field and never infer it), so handle
that arm rather than sending the literal: there, call the api's own base URL with the endpoint's
path and the header `x-kipory-project-slug: <slug>`. The header is read on a local or development
stack only — a production deployment never reads it.

Every read also carries a computed, read-only `access`: whether a VIEWER-level caller may make the
call, whether the method or the bound flow decided that, and which handlers in the flow write. It
is derived on each read from the same rule the write gate applies — never stored, never writable.
It also says which credential the endpoint takes: `requiresUser` is true when the bound flow —
sub-flows included — reads or writes records owned by a user, and `requiresUserBy` names the
handlers. A key acts as the project and has no user, so its call to such an endpoint is refused
`403` before the flow runs. A step counts wherever it sits in the flow, a branch a key's call
would not take included; a disabled step, and one whose failure the run continues past, do not. A
subscription to a `user`-scoped channel is `requiresUser: true` as well: a key has no such channel.

`contractConfig.responseBody` names one required output of the bound flow to send as the whole
response body. Absent, the body is an object of every output keyed by its name
(`{ "result": { … } }`); set to `result`, the body is that output's value alone, and the published
OpenAPI response is that output's schema. Only a synchronous `flow.invoke` takes it.

## The one write-shape rule people get wrong

⚠️ **The write body is the read shape minus everything the server derives.**

A flow-backed action names its flow **by id only** and carries **no signature** — the save reads
the flow's key and snapshots the signature off the live flow, so neither is a field you may send.
Both come back on every read.

**So you cannot echo a stored action config back verbatim.** Strip the signature and the flow key
first. An unknown key is refused loudly, naming the key, rather than being silently dropped — which
is the right behaviour and also means a round-trip that "should" work fails until you understand
why.

## The key you author

Every project element is addressed by its `key`, a string **you** choose rather than the row id.
Endpoints, schedules and types — with triggers, sources, eval suites and eval cases —
share one format, the **address key**, and it is checked on write:

```
letters, digits, dots, dashes, underscores
first character a letter or a digit
64 characters maximum
```

<!-- field-ok: subscriptionsList — an example of a key an operator authored, not a platform field -->

⚠️ **This is not the flow-key rule.** A flow's `key` is strict lower-case kebab (as are terms,
event types and their namespaces, relations and embedding profiles), a vocabulary's is camelCase, a
table's is a table name and a step's a dotted kebab name. Address keys are none of those, and
deliberately — camelCase endpoint keys like `subscriptionsList` are ordinary and legal here. Each
element's key has exactly one format; do not assume one from another. A key outside its format is
refused, never re-cased for you.

The reason for the charset is narrow and worth knowing: these keys end up as **one segment of a
URL**. Anything needing an escape to survive that — a slash, a space, a `{}` placeholder, a `?` or
a `#` — is refused at the write rather than mangled later.

⚠️ The endpoint key is **immutable**: a patch will not change it. Pick it as the name you will
refer to this endpoint by for its whole life.

## The contract

The path must start with `/v1/`, each segment being a literal or a single parameter, with no two
parameters adjacent. Path and query parameters can only carry string slots.

Collisions are computed on the **parameter-name-agnostic template**, so `/v1/x/{id}` and
`/v1/x/{key}` are the same path. It must not collide with a coded platform route or with a sibling
endpoint. A coded route with a parameter where yours has a literal collides too: it matches every
call yours would, and wins. A coded **literal** under your parameter does not collide — your
endpoint still answers every other value — and `expand=shadowed` lists each such route in
`partiallyShadowedBy`. You meet one on a path whose first segment is a parameter, or on an
endpoint stored before the reserved-word rule below. `GET /v1/coded-routes` lists every coded path so you can check before saving rather than
discover it in a refusal.

A coded route occupies its path on **every** host, including one where it answers 404 — a group a
project has disabled, or a management-plane group addressed on a project subdomain, is still a
registered route and still wins the match. So "it 404s here" is never a reason to author onto it.
Each row's `plane` says who a route is served to — usually its group's, but a route may declare its
own (the project file library on `/v1/files` is `management` inside a `both` group).

⚠️ **A coded route's first path word is reserved whole, and the save refuses it.** At run time the
host gate maps the first word after `/v1/` to its coded group before any endpoint is matched, so an
endpoint under one (`/v1/docs/add`, `/v1/records/…`) would never be reached — under a management
word never, under a group a project host serves only while that group is enabled. The save, its
`validateOnly` and a document plan refuse such a path as `ENDPOINT_PATH_RESERVED_WORD`, naming the
word and its group, whether or not the group is enabled. A path whose FIRST segment is a parameter
(`/v1/{kind}/…`) saves; its `validateOnly` warns `ENDPOINT_PATH_PARTLY_PREEMPTED`, because those
words never reach it. Read the first words off `GET /v1/coded-routes` — it needs a key, any role.

There is **no read-only flag to set.** Whether a VIEWER-level caller may make a call is the
platform's decision, not a declaration: an asynchronous invoke and a DELETE are writes; any other
GET is a read; anything else is a write exactly when the bound flow — sub-flows included — reaches a
step that changes data: a handler that writes, an event emitted beyond the run (it can start
triggers), or a vocabulary resolution. An asynchronous invoke cannot be saved on GET. So a
POST search whose flow only reads is open to viewers without declaring anything.

### A public endpoint: `auth: "none"`

Every endpoint needs a key or a session unless its contract says otherwise. `contractConfig.auth`
is `"required"` (the default, and what every endpoint saved without it is) or `"none"`. An endpoint
saved `auth: "none"` is **public**: anyone can call it, with nothing in `Authorization` and no
cookie. Use it for what a signed-out visitor needs — a list a landing page shows, a sign-up form, a
public search box — instead of running a server of your own that holds a key and relays the call.

What that changes:

- **No credential is read.** A key or a cookie sent with the call is ignored, not checked — a revoked
  key and a stranger's cookie change nothing. The run has **no user**, whoever called: a step that
  reads the calling user finds none, as on a key's run. To answer a signed-in caller differently,
  save a second endpoint that requires a credential.
- **The `Idempotency-Key` header is ignored.** Every public run belongs to the project, so two
  strangers sending the same key would otherwise share one write.
- **The project pays.** Each call is charged to the project's wallet, GETs included. The most public
  calls may spend per UTC day is `publicSpendCapCredits` in the project's settings
  (`PATCH /v1/projects/{nodeId}/settings`). It must be set **before** an endpoint can be saved
  public, and it cannot be cleared while one is; `0` is a real ceiling that refuses every public
  call, which makes it the switch for all of them at once.
- **A page on any site can call it.** The response allows any origin and never credentials — for
  the project's own app too. A browser call sent with credentials (`credentials: "include"`) is
  rejected by the browser, so call a public endpoint without them.
- **It has its own limits.** `contractConfig.publicRpm` is the requests per minute the endpoint takes
  from all callers together (1–600; saved as 60 when you leave it out). Each caller's address has an
  allowance per project, the project's public endpoints share a per-minute total and a ceiling on
  requests running at once (of which one address may hold only a share), and a request body may be
  at most 256 KB. None of this is shared with
  credentialed traffic: a flood of anonymous calls never refuses a key or a signed-in user.

Only a **synchronous invoke** can be public. A stream, a subscription and an asynchronous invoke
stay behind a credential, and so does a flow whose signature takes the calling user (`userInfo`).
The flow may write: that is what a sign-up form is. `validateOnly` warns `PUBLIC_ENDPOINT_WRITES`
when it does, and always warns `PUBLIC_ENDPOINT_SPENDS`, naming the model and vendor steps the flow
reaches — the same list an endpoint read carries as `spends` inside its `access`, beside `public`.

Going back to `auth: "required"` takes effect on the next request. Going public can take up to 30
seconds to be served.

⚠️ **A public endpoint is not a webhook receiver.** The contract takes path and query parameters
and a JSON body; it does not carry headers or the raw body, so a third party's signature cannot be
verified in the flow. It also answers JSON only, so it is not a link someone clicks.

## The action

Three kinds:

- **Invoke** — a buffered call. Synchronous returns the result and has a timeout ceiling;
  asynchronous returns an acknowledgement immediately.
- **Stream** — server-sent events, naming which output slot streams as deltas, with an optional
  allowlist of events to surface. Deltas come only from a `text.generate` step with structured
  output whose text field carries the same name as that slot; any other flow streams `stage`
  frames and then its `result`, with no deltas at all.
- **Subscribe** — a bus subscription over events (capability pack `events` — `GET /v1/capability-packs/events`).

**An endpoint answers JSON or server-sent events, and nothing else.** A buffered invoke answers
JSON; a stream and a subscription answer `text/event-stream`. There is no HTML response, no
redirect and no file download — hand a file out as a link from a `file.download-url` step —
see limits (capability pack `limits` — `GET /v1/capability-packs/limits`).

**A retry is made safe with an `Idempotency-Key` header.** On an asynchronous invoke a second call
with the same key gets the first call's acknowledgement and starts no second run. On a synchronous
invoke or a stream the flow runs again, and what converges is what it writes: a per-user record a
create step writes takes the same id as the first call's, and a charge already recorded for the
same step is not taken twice.

A stream may also **retry on its own output** (`retry`): after each attempt the flow's terminal
output is checked, and when the named output slot (at an optional `path`) equals `retryWhen.value`
the attempt is discarded and the flow runs again, up to `maxAttempts`. That equality is the only
comparison — there is no operator to choose, and a `retryWhen` carrying an `op` is refused (422) —
so make the retry-worthy case a slot your flow sets to a known value. `feedback` wires the last
attempt's output into the next attempt's inputs; `onExhausted` names the error a caller gets when
the last attempt still asks for a retry. Every slot it names must be in the snapshot below.

**Input mapping** binds each flow input slot to a request location: the body, a path parameter or
a query parameter. At save time the grammar is enforced — every binding must reference a declared
input slot, a path binding needs that path parameter declared and required, and every required
non-provider slot must be bound. **Provider slots cannot be bound from HTTP at all**, which is
what stops a caller claiming to be a different user.

**An action declares no output mapping, and this is deliberate.** Its response shape comes from one
place — the flow signature snapshot (below) — so there is nothing to configure on the way out.
Records are read through the `record.read` / `record.list` handlers inside a flow, so a
record-shaped response is a flow output slot like any other.

The practical consequence for an architect: **to change what an endpoint returns, change the flow
and re-save the endpoint.** There is no response mapping to edit, and no way for the published
contract to disagree with the flow it was snapshotted from.

## The snapshot, and the one way it goes stale

The bound flow's signature is **snapshotted at save**, authoritatively — there is no field for you
to supply your own copy. Saving again re-takes it. Each captured output slot is a name, its shape
and whether it is required, and every one of them is a field of the response: a flow has no output
that travels beside its result.

**Nothing else re-takes it.** If the flow's signature changes afterwards, the endpoint keeps
publishing and validating the shape it captured, and the flow's new output is rejected by the
endpoint's own contract.

**Two guards, and they are symmetric.** Both edits that could invalidate a captured shape are
refused by default with a `409` that names the holders, and both take the same opt-in to commit the
edit and re-snapshot every holder in one transaction:

- Changing a flow's **signature** while anything binds it → `FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS`.
- Editing a **shape** the flow's slots reference, where that reaches a bound snapshot →
  `TYPE_RESHAPES_BOUND_SNAPSHOTS`.

Re-send with `adoptSnapshots: true` to make the change and update the holders together. ⛔ **Do not
decompose it into unbind → change → rebind**, which is the shape a reader reaches for when they
think one side is unguarded: that leaves a live `/v1` route unbound in the middle. Two refusals to
expect on the opt-in itself: an incomplete adopt, and a SYSTEM flow whose holders live in other
projects, which cannot be adopted at all.

`expand=drift` on the endpoint read answers "did this endpoint's snapshot fall behind its flow" for
an endpoint you did not just write.

## The life of a request

1. **Host resolves to a project.** An unknown project-shaped host is a 404 — it never falls
   through to another project.
2. **Credentials.** A Bearer — an API key or a signed-in user's session token — or, with no
   `Authorization` header, the session cookie. Missing, malformed, revoked or expired is a 401. A
   key whose grant does not **reach** this project is a 403 — reach is plain descent from the granted node, and it is
   resolved per request rather than trusted from mint time.

   ⚠️ **A key has no owner whose status could refuse it**, and looking for one costs real debugging
   time. Its authority is the grant written on the row, so there is no third party to go stale;
   revoking or expiring the key is what stops it. A **session** is the opposite — its user must
   still be active, and that is rechecked on every request.

3. **Dispatch.** One catch-all matches everything under `/v1`. No match is a 404, and **a wrong
   method on a path that exists is also a 404** — method existence is not leaked. More specific
   patterns win: fewer parameters first, then more literal characters, so a literal always beats a
   parameter; a tie after that goes to the endpoint key, compared character by character. Every
   endpoint you read carries `resolutionRank`, its place in exactly that order — compare it between
   endpoints of the **same method** to see which one serves a path both match, rather than
   re-deriving the order.
4. **Write gate.** A write requires write permission. A GET is a read; a DELETE or an asynchronous
   invoke is a write; anything else is a write when its bound flow — sub-flows included — reaches a
   step that changes data (the contract section above lists which), or a step the platform cannot
   resolve. It is checked _after_ matching, so a
   bogus path still 404s rather than revealing itself as a 403.
5. **Compile the contract** — from the _snapshot_, not the live flow. The same fragments back the
   published schema, so the wire and the docs cannot disagree.
6. **Validate and assemble.** Undeclared or wrong-typed fields are refused.
7. **Run the flow.**
8. **Project the output.** The run's declared output slots are taken, **undeclared extras are
   dropped rather than leaked**, and the result is validated before it is sent.

## The errors, and what each really means

<!-- key-unreachable-ok: PATCH /v1/nodes/{nodeId}/status — named ONLY to say who reactivates an archived organisation: a signed-in admin, never a key -->

| Status  | Trigger                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **401** | No, malformed, unknown, revoked or expired token                                                                                                                                                                                                                                                                                                                                                |
| **403** | The grant does not reach this project; or a **VIEWER** principal making a call that counts as a write (step 4) — and VIEWER is what a key is minted at when no role is stated                                                                                                                                                                                                                   |
| **403** | `WORKLOAD_SUSPENDED`: the project, or an organisation above it, is suspended or archived, so every call that runs a flow is refused before its first step. A `suspended` hold is lifted only by the deployment's operator. An `archived` organisation is reactivated by one of its admins, signed in: `PATCH /v1/nodes/{nodeId}/status` with `{ "status": "active" }`, which refuses an API key |
| **403** | A step reads or writes a table owned by its users, and the call was made with a key: a key acts as the project and has no signed-in user. The flow is not at fault and no retry with the key succeeds                                                                                                                                                                                           |
| **404** | Unknown host; no match; **wrong method on a matched path**; over-long path                                                                                                                                                                                                                                                                                                                      |
| **422** | Bad, undeclared or wrong-typed body or query field — including an **undeclared query key**; or a step refusing what the caller sent — a `value.transform` `$assert` (with your message), a `cursor` no previous page answered                                                                                                                                                                   |
| **502** | A step failed; response fails validation (a required output the run did not produce is the 422 below)                                                                                                                                                                                                                                                                                           |
| **503** | `PLATFORM_DEPENDENCY_UNAVAILABLE`: a step failed because one of the platform's own vendor or model-provider accounts refused the call. The request and the flow are not at fault, nothing the run staged was written, the failed step is not charged, and `Retry-After` says when to try again                                                                                                  |
| **504** | A synchronous flow exceeding its timeout — the endpoint's `syncWaitMs`                                                                                                                                                                                                                                                                                                                          |

⭐ **How long a synchronous invoke waits is on the endpoint you read**: `syncWaitMs` is the wait the
dispatcher applies — your `syncTimeoutMs` clamped to the ceiling, or the platform default when you
set none — and `null` for an asynchronous invoke, a stream or a subscription. Compare a step's time
limit against it rather than against a default you remember.

**A public endpoint's refusals are its own.** It never answers 403, and 401 only for a request
that arrived in the instant the endpoint stopped being public: it reads no credential and judges
no role. A caller with no credential still gets **401** from every other path on the
host — a private endpoint and a path nothing serves alike — so what exists is not leaked. What a
public endpoint answers instead:

| Status  | Code                           | Meaning                                                                                                                                                                                                                                                                                                                                    |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **402** | `PUBLIC_ENDPOINT_UNAVAILABLE`  | The project's wallet or its public spend cap refused the call, or the project cannot serve it (it is suspended, or the flow reaches a step that needs a signed-in user). No `details`: the caller is nobody the project knows. The project's rejected-requests log names the money gate in `gate`; no `gate` means money did not refuse it |
| **413** | `PAYLOAD_TOO_LARGE`            | The body is over 256 KB                                                                                                                                                                                                                                                                                                                    |
| **429** | `RATE_LIMITED`                 | `scope` in its details says whose ceiling: `caller` (this address), `endpoint` (its `publicRpm`, over all callers), `project` (the project's public endpoints together)                                                                                                                                                                    |
| **429** | `PROJECT_CONCURRENCY_EXCEEDED` | `details.kind: "public"` — too many public requests are running at once                                                                                                                                                                                                                                                                    |

A run a public call started shows in `GET /v1/runs` with `source.kind: "public"` and the endpoint's
key as `targetId`, and its charges count in the usage scope `public`.

⚠️ **The undeclared query key is the notorious one.** The query schema forbids extra properties,
so an unexpected `?foo=bar` is a 422 rather than being ignored. Callers who add a tracking
parameter break.

⚠️ **A run that produced no value for a required output is refused, and writes nothing.** No
step failed, but the answer is missing, so the synchronous call answers `422 FLOW_OUTPUT_MISSING`
with a `missing` list in `details` naming the output slots (the endpoint's own response fields, never a step).
A stream ends with an `error` frame of that code, and an async invocation, schedule or trigger
ends `FAILED` with it. The decision is taken before the run's writes apply, so nothing it staged
lands. Either way, the fix is upstream: the flow's output binding, or whatever stopped the step
that feeds it from running at all.

⛔ **The error names the LAST link, and the break is often at the first.** A common cause is not the
binding but a step upstream that was SKIPPED, because the pipeline reads an absent
input as "nothing to do here" and the skip cascades to the terminal step. Preview shows you which
steps ran — **but only under the same principal.** A flow fired by a **schedule** or a **trigger**
resolves no end user, so `userInfo` is absent: a step that reads only provider slots still runs,
with no user behind it, and one that needs a person — a per-user table — refuses, while a
step that reads `userInfo` beside another slot waits on that other slot. A preview run as yourself
resolves you and reports the flow healthy. Preview such a flow with `"principal": "no-end-user"`
or you are testing a different run. See the preview section of
flows-and-skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`).

**Nothing is filled in.** A required output a clean run never produced is not replaced by
`""`, `[]`, `0` or `{}`: the call is refused, whatever the slot's type. A value the flow DID
produce is an answer, even an empty one: `""`, `[]`, `0`, `false` and `null` go back as they are.
So a flow whose honest answer can be "nothing" must produce that value: a zero-hit search whose
count step is skipped on an empty list needs a step that emits `0`. Otherwise declare the output
optional. Preview names the gap in `missingRequiredOutput`.

## A row that no longer parses, and how the list reports it

`GET /v1/api-endpoints` splits its answer in two. `apiEndpoints` holds routes whose stored
configuration still parses — those are always fully valid, so you never have to null-check a
config. `unreadable` holds the rest.

A row lands there when its stored `contractConfig` or `actionConfig` no longer parses against
the current schema — corrupt data, typically left behind by a breaking schema change to a row
written before it. **It is listed rather than dropped, and that is the point:** the key is still
taken and the traffic still 404s, so hiding it would make a broken endpoint read as a deleted
one. It cannot be shown or edited until it is re-saved.

Each entry carries `contractIssues` and `actionIssues` — **one entry per failed field**, each a
`path` and a `message`:

```json
{
  "key": "legacyExport",
  "contractIssues": [],
  "actionIssues": [
    {
      "path": "source.scope",
      "message": "Invalid enum value. Expected 'record' | 'user' | 'project', received 'currentUser'"
    }
  ]
}
```

⚠️ **An EMPTY array is an answer** — that half parsed fine. The two are never both empty: a row
in this bucket failed at least one.

⚠️ **`path` is relative to its own half**, so keep the half when you display it: a bare `method`
could be the contract's or the action's, and they are different things to go and fix. An empty
`path` is also a real answer — the configuration failed as a whole rather than at one field.

## Minting a key

Keys are minted on the **management plane** only — not on a project host — and by a **session,
not by another key**. A key cannot mint keys.

A key carries a **grant stated outright**, rather than inherited from whoever minted it: a node it
acts at, a role, and an expiry. It acts at that node and everything beneath it. The caller must hold
admin rights at that node and cannot grant a role above their own. The platform root is refused.

⚠️ **Two defaults on that grant that bite in opposite directions.** The **role** is optional and
omitting it mints a `viewer` — the least power, never the minter's — so a key minted without one
reaches the whole subtree and can write nothing, and every non-GET comes back `403`. The **expiry**
field must be present, but `null` is legal and means the key **never expires**, stopped only by
revoking it; a date must be in the future and at most 365 days out. State both deliberately: one
silently under-powers the key, the other silently makes it immortal.

**The plaintext is shown once.** Only a hash and a short prefix persist, and nothing about a grant
can be edited afterwards — revoke and mint again.

⚠️ **A seat on a project is an end-user seat, not an operator one.** An end user's membership on
their own project mints nothing; minting authority lives at the organisation above it.

⚠️ **A key is not a person.** The same key works against both the project's API host and the design
API, but it fails on per-user surfaces, and records it writes belong to the project pool rather
than to a user.

## Asking what it would publish — `validateOnly`

`POST /v1/api-endpoints` and `PATCH /v1/api-endpoints/{id}` take **`validateOnly: true`** in the
body. Each runs every rule its write runs — the key's charset, both config schemas, the shared
endpoint-config validator, the route-collision check — writes nothing, and answers **200** with a
verdict:

```json
{
  "ok": true,
  "complete": true,
  "diagnostics": [
    {
      "code": "DERIVED_SNAPSHOT",
      "severity": "warning",
      "message": "`derived` describes this draft against the project as it stands now. …"
    }
  ],
  "derived": {
    "access": {
      "viewers": false,
      "decidedBy": "flow",
      "writes": ["records.create"],
      "requiresUser": false,
      "requiresUserBy": []
    },
    "resolutionRank": 2
  }
}
```

⭐ **`derived` is why this is worth a round trip.** Both members are COMPUTED on every read of a
stored endpoint and were unanswerable before one existed — so choosing a method and a path used to
mean saving, looking, and editing again to learn who would be able to call it and which sibling
would shadow it. They are derived from your draft by the same functions a read derives them from
for a stored row. It is not the resource: there is no id and no version, because nothing was
created.

⚠️ **Both members are snapshots, and the verdict says so.** `resolutionRank` is a position among the
project's OTHER endpoints, so a sibling saved before yours moves it; `access` is re-derived from the
bound flow inside the write's own transaction. That is what the `DERIVED_SNAPSHOT` warning is for —
it is a warning, not an error, so `ok` stays true.

⛔ **The findings name the field you sent.** A config rule reports `source.categoryKey` or
`source.eventKeys[0]` because the action config is the document it reads — the verdict rewrites
those to `actionConfig.source.categoryKey`, the path in your request body; an unknown one is
`SUBSCRIBE_EVENT_UNKNOWN`. The same is true of a refused SAVE: a real POST that fails
carries the same findings on `details.issues`, so a form does not need two readers.

⭐ **Both ways an address can be taken come back the same way.** A `CONFLICT` finding on `key`
means the key is already used; a `CONFLICT` finding on `contractConfig.path` means another endpoint
already serves that method and path. Neither is an exception in the verdict — both are findings you
can put under the input that caused them. A real save answers the same two as a `409 CONFLICT`
with no `details`, told apart by the suffix of its message. And not every finding names a field:
a binding rule may carry only `code` and `message`. A real save's 422 gives every issue the one
shape every 422 uses, `{ instancePath, keyword, params, message, in }` — `in` saying whether the
issue is in the `body`, the `query` or the `path` — and a rule's issue keeps the `code` it was refused
with beside them, with its fix in `remedy` and the field in `field`; a body the request schema refuses before any rule runs has only the shape.

⚠️ **An invalid draft is not a failed request.** The dry run succeeded — it computed a verdict, and
the verdict is "no". A 4xx means the _validate request itself_ could not be served: a `PATCH` to an
id that does not exist answers **404**, not a verdict.

⚠️ **`ok: true` is a snapshot, not a promise.** On a create, the endpoint key's uniqueness is a
database constraint the write learns about by attempting it — a collision found here is certain, its
absence is not.

⭐ **A delete has the same dry run.** `DELETE /v1/api-endpoints/{id}?validateOnly=true` answers the
verdict and removes nothing. Nothing refuses an endpoint delete — an endpoint is a leaf, and the
flow it binds stays — so it answers `ok: true` for any endpoint you can address; the flag exists so
every write asks the same way.

⚠️ `validateOnly` is the delete's only query parameter; anything else in the query is refused.

⛔ **Gate on `severity`, never on `code`.** The code is a deliberately open string: a rule added
tomorrow arrives with a code your build has never heard of and a severity it has. A severity is one of three: `error` (the body will not save as it stands), `warning` (advisory, blocks nothing) and `info` (a note about something the platform left alone — a whole-project plan reports the ids it ignored this way; a row-level verdict rarely carries one).

## Checklist for an endpoint that actually works

1. The bound flow exists **and its output binding projects the declared slots.** ⚠️ An unbound
   required slot makes every call answer `422 FLOW_OUTPUT_MISSING` and write nothing. Preview
   names it in `missingRequiredOutput` before any call does.
2. The path starts with `/v1/`, has no adjacent parameters, and collides with no coded route or
   sibling.
3. Every field the flow needs is a declared parameter or body field, bound in the inputs, and
   every required non-provider slot is bound.
4. The caller's key is live — not revoked, not expired — and its grant **reaches** this project:
   the node it was granted at, or an ancestor of that node.
5. Verify with a flow **preview** first — ⛔ but pass `apply: false`, because a preview bills the
   project's payer **and applies the writes it stages** by default. The reporting-only run executes
   every step and model call and then discards the change set, readable at
   `GET /v1/runs/{runId}/change-set`. Only then make a real call.

## Related

- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the output binding, and why a save is not a promise.
- Events (capability pack `events` — `GET /v1/capability-packs/events`) — the subscribe action.
- Schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`) — the same machinery, triggered by a clock instead of a caller.

<!-- field-ok: userInfo — a run-ambient PROVIDER slot seeded by the engine, not a wire
     field a caller sends. It is deliberately absent from every request contract: binding a
     provider slot from HTTP is what would let a caller claim to be someone else. -->
