<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Anatomy of a dynamic endpoint

> **Source of truth for facts:** the endpoint and input grammars, and the `api-endpoints`
> resource wire shape → live `GET /v1/openapi.json`. Which paths the platform itself occupies →
> `GET /v1/coded-routes`, the whole manifest as rows, before you pick a path. Whether a coded route
> already occupies one you have ALREADY saved → request `expand=shadowed` on the api-endpoints read,
> which returns the occupying route's method, path and group as `shadowedBy`, and in
> `partiallyShadowedBy` every coded route with a literal where your path has a parameter; the save
> refuses a collision regardless. This pack is the narrative and the judgment; the schemas are the truth.
>
> **Format 12 names:** an invocation's status reports a refused write's table as `table` (it was `tableKey`).

**Read this one early.** It traces the whole life of a request, and every other capability —
schedules, events, record processing — rides the same machinery.

## What it is

You author an endpoint through the **design API**. That row declares an HTTP **contract** — one
method key holding the path, then its status, params and the like — and what it serves: a `flow`
it runs, a `stream`, or a `subscribe` to events, exactly one of the three, with how request fields
map onto the flow's inputs. The endpoint is then live on the project's own host. No redeploy.

```yaml
endpoints:
  join: { POST: /v1/club/members, status: 201, flow: join }
  feed: { GET: /v1/club/feed, flow: list-feed, timeoutMs: 10000 }
  digest: { POST: /v1/club/digest, flow: build-digest, async: true }
```

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
call, whether the method or the bound flow decided that, and which functions in the flow write. It
is derived on each read from the same rule the write gate applies — never stored, never writable.
It also says which credential the endpoint takes: `requiresUser` is true when the bound flow —
sub-flows included — needs a person (it reads `userInfo`, or acts for the caller on a step that
cannot act for nobody), and `requiresUserBy` names the functions. A read or change of a
person-owned table that names no person does not count: a run with no person reaches every
person's records. A key acts as the project and has no user, so its call to an endpoint that
requires one is refused `403` before the flow runs. A step counts wherever it sits in the flow, in an `if` branch a key's
call would not take too; a disabled step (`enabled: false`) does not. A
subscription to a `user`-scoped channel is `requiresUser: true` as well: a key has no such channel.

`responseBody` names one required output of the bound flow to send as the whole
response body. Absent, the body is an object of every output the flow's `return` gave, keyed by
its name (`{ "result": { … } }`); set to `result`, the body is that output's value alone, and the published
OpenAPI response is that output's schema. Only a synchronous `flow` endpoint (no `async`) takes it.

`responseType` sends that one output as text instead of JSON: `text/csv`,
`text/tab-separated-values`, `text/plain` or `text/markdown`, as
`<type>; charset=utf-8` with `X-Content-Type-Options: nosniff`, whatever the caller's `Accept`
says. It needs `responseBody` naming a required text output, on a synchronous `flow` endpoint with no
`redirect`, `statusOutput` or 204. A refusal is still the JSON error, and a text the run had to cut
at its size limit answers 502, never a broken file. The published 200 is that type with a string
schema. Build CSV with a `text.csv` step (headings, one line a row, RFC 4180 quoting, formulas
defused). For a download name, set `headers: {"Content-Disposition": "<output>"}` from an output
holding `attachment; filename="week.csv"`. One URL answers one type: a project that wants JSON and
CSV makes two endpoints.

**A field a declared type marks optional is in the answer, `null` when it has no value** — at every
depth: an optional output the `return` left out, an optional field a returned object lacks, list
items, and a query endpoint's items. The published OpenAPI document lists every field as required,
and the ones that may have no value as nullable. A field the type requires that a record leaves out
still answers 502 (mark it optional, or give it a value of its type). A type that lists no fields
(plain `object`) is sent as it is — a record returned straight from `record.read` included — so
declare an output's type with its fields, the table's own type (`outputs: { link: Link }`) or a
project type, to get them all.

## An endpoint is one flat row

An endpoint is the same flat row wherever you meet it: the project document, the row API's body and
its read, the bootstrap. Its method is the key holding its path (`POST: /v1/club`), `status`,
`auth` and the contract's other settings sit beside it, and it serves exactly one of
`flow: <flow>`, `stream: <flow>` or `subscribe: { categoryKey, scope }`, with that target's own
settings beside it: a flow's `async` and `timeoutMs`; a stream's `delta`, its `events` and its `retry`. The document names the
flow by key, the row API by id. A finding names a place in that row (`status`, `POST`,
`inputs.<name>`, `events.0`). There is one translation point between this row and how the platform
stores it, so the document, the row API and every finding agree on every name.

## The one write-shape rule people get wrong

⚠️ **The write body is the read shape minus everything the server derives.**

An endpoint names what it serves by key in a project document — `flow: join`, `stream: draft` — and
by the flow's **id** on the row API (`POST /v1/api-endpoints`), whose body is the same flat row;
`expand=flowLabel` names the flow on a read. The old nested body (`contractConfig` /
`targetConfig`) is refused as unknown keys. Everything a read computes
— `invokeUrl`, `access`, `resolutionRank`, `syncWaitMs`, `health` — is not a field you may send.

**So you cannot echo a read back verbatim.** Strip the derived fields first. An unknown key is
refused loudly, naming the key, rather than being silently dropped — which is the right behaviour
and also means a round-trip that "should" work fails until you understand why.

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
event types and their namespaces, relations and embeddings), a vocabulary's is camelCase, a
table's is a table name and a step's is camelCase. Address keys are none of those, and
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
parameters adjacent.

**A parameter states only where it is carried**: `params: { id: { in: path }, q: { in: query } }`.
Its `type` is always `string` (the value is converted to the type of the input it feeds), and its
`required`, left out, is worked out: a path parameter is required, and a query parameter is
required exactly when a required input of the flow reads it. A stated `required` is kept as written.
A read always returns the whole parameter.

**Leave `inputs` out and every input of the flow is bound by its name.** An input named like a
`{part}` of the path reads `path.<name>`; any other reads `query.<name>` on a GET or DELETE — its
query parameter is declared for it — and `body` on a POST or PATCH. So a GET endpoint at `/v1/app/tasks/{id}` over a
flow that takes `id` and `status` needs only its method, path and flow: a `{part}` of the path that
`params` leaves out, or `params` left out whole, is declared for you, a required path parameter —
on `POST /v1/api-endpoints` as in a project document. An object or list input is
left unbound where only text arrives (the path, and the query of a GET or DELETE): bind it from the
body, on a POST or PATCH.

**An endpoint bound by name stays bound by name**: a read shows `inputsByName: true` beside the
bindings worked out, and `paramsAsWritten`, the parameters as you wrote them. When you add an input
to the flow and apply again, the endpoint binds it; when you remove one, its binding and the
parameter declared for it go; a `required` you left out follows the input. A flow edit the endpoint
could not be bound after (a required object input on a GET, say) is refused, naming the endpoint.
The project document states such an endpoint as you wrote it — the marker, no `inputs`, only the
parameters you stated — so an export applies back unchanged.

On the row API a write is whole. A PATCH replaces the whole endpoint, so one that leaves `inputs` out
binds by name, replacing bindings the endpoint held as written; a project document instead keeps
the written bindings it holds. A read sent back as it came — dropping the derived fields, as for any
endpoint — is accepted with the marker, its bindings and both
sets of parameters, when those bindings and parameters are what binding by name works out from
`paramsAsWritten`: change something else and the endpoint stays bound by name. Change a binding
or a parameter beside the marker and it is refused; drop the marker to take them over.

**State `inputs` only when a name differs or a value comes from somewhere else** (a header, the raw
body, `patch`, a query value on a POST) — and then it is taken exactly as written, and stays so: an
input the map does not list is not bound, `{}` binds none, nothing is declared for it, and an input
the flow gains later is not bound until you add it. To hand such an endpoint back to the platform,
state `inputsByName: true` and no `inputs`; beside the marker, `inputs` are taken only as a read
sent back with its `paramsAsWritten`.

**Where each input comes from** is its binding's `from`:

| `from`                     | Gives the input                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `body`                     | the body's field named like the input: a JSON body's, or a form-encoded body's as text              |
| `path.<name>`              | a declared path parameter                                                                           |
| `query.<name>`, or `query` | a declared query parameter; bare `query` means the one named like the input                         |
| `header.<name>`            | a request header, its name in lower case; absent when not sent                                      |
| `rawBody`                  | the body's exact text as sent — what a webhook signs; the body may then carry fields no input binds |
| `patch`                    | one object input: the body fields its type lists that the caller sent, `null` kept as `null`        |

**`null` in a body.** An optional input sent as `null` is taken as not sent; a required one sent as
`null` answers 422. A `patch` input (one per endpoint, POST or PATCH, its type listing its fields,
every one optional) holds exactly what the caller sent: a field left out is not there, one sent as `null` is `null`.
Pass it to `record.update` as `data` — a field set to `null` is removed, one left out is kept — and
test `$exists(changes.<field>)` to act on a clear. Its fields are checked against their types, each
optional and nullable, and the published request body lists them beside the `body` inputs. A
`serialize` key part reads a `body` input, never a patch field.

A body arrives as JSON (`application/json`), text (`text/plain`) or a form
(`application/x-www-form-urlencoded`, as some webhooks send). A form's fields are text, and a field
sent more than once is a list of texts, so bind them to text inputs; `rawBody` is the form exactly as
sent, which is what its sender signs. Any other content type answers 415.

A path or query value is converted to the input's type — text, a number, an integer or
true/false — and a value that does not convert answers 422 before the flow runs: `?limit=20`
feeds an integer `limit`. So does one outside the bounds the input's type declares (`minimum`,
`maximum`, `pattern`, `enum`, `minLength`, `maxLength`, …): `?limit=0` for a `minimum: 1`. The
published parameter carries the same bounds. A header or the raw body binds a text input. `authorization`,
`cookie`, `proxy-authorization` and any `x-kipory-` header cannot be bound: a flow never sees a
credential.

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

A path segment named like a value that selects or shapes a read — `{month}`, `{page}`, `{limit}`,
`{sort}`, `{status}`, `{startDate}` — saves with an `ENDPOINT_PATH_PARAM_LOOKS_LIKE_QUERY` warning,
on `validateOnly` and in a document plan. A contract usually sends such a value in the query; keep it
in the path only when the contract puts it there (`{name}` in braces).

There is **no read-only flag to set.** Whether a VIEWER-level caller may make a call is the
platform's decision, not a declaration: an `async: true` endpoint and a DELETE are writes; any other
GET is a read; anything else is a write exactly when the bound flow — sub-flows included — reaches a
step that changes data: a function that writes, an event emitted beyond the run (it can start
triggers), or a vocabulary resolution. An `async: true` endpoint cannot be saved on GET. So a
POST search whose flow only reads is open to viewers without declaring anything.

### A public endpoint: `auth: "none"`

Every endpoint needs a key or a session unless it says otherwise. `auth`
is `required` (the default, and what every endpoint saved without it is) or `none`. An endpoint
saved `auth: "none"` is **public**: anyone can call it, with nothing in `Authorization` and no
cookie. Use it for what a signed-out visitor needs — a list a landing page shows, a sign-up form, a
public search box — instead of running a server of your own that holds a key and relays the call.

What that changes:

- **No credential is read.** A key or a cookie sent with the call is ignored, not checked — a revoked
  key and a stranger's cookie change nothing. The run has **no user**, whoever called: a step that
  reads the calling user (`userInfo`) finds none, as on a key's run, and a read of a person-owned
  table answers every person's records. To answer a signed-in caller differently,
  save a second endpoint that requires a credential.
- **The `Idempotency-Key` header is ignored.** Every public run belongs to the project, so two
  strangers sending the same key would otherwise share one write.
- **The project pays.** Each call is charged to the project's wallet, GETs included. Public
  endpoints are **unlimited by default**: nothing has to be set before one is saved. To cap what
  public calls may spend per UTC day, state it in the project document:
  `project: { credits: { publicEndpointsLimit: { credits: 500, per: day } } }`; `off` removes the
  cap, and leaving the setting out keeps whatever the project holds. `credits: 0` is a real
  ceiling that refuses every public call, which makes it the switch for all of them at once.
- **A page on any site can call it.** The response allows any origin and never credentials — for
  the project's own app too. A browser call sent with credentials (`credentials: "include"`) is
  rejected by the browser, so call a public endpoint without them.
- **It has its own limits.** `publicRpm` is the requests per minute the endpoint takes
  from all callers together (1–600; saved as 60 when you leave it out). Each caller's address has an
  allowance per project, the project's public endpoints share a per-minute total and a ceiling on
  requests running at once (of which one address may hold only a share), and a request body may be
  at most 256 KB. None of this is shared with
  credentialed traffic: a flood of anonymous calls never refuses a key or a signed-in user.

Only a **synchronous `flow`** endpoint can be public. A `stream`, a `subscribe` and an `async: true`
endpoint stay behind a credential, and so does a flow whose signature takes the calling user (`userInfo`).
The flow may write: that is what a sign-up form is. `validateOnly` warns `PUBLIC_ENDPOINT_WRITES`
when it does. It warns `PUBLIC_ENDPOINT_SPENDS` only when the flow reaches steps that call a model
or a metered vendor (the same list an endpoint read carries as `spends` inside its `access`, beside
`public`), or when the flow cannot be read; a flow that spends nothing draws no warning. The
warning names those steps, the worst day from the endpoint's own rate (at the default 60 calls a
minute, up to 86,400 paid calls a day), and what bounds the spend: the project's
`credits.publicEndpointsLimit` when one is set, otherwise only that rate and the wallet.
Making an endpoint public when its flow spends needs ADMIN, on the row API and in a document; an
editor may still make public an endpoint whose flow spends nothing.
It also warns `PUBLIC_ENDPOINT_NAMES_PERSON` when a `record.query`, `record.count`, `record.list`
or `record.aggregate` of a person-owned table takes its `userId` from the request, and
`PUBLIC_ENDPOINT_READS_PEOPLE` when the flow reads a person-owned table naming no person: either
way anyone can read everyone's records. Read a fixed person, return only what is public, or keep
such an endpoint behind a credential.

Going back to `auth: required` takes effect on the next request. Going public can take up to 30
seconds to be served.

**A public endpoint can be a webhook receiver or a link someone clicks.** Bind the signature header
and `rawBody`, and check them with `request.verify-signature` (below); answer a click with a
`redirect`. A public endpoint's own refusals — a `request.refuse`, a bad signature — reach the
caller as written, 403 included. An endpoint whose `publicRpm` you set above the project's
per-address figure lets one address make up to that many calls a minute to it, at most 120, and
hold more of the project's public calls running at once in the same proportion (at most four
fifths of them); one left unset keeps the project's figures. A refusal of the
flow's own is an answer, not a failure: it does not count against the endpoint's health or its
failed-calls alert.

## Refusing a call, and shaping the answer

**A flow refuses with the status it means** through a `request.refuse` step, inside an `if`
branch so it runs only when the call must be refused:

```yaml
- key: signedIn
  if:
    - test: { not: { has: userInfo } }
      steps:
        - key: refuseAnonymous
          function: request.refuse
          with:
            {
              status: 401,
              code: SIGN_IN_REQUIRED,
              message: { literal: "Sign in first." },
            }
```

`message` is an argument, so fixed text is a `literal`; a bare string is a path. The status is one
of 401, 403, 404, 409, 410, 413, 415, 422 or 429; `retryAfterSeconds` adds `Retry-After`. The
caller gets that status, the platform's word for it as `code` (`FORBIDDEN`, `GONE`,
`RATE_LIMITED`…), your code as `details.reason` and your message. The run fails, so nothing it
would have written is kept, and a `try` does not catch a refusal. Steps run in written order, so
put the refusal and a signature check before any costly step (an AI call, a fetch, a sub-flow): a
forged call then spends nothing.

**A `fail` step** ends the flow with your own error, `{key, fail: {code, message, status?}}`; the
caller gets `status` (any 4xx except 405, 408 and 426; 422 when left out) with the body `{code, message, details}`: the
platform's word for the status as `code` (`REQUEST_REFUSED` for one with no word of its own, such as 400 or 418), your message, your code as `details.reason` — the shape a refusal
answers. Unlike a refusal, a `try` around it catches it; use `request.refuse` when nothing may
catch it or the answer needs `Retry-After`.

**A signed webhook** is checked by `request.verify-signature`:
`{ "payload": "raw", "signature": "sig", "secret": "shop.record.data.paymentSecret" }`, with `raw`
bound to `rawBody` <!-- field-ok: rawBody — an input binding's `from` value, not a field --> and `sig` to `header.x-signature`. It compares the HMAC (sha256 hex by default,
or another hash, encoding and prefix as configured) in constant time, and a wrong or missing signature
answers 401 `SIGNATURE_INVALID` and stops the run, nothing written. On a match its value is `true`.
`onMismatch: "output"` gives the flow `false` instead of refusing; test it in an `if`. Read the record the secret is on first, so an unknown sender gets 404 before
the signature is checked. One secret for every call, such as a payment provider's, belongs in the
vault: store it as a `signing_secret` (see the secrets pack) and write
`"storedSecret": "<its name>"` in place of `secret`. It is read when the step runs and appears in no
output, trace or log. A secret written into the step (`{literal: …}`, or an expression that reads
nothing from the run) is refused at save, `ARGUMENT_SECRET_FIXED`.

**A timestamped signature** — a header such as `t=1762840800,v1=5257a8…`, the time in Unix seconds
and the signature over `<t>.<raw body>` — is checked with `"format": "timestamped"`. Any one `v1`
may match (a sender rolling its secret sends two), and a `t` more than `toleranceSeconds` (300 unless
set, at most 86400) from now, either way, is refused 401 like a mismatch, so a captured call cannot
be replayed later. It takes no `prefix`. Bind the whole header to `sig`.

**The answer's shape** (a synchronous `flow` endpoint only, not a query endpoint) — each names a flow
output, and the outputs it names are not in the body:

| On the endpoint                         | Answers                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status: 204`                           | 204, no body                                                                                                                                                                                      |
| `redirect: { "location": "url" }`       | 302 (or `status`: 301, 303, 307, 308) with `Location` set to the output: an `http(s)` address or a path starting with `/`. A GET whose flow writes (a click count) may redirect                   |
| `statusOutput: "status"`                | the status the run outputs: 200, 201, 202, 204 or 206 — 201 for a new event, 200 for a replay                                                                                                     |
| `headers: { "Cache-Control": "cache" }` | each header from its output, up to 10: Cache-Control, Content-Disposition, Content-Language, ETag, Expires, Last-Modified, Link, Retry-After, or an `X-` name (not `X-Kipory-` or `X-RateLimit-`) |

An output the answer cannot carry — a `Location` that is no address, a status outside the list, a
header value with a line break — answers 502 and nothing is written.

## What it serves

Three kinds, exactly one per endpoint:

- **`flow: <key>`** — a buffered call. Synchronous returns the result and has a timeout ceiling
  (`timeoutMs`); with `async: true` it returns an acknowledgement immediately. Its status read
  (the `statusPath` its acknowledgement names) carries `acceptedAt`, `startedAt` (when a worker last
  started it; null until one has — on the first attempt the gap is the time it waited, and the run's
  `queued` says why) and `attempt`; `output` once the run is ready and, once it has failed,
  `error`, `code` — the error code the same call made synchronously would answer (`FLOW_FAILED`,
  `RECORD_NOT_FOUND`, `QUOTA_EXHAUSTED`…), absent when none names it, with `details.flowKey` when that code is
  `FLOW_NOT_AUTHORED` (the flow that has no steps yet), as the synchronous answer carries it — and `failure` — how it failed and whose failure it was, with the same `class` and `owner`
  and `retryable` a schedule's runs carry, the `attempt` that closed it, the `cause` and `refusedWrite` when its
  changes were refused when they were saved, and a `reason` when the refusal is one a
  caller may read, such as the rule a function named (`RECORD_READ_HAS_MORE`, which a synchronous
  call answers as the `reason` in a 422's `details`), `project-push-cap-reached`, or `recipient-not-an-address` for a mail step given a
  recipient that is no email address, `more-than-one-recipient` for one given a list, or `recipient-is-a-test-user` for one given a test user's
  address, and a `limitKey` when a limit
  refused it (schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`) lists the classes and the reasons). On a failed step `error` names it
  by its key and its code — _The flow failed at step "search": timeout._ — never the function's own words. A run
  stopped from outside names, in `failure`, the clock that stopped it (`deadline`: `name` and `limitMs`) and the
  steps that were running (`runningSteps`). A
  synchronous call whose failure is the platform's own answers 503 with `Retry-After`, not 502.
  An asynchronous run the platform closed with one of its own failures is run again, up to
  3 attempts <!-- count: run-attempts --> in all: its status read answers `PENDING` with `waiting` — a `reason`, the `attempt` number and `notBefore` —
  meanwhile, and `FAILED` only if the last attempt fails the same way. One exception: when one of
  the platform's own vendor accounts is out of credit or refused the platform's key (class
  `platform-account`, `retryable: false`), the run fails at once, since a second try seconds later
  cannot differ; a throttled account is run again and waits with `reason: "platform-account"`. The
  same holds for a save that ran past its time budget (cause `timed-out`, with `budgetMs`): the
  same changes would take as long, so the run fails once and is not started again.
- **`stream: <key>`** — server-sent events, naming in `delta` which output streams as deltas (left
  out, none), with an optional allowlist of events to surface. Deltas come only from a `text.generate`
  step with structured output whose text field carries the same name as that output; any other
  flow streams `stage` frames and then its `result`, with no deltas at all.
  - **`events` is a list of `"<category>/<key>"` strings**, one per event type the stream may
    carry (`events: ["draft/section-ready"]`). A string without the `/` is refused, and so is a
    type the project's events do not register.
  - **A surfaced event reaches the client as it is emitted**, not at the end: one emitted in a
    sub-flow or in an `each` arrives while the run is still going. That is what makes a
    stream of partial results possible.
  - **Steps run in written order.** A slow step holds back every step written after it; to show a
    fast result before a slow one, put both in a `parallel` block and emit an event from each.
- **`subscribe`** — a bus subscription over events (capability pack `events` — `GET /v1/capability-packs/events`).

**An endpoint answers JSON, text of one declared type, a redirect, an empty 204 or server-sent
events.** A `flow` endpoint answers JSON, or with `responseType` CSV, TSV, plain text or Markdown; a
stream and a subscription answer `text/event-stream`. There is no HTML response and no binary file
download — hand a file out as a link from a `file.download-url` step — see limits (capability pack `limits` — `GET /v1/capability-packs/limits`).

**A retry is made safe with an `Idempotency-Key` header.** On an `async: true` endpoint a second call
with the same key gets the first call's acknowledgement and starts no second run, while the run's
history is kept (90 days unless the deployment changed it). On a synchronous
`flow` or a `stream` the flow runs again, and what converges is what it writes: a per-user record a
create step writes takes the same id as the first call's, and a charge already recorded for the
same step is not taken twice.

A stream may also **retry on its own output** (`retry`): after each attempt the flow's terminal
output is checked, and when the named output (at an optional `path`) equals `retryWhen.value`
the attempt is discarded and the flow runs again, up to `maxAttempts`. That equality is the only
comparison — there is no operator to choose, and a `retryWhen` carrying an `op` is refused (422) —
so make the retry-worthy case an output your flow's `return` sets to a known value. `feedback` wires the last
attempt's output into the next attempt's inputs; `onExhausted` names the error a caller gets when
the last attempt still asks for a retry. Every output it names must be an output of the flow.

**Calls that must not overlap take turns on a declared key** (`serialize`, synchronous `flow`
only). `"serialize": { "key": ["path.slotId"] }` names request values an input already reads —
`path.<name>`, `query.<name>`, or `body.<input>` with optional fields inside it — and every call
whose values are all equal waits, before its flow runs, for the one ahead of it, in order of
arrival; calls with other values run in parallel. So two bookings of one slot never run at once,
and each runs its flow once instead of being refused and run again. Endpoints naming the same
`line` take turns with each other (book and cancel). A call whose turn does not come within
`maxWaitMs`, or within what its own wait leaves for a run, answers 409 `SERIALIZE_KEY_BUSY` with
`Retry-After` and ran nothing. A call missing a key value is not held back. The save refuses a key
part no input reads, and a key on an `async: true` endpoint or a query endpoint. The order holds among
the calls one api process serves; correctness still rests on the save's own checks.

**Input mapping** binds each flow input to a request location: the body, a path parameter or
a query parameter. At save time the grammar is enforced — every binding must reference a declared
input, a path binding needs that path parameter declared and required, and every required input
must be bound — by name when `inputs` is left out, by the map when it is stated. **The ambient values (`userInfo` and the like) cannot be bound from HTTP at all**,
which is what stops a caller claiming to be a different user.

**An endpoint declares no output mapping, and this is deliberate.** Its response shape comes from one
place — the flow as it is now (below) — so there is nothing to configure on the way out.
Records are read through the `record.read` / `record.list` functions inside a flow, so a
record-shaped response is a flow output like any other, given by its `return`.

The practical consequence for an architect: **to change what an endpoint returns, change the
flow.** There is no response mapping to edit and nothing to re-save: the endpoint serves the flow
as it is now, so the published contract cannot disagree with it.

## The live contract, and the check that guards it

An endpoint's contract is **built from its bound flow as it is now**, on every request and in the
published schema — there is no copy to adopt and no field for you to supply your own. Each output
is a name, its type and whether it is required, and every one of them is a field of the response:
a flow has no output that travels beside its result. `GET /v1/api-endpoints/{id}?expand=contract`
answers the contract callers meet now — what they send and what they read back, every named type
written out — with its `identifier`, which changes exactly when that contract does.

**Every write that changes it is judged.** A change to the flow's inputs or outputs, to a type they
name, or to the endpoint's own settings is compared, for each endpoint and flow-backed table it
reaches, before and after the whole write, and each one whose contract differs gets a verdict:

- **Safe** — an optional input or output added, an input made optional, an output made required,
  a limit loosened. It saves for anyone who may make the edit.
- **Breaking** — a required input added, an input or output removed, a value kind changed, an
  input limit tightened, an output that may now be absent or `null`. It is refused, writing
  nothing, unless every breaking endpoint and table is named by key in the same write's
  `acceptBreaks: { endpoints: [...], tables: [...] }`, and only an admin of the project may send
  that: below it, `403 CONTRACT_BREAK_FORBIDDEN` whatever `acceptBreaks` names (a name that is no
  endpoint or table is refused `422` before the role is asked); an admin who did
  not name a row, `409 CONTRACT_BREAK_NOT_ACCEPTED`, with a fix that sets `acceptBreaks`.

A label edit (a title, a description, examples, field order, `x-record-ref`) is no change and
gets no verdict. Every dry run (`validateOnly`, a document plan), every successful write and both
refusals answer the report as `contractChanges`: one row per endpoint or table, its `verdict`,
each change (its side, path, before and after, rule and message) and `mustAccept`; a table's row
also carries `consequences`, what the change does to its stored records
(Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`)). No run closes because a table fell out of step with its
flow: a table's processed fields are its flow's outputs as the flow is now. Read it before
you accept: every caller of an accepted endpoint meets the change at once. ⛔ **Do not decompose a
change into unbind → change → rebind** to get round the check: the unbind is judged itself — a
table loses every processed field, an endpoint every flow input and output — so it needs the same
acceptance, and a live `/v1` route sits unbound in the middle.

**A setting that names what the write removes is a validation error, never a break.** When a flow
or type edit leaves an endpoint's own settings naming something gone — a binding whose input was
removed, a `responseBody` or `retry` naming an output gone, a public endpoint whose flow now takes
the calling user — the write is refused `422 VALIDATION_FAILED`, an issue per setting naming the
endpoint, exactly as the endpoint's own save would refuse it. `acceptBreaks` does not waive it:
change the endpoint first, or change the edit. A setting that was already wrong before the write
is not the write's doing and does not refuse it.

**Each endpoint keeps its contract history.** `GET /v1/api-endpoints/{id}/contract-history` reads
it newest first, paged with `after` (older) and `before` (newer): the entry it started with
(`created`, `bound` or `first`, carrying that whole contract), then one `write` entry for each saved
change that gave its callers a different contract — its verdict, each change, who made it and who
accepted a break — an `unbound` entry, judged the same way, for the write that takes it off its
flow, a `release` entry for each platform release that changed it, and an `ability` entry for each
change the platform made to a platform function whose type the contract holds (judged as a release
is: a break nobody ruled is never made). A query endpoint's history
holds the query's side too: a query, selection, table, relation or step edit that changes what its
callers send or read is such a `write`, with the verdict and who accepted a break. A label edit adds no entry of
its own; like any saved change, it first gives an endpoint with no history its `first`, and records a
`release` where the endpoint's contract had already moved since its last entry without a save that
judged it. Read it to answer "what changed for my callers, and when"; to see what a write is about
to change, send it with `validateOnly: true`.

## A query endpoint: the contract comes from the query

<!-- field-ok: readAfter — a flow input a project names, after its `record.query` step `read` -->
<!-- field-ok: readBefore — a flow input a project names, after its `record.query` step `read` -->
<!-- field-ok: readLimit — a flow input a project names, after its `record.query` step `read` -->

A `GET`, synchronous `flow` endpoint whose response body (`responseBody`, or the flow's only output)
is the value of a `record.query` step reading a named query (`with: { query: note.mine }` — a step
always names it as `<table>.<key>`), returned unchanged, is a **query endpoint**. Declare no
params and no bindings for it: they come from the query as it is now. Nothing of the query is
stored on the endpoint, so a query, selection or table edit reaches the next request with no
endpoint save;
`GET /v1/api-endpoints/{id}?expand=contract` reads what callers meet now.

- **Request**: the query's params, typed and bounded as the query declares them, plus the three
  paging names — `after` to page on, `before` to page back, and `limit` (1 to the query's
  `pageSize.max`). A param binds the flow input of the same name; the paging names bind the
  `record.query` step's own paging inputs, named after the step — for the step `read`,
  `readAfter`, `readBefore` and `readLimit`. So the flow declares an input per param it exposes
  and per paging input; a path parameter of the same name feeds a param instead. An unknown key, a value of the wrong type or out of
  bounds is `422 VALIDATION_FAILED`. A flow input typed otherwise than the query gives it is refused
  at save, `QUERY_INPUT_TYPE`; a flow that declares none of the step's paging inputs is warned
  `QUERY_PAGING_NOT_DECLARED`, since its endpoint would answer only the first page.
- **Answer**: `{items, nextCursor, prevCursor, paging: null}`; a query that ranks by meaning takes
  no cursor and answers both `null`. A `one: true` query answers the record itself, or `404
NOT_FOUND` whether it does not exist or the caller may not read it. A cursor from another query,
  person or params is `400 QUERY_CURSOR_INVALID`.
- **Not a query endpoint**: an `async: true` one, or one whose contract declares any of the three
  paging names itself. It keeps its declared contract, and the plan warns
  `QUERY_ENDPOINT_NOT_DERIVED`.
- **Revalidation**: when the flow is that one `record.query` and every input comes from the request,
  and the query reads only fields and links (no term, stream or meaning clause, no vocabulary, no
  file), and its item is typed, the answer carries an `ETag`.
  Send it back as `If-None-Match`: while nothing the answer depends on changed — the records and
  links of every table the query reads, the caller, and every query and path value of the request,
  an input you bound by hand too — the answer is `304` with no body, no run and no charge. The
  `ETag` also stops matching when the endpoint's contract changes, or the flow (any step edit),
  a query or selection it reads, a table it reaches or a relation its linked reads go through is
  edited, or the endpoint is saved. An edit anywhere else in the project leaves it standing. Every
  query-endpoint answer carries `Vary: Authorization, Cookie, Accept`; a `200` or a `304` also carries
  `Cache-Control: private, no-cache` and the `ETag`, and a refusal carries neither.
- **Live**: a query endpoint that answers an `ETag` also streams. Send the same `GET` with
  `Accept: text/event-stream` — preferred over JSON: `application/json, text/event-stream` gets the
  `200` — and the answer is a stream: a `page` frame with what the `200` would answer, then a new
  `page` frame each time that answer changes — with no refetch and no `event.emit` in the flows
  that write. Callers asking the same — the same query and path values, as the project (every API
  key of it) or as the same person — share one read of the query per change: a change costs one run
  for the project's keys together and one per person watching, however many streams each has
  open. Two people watching are two reads. Each read is charged like the `200` (to the newest of those callers), takes one of the
  project's running requests and counts against its requests per minute; a busy project's reads
  wait their turn rather than fail. Each stream's first page is its own run, so a refusal (a `one`
  query with no record, a wallet refusal, a suspended project) answers before the stream opens, as
  the `200` would. A page arrives about a tenth of a second after a run that changed it settles,
  and within about a second after any other write; a joiner may get its first page twice. A frame
  reflects the newest answer; a client that reads slowly gets the newest page, not every one in
  between. How a stream ends: an edit that changes what the endpoint reads closes it with `close` reason
  `lifetime` — reconnect **with jitter**, and the stream reads the new contract; a later refusal
  (the record gone, the wallet empty) ends it with an `error` frame carrying the refusal's `code` —
  do not reconnect blindly, a reconnect is answered the same refusal as JSON; a run that fails is
  retried quietly, the last page standing. A key revoked while its stream is open keeps it until
  the stream's lifetime (10–12 minutes). Streams count against the project's open streams
  (`endpoints.streams-at-once`). A public endpoint (`auth: "none"`) does not stream: it answers the
  `200`. `GET /v1/openapi.json` publishes the stream's frames as the operation's
  `text/event-stream` answer.
- **An edit that changes what a query endpoint's callers meet is judged like any contract change.**
  A query or selection edit in a document, a table or type edit that changes the rows the query answers,
  a relation edit its linked reads go through, a step edit that points the answering
  step at another query: each lists the endpoint in `contractChanges` (the plan's, the write's
  answer). Adding a field or a param, or widening a bound, is `safe` and saves unasked. Removing a
  field the item answers, narrowing `limit`, retyping a param or turning a list into `one` is
  `breaking`: the write is refused `409 CONTRACT_BREAK_NOT_ACCEPTED` until `acceptBreaks` names the
  endpoint, which only an admin of the project may send. The endpoint itself is not written and its
  `version` does not move.

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
4. **Write gate.** A write requires write permission. A GET is a read; a DELETE or an `async: true`
   endpoint is a write; anything else is a write when its bound flow — sub-flows included — reaches a
   step that changes data (the contract section above lists which), or a function the platform cannot
   resolve. It is checked _after_ matching, so a
   bogus path still 404s rather than revealing itself as a 403.
5. **Compile the contract** — from the flow as it is now, once per change to the project, not per
   request. The same fragments back the published schema, so the wire and the docs cannot disagree.
6. **Validate and assemble.** Undeclared or wrong-typed fields are refused.
7. **Run the flow.**
8. **Project the output.** The outputs the flow's `return` gave are taken, **undeclared extras are
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
| **422** | Bad, undeclared or wrong-typed body or query field — including an **undeclared query key**; or a `fail` step that names no other `status` (with your code and message), or a step refusing what the caller sent — a `value.transform` `$assert` (with your message), a `cursor` no previous page answered                                                                                       |
| **429** | `RATE_LIMITED` with `details.scope: "project"`: a step is over the project's own rate limit for its function (`details.limitKey` `functions.<bucket>.calls-per-window`, such as 300 meaning searches a minute). The step waited its turn first; nothing the run staged was written, and `Retry-After` says when the limit frees                                                                 |
| **502** | A step failed; response fails validation. A `return` that gives nothing for a required output fails `OUTPUT_TYPE_MISMATCH`: 502 `FLOW_FAILED`, whose `details` carry that code as its reason and the output as its path. A field read off a record is left out when it has no value, so a response type that requires it fails: mark it optional, or give it a value of its type (`x ?? ""`)    |
| **503** | `PLATFORM_DEPENDENCY_UNAVAILABLE`: the platform's own failure — one of its vendor or model-provider accounts refused a step's call, the engine itself failed, or the database refused the run's changes. The request and the flow are not at fault, nothing the run staged was written, a failed step is not charged, and `Retry-After` says when to try again                                  |
| **503** | `TEMPORARILY_UNAVAILABLE`: the platform's database could not serve in time. It is not a verdict on the credential — keep the session or key. Retry a read after `Retry-After`, backing off if it repeats; a write may already have landed, so retry it only if repeating it is safe or you have checked its result                                                                              |
| **504** | A synchronous flow exceeding its timeout — the endpoint's `syncWaitMs`                                                                                                                                                                                                                                                                                                                          |

⭐ **How long a synchronous `flow` waits is on the endpoint you read**: `syncWaitMs` is the wait the
dispatcher applies — your `timeoutMs` clamped to the ceiling, or the platform default when you
set none — and `null` for an `async: true` endpoint, a `stream` or a `subscribe`. Compare a step's `timeoutMs`
against it rather than against a default you remember.

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

⚠️ **A run that produced no value for a required output is refused, and writes nothing.** In the
common case the `return` itself fails `OUTPUT_TYPE_MISMATCH`, which a synchronous call answers
`502 FLOW_FAILED`, whose `details` carry that code as its reason and the output as its path. A run that still
leaves a required output without a value is caught by a backstop before its writes apply:
`422 FLOW_OUTPUT_MISSING`, with a `missing` list in `details` naming the outputs (the endpoint's own
response fields, never a step). A stream ends with an `error` frame of that code, and an async
invocation, schedule or trigger ends `FAILED` with it. Either way nothing the run staged lands. The save proves most of this
first: a path with no `return` is `FLOW_PATH_HAS_NO_END`, and a `return` of a required output that
may be nothing is `FLOW_OUTPUT_MAY_BE_NOTHING`, each with a ready fix.

⛔ **Test under the caller's principal.** A flow fired by a **schedule** or a **trigger** resolves
no end user, so `userInfo` is absent: a step that needs a person refuses, and a read of a
person-owned table reaches every person's records. The
save already refuses a required read of `userInfo` that no `if` with `{has: userInfo}` guards
(`STEP_INPUT_MAY_BE_ABSENT`). A preview run as yourself resolves you; preview such a flow with
`"principal": "no-end-user"` or you are testing a different run. See the preview section of
flows-and-actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`).

**Nothing is filled in by the flow.** A `return` leaves out every output that is nothing, `null`
included, and a required one left out is refused as above, whatever its type; the endpoint then
answers an optional one left out as `null`. A value that is empty is an answer:
`""`, `[]`, `0` and `false` go back as they are. So a flow whose honest answer can be "nothing"
returns a value for it (`{path: count.total, default: {literal: 0}}`) or declares the output
optional. Preview names the gap in `missingRequiredOutput`.

## A row that no longer parses, and how the list reports it

`GET /v1/api-endpoints` splits its answer in two. `apiEndpoints` holds routes whose stored
configuration still parses — those are always fully valid, so you never have to null-check a
config. `unreadable` holds the rest.

A row lands there when its stored configuration no longer parses against
the current schema — corrupt data, typically left behind by a breaking schema change to a row
written before it. **It is listed rather than dropped, and that is the point:** the key is still
taken and the traffic still 404s, so hiding it would make a broken endpoint read as a deleted
one. It cannot be shown until it is re-saved: a whole flat write (`PATCH` with its `version`)
repairs it, a `DELETE` removes it, and a project document can restate it or remove it with
`delete: true`. Each `issues` entry names its place in the flat row.

One kind of unreadable row also stops a design write: a row that still carries a stored copy of
its flow's signature, saved by an older platform version. A flow edit,
type edit, rename or document apply that reaches such an endpoint answers 409 `CONFLICT` with
`details.reason: "endpoint-unreadable"` and the endpoint keys in the `endpoints` list of `details`, and writes
nothing, because what it would change for that endpoint's callers cannot be checked. Re-save each
named endpoint (`PATCH /v1/api-endpoints/{id}` with its `version` and the whole endpoint), then send the
write again. A row unreadable for any other reason does not block a write that reaches it.

Each entry carries one `issues` array — **one entry per failed field**, each a `path` and a
`message` — at the flat path you would write: the method key, `status`, `inputs.<name>`,
`subscribe.categoryKey`, `events.0`:

```json
{
  "key": "legacyExport",
  "issues": [
    {
      "path": "subscribe.scope",
      "message": "Invalid enum value. Expected 'record' | 'user' | 'project', received 'currentUser'"
    }
  ]
}
```

⚠️ **`issues` is never empty** — a row in this bucket failed at least one field. An empty `path`
is a real answer — the configuration failed as a whole rather than at one field.

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
body. Each runs every rule its write runs — the key's charset, the endpoint schema, the shared
endpoint validator, the route-collision check — writes nothing, and answers **200** with a
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

⛔ **The findings name the field you sent**, flat: `status`, the method key, `inputs.<name>`,
`subscribe.categoryKey`, `subscribe.eventKeys[0]`, `events.0` — the path in your request body; an
unknown event is `SUBSCRIBE_EVENT_UNKNOWN`. The same is true of a refused SAVE: a real POST that fails
carries the same findings on `details.issues`, so a form does not need two readers.

⭐ **Both ways an address can be taken come back the same way.** A `CONFLICT` finding on `key`
means the key is already used; a `CONFLICT` finding on the method key (`GET`, `POST`, …) means another endpoint
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

## Its health

`GET /v1/api-endpoints` and `GET /v1/api-endpoints/{id}` carry `health` on each endpoint: how its
**asynchronous** calls went — `healthy` or `failing`, with `failingSince` and `countedFailures`.
A synchronous call is not counted: its caller already has the answer. An endpoint is never
paused (`pauseArmed` is always `false`). Triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`) says how a project is told when
an asynchronous call fails for good.

## Checklist for an endpoint that actually works

1. The bound flow exists **and every path through it ends in a `return` giving each required
   output.** The save proves it; a `return` that still gives a required output nothing fails
   `502 FLOW_FAILED` (`OUTPUT_TYPE_MISMATCH`), with `422 FLOW_OUTPUT_MISSING` only as a backstop,
   and writes nothing. Preview names it in `missingRequiredOutput`.
2. The path starts with `/v1/`, has no adjacent parameters, and collides with no coded route or
   sibling.
3. Every field the flow needs is a declared parameter or body field, bound in the inputs, and
   every required input is bound.
4. The caller's key is live — not revoked, not expired — and its grant **reaches** this project:
   the node it was granted at, or an ancestor of that node.
5. Verify with a flow **preview** first — ⛔ but pass `apply: false`, because a preview bills the
   project's payer **and applies the writes it stages** by default. The reporting-only run executes
   every step and model call and then discards the change set, readable at
   `GET /v1/runs/{runId}/change-set`. Only then make a real call.

## Related

- Flows & steps (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`) — steps, `return` and `fail`, and what the save proves.
- Events (capability pack `events` — `GET /v1/capability-packs/events`) — subscriptions.
- Schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`) — the same machinery, triggered by a clock instead of a caller.

<!-- field-ok: userInfo — an ambient value the engine fills, not a wire field a caller
     sends. It is deliberately absent from every request contract: binding it from HTTP is
     what would let a caller claim to be someone else. -->
