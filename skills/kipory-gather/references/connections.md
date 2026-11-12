# Your own API as functions: a connection

<!-- field-ok: operationId — an OpenAPI document's own field, read from the customer's document, not a request field -->
<!-- field-ok: flowCount — a field of a 409's `details.dependents`, which error details carry untyped, not a request field -->

An API with an OpenAPI document — or an MCP server's link — becomes a set of functions your
organization's projects can use as steps — one per operation (or tool), each one that reads and
each one that sends. That is a **connection**. It is made once, at the
organization, from the document's link and a credential; every project under the organization can
then use its functions like any other source.

## What a connection can do

- **It reads.** Each `GET` (or `HEAD`) operation the import can serve becomes a function.
- **It sends.** An operation that sends something — `POST`, `PUT`, `PATCH`, `DELETE` — becomes a
  function too, one that sends once the run is saved (below, "Sends"). An operation whose method
  sends but which only reads — a search sent as a `POST` — is a read when you name it in `reads` at
  connect.
- **It calls one host, over https.** The host is the document's first `servers` entry (a relative one
  is read against the document's own link). Another server on another host is never called; an
  operation that names its own server elsewhere is not served. A first server on plain `http` is
  refused (422, naming the host): your key goes over https only.
- **It runs on your organization's key, always.** The key you give at connect is kept in the
  organization's vault and is the only key the connection's functions send. Not a project's key under
  the same name, never Kipory's: without your key a step fails, it never falls through to anyone
  else's account. The API bills your account; Kipory charges only the step's compute.
- **OpenAPI 3.0 and 3.1, JSON or YAML.** A Swagger 2.0 document is refused ("convert it to OpenAPI
  3.0 or 3.1"). A document is at most 5 MB, measured again once read (a YAML alias is refused). A
  connection serves at most 200 operations: more is a 422 naming the count — choose fewer with
  `operations`, or narrow the document with `include` (`{ "tags": […] }` or `{ "paths": […] }`, kept
  on the connection and used on every later read). An organization holds at most 20 connections,
  and all of them together make at most 600 requests a minute (each connection 60) — the test calls
  too: one over the minute's share waits up to 10 seconds, then fails as its test.

## Connect

```
POST /v1/nodes/{nodeId}/connections
{
  "slug": "parcel-desk",
  "sourceKind": "openapi",
  "sourceUrl": "https://api.parceldesk.example/openapi.json",
  "credential": { "kind": "api-key", "key": "…" },
  "operations": ["list-parcels", "GET /parcels/{id}"],   // optional: absent, every one served
  "reads": ["POST /parcels/search"],                       // optional: these only read, whatever their method
  "validateOnly": true                                     // optional: preview, nothing written
}
```

- **Only an organization admin** (or an API key granted at the organization) connects, changes or
  deletes a connection. Anyone working in a project under it may read it (`GET`).
- **Preview first.** `validateOnly: true` reads the document and answers each operation — served or
  not, and why — the hosts and the types it would carry, with no call made and nothing written.
- **The credential** is `api-key` (where it goes is read from the document's security scheme, or
  give `in: "header" | "query"` and `name`), `bearer` (`token`) or `basic` (`username`,
  `password`). It is never shown again.
- **`reads`** names operations (by name, as `"POST /path"`, or by the document's `operationId`) whose method sends but which only
  read: each is tested and served as a read, and stays one on every later read of the document. A
  name the document does not have is a 422.
- **A function that sends is never called at connect.** Its test is its shape alone — its request
  is checked, nothing is sent to your API — and it is shown when that passes. A shape check is no
  test of your key: when every operation you choose sends, the connection is stored with
  `keyProven: false` ("key not yet proven"). The first send your API answers proves the key; a
  key your API refuses on a send (401, 403) raises your organization's "sends failing" alert.
- **One test call per reading operation**, on your key, at connect. One that answers makes its
  function **shown**, and its answer becomes the function's example. A parameter's own `example`
  (or a `default`) is what the test call asks it. One that fails leaves its
  function **hidden**, with the reason on the operation — often a required parameter the document
  gives no example or default for. Fix the cause, then `PATCH /v1/nodes/{nodeId}/connections/{slug}/abilities/{operation}`
  `{ "status": "shown", "version": … }`, which tests it again first and keeps that call as the
  function's example (an untyped answer gives it its type). If every test call fails — a wrong key,
  say — nothing is stored and the answer is a 424 naming each failure, however many sending
  functions passed their shape check.
- **A link to a private address is refused** (422, naming the host): loopback, a private network,
  link-local or cloud metadata addresses — at connect and on every call after. A link that
  redirects is refused too (422): give the link it redirects to.

The answer (201) is the connection: its `operations` (each `served`, its `reason` when not), its
`hosts`, its functions with their status, and `lock` — send it as `version` on every change.

## Using its functions

A function is `<slug>.<operation>`: `parcel-desk.list-parcels`, `parcel-desk.get-parcel`. The
operation name is the document's `operationId` in lower-kebab, else the method and path. A slug may not
be one of Kipory's own function subjects (`url`, `text`, `web`, …): that is a 409, name it
something else.

Every parameter and the request body are **settings** on the step, named as the API names them
(a name a template cannot read is camelCased: `page-size` → `pageSize`). The step takes no input of
its own. A list operation also takes `maxItems` (up to 100) and pages through the API's cursor for
you. The output is typed from the document's answer schema; with no schema, from the test call's
answer (marked inferred), or untyped.

`GET /v1/functions/{key}` describes one like any other function; its words are the API's own
(marked as the vendor's).

A `default` the document gives a parameter that its own type refuses — `null` on a string, as
generated documents often write — is dropped: the setting is optional with no default.

## Sends

A function that sends (`effect: "send"` on its operation) adds a note, posts a comment, opens a
ticket. Its settings are the operation's parameters and body, as a read's are.

- **It is sent once the run is saved, and once per run.** The step answers `true` at once: the run
  now owes the call. The call goes out after the run's changes are saved — a run that fails sends
  nothing — and the step never sees your API's answer, so a flow cannot branch on it. A step run
  twice in one run sends once; a new run sends again. A preview or an eval run checks the call and
  sends nothing (a `PREVIEWED_NOT_SENT` warning).
- **The repeat key.** Every call carries one key, the same on every attempt. When the operation
  declares an `Idempotency-Key` header parameter, the key goes there (it is not a setting), so
  your API can tell a repeat from a new call.
- **No answer is an unknown outcome, and a call with no repeat key is not sent twice.** A call
  whose request left but got no answer to trust — a timeout, a 5xx, a gateway error — is sent again
  later only when it carries its repeat key (the operation declares that idempotency header, or an
  MCP tool says `idempotentHint: true`; an MCP tool carries no repeat key otherwise). Without one,
  your API might act on it twice, so it ends as **outcome unknown** and is not sent again: check
  your API. A call that never left (the name did not resolve, the connection was refused, the
  server lost its session) and a 429 are tried again whatever the key; every attempt is recorded.
  Any other answer ends it: a 4xx is not sent again (it needs the flow's author). It is tried again
  at once, inside one attempt, only when it carries its repeat key.
- **Made on the version the step ran.** A call staged before its function got a new version is not
  made (`ability-changed`).
- **A failed send shows on its run.** A send that ends unsent or unknown — refused, a 4xx, an
  unknown outcome, no key, its tries spent — adds a warning to the step that staged it on the
  run's timeline (`GET /v1/runs/{runId}/timeline`, a `step-warned` row whose `detail.kind` is
  `send-failed` or `send-outcome-unknown`, with the reason in `detail.message`), after the run
  was saved. Three failed or unknown sends of one connection within 24 hours, or one whose key
  your API refused, raise your organization's alert "Sends through a connected API keep
  failing", naming the connection. The next send your API answers (or a new key) clears it.
- **One API, always.** A send is never moved to another vendor, and never tested daily.

## When the API changes: drift

Every connection's document is read again once a day (04:20 UTC), without your key and without
calling any operation — nothing is spent. Each operation is compared with what its function serves:

- **an additive change** (a new optional parameter, a new answer field) waits as a draft version of
  that function; the function keeps serving as it is;
- **a breaking change** (an operation removed, a parameter newly required or retyped, a changed
  description) marks the connection `drifted` and its organization gets one alert naming the
  connections that drifted; functions the change does not touch keep running;
- **a new operation** is listed, not served: refresh the connection, then add it;
- **a document that cannot be read** three days running marks the connection `checking-failed` and
  raises one alert that it is not being checked. A good read clears both.

Only a function the connection serves can drift it: a change to an operation it does not serve is
shown on that operation and raises nothing. Read the result on `GET …/connections/{slug}`
(`status`, `driftCheckedAt`, `driftNotCheckedSince`, each operation's `drift`).
`POST /v1/nodes/{nodeId}/connections/{slug}/checks` runs the check now (202).

The check only reports: the connection keeps serving what it was connected with. To take the API
as it is now, **refresh** it:

```
POST /v1/nodes/{nodeId}/connections/{slug}/refresh
{ "version": "…", "validateOnly": true }   // validateOnly: what would change, nothing called
```

The document is read again and pinned. Each served function that changed without breaking is
tested on your key and serves its new version once the test passes (`changed`). One whose change
would break it — a setting newly required or retyped, an answer field removed, a changed
description (the same rule the daily check uses) — keeps serving its old shape, and the new shape becomes a **new function beside it**, named with a number:
`parcel-desk.get-carrier-2` (then `-3`, …). The new one is tested on your key like any connect,
shown when its test passes, hidden with its reason when not; a type of its answer that already
names another shape takes a number too (`ParcelDeskCarrier2`). The answer's `breaking` gives each
one's `newFunction`, and `sideBySide` lists every old function still serving beside its new one;
the operation reads "breaking: the new shape is `parcel-desk.get-carrier-2`; move your steps, then
drop the old one" and carries `newShape`. Move your steps to the new function, then drop the old
one:

```
PATCH /v1/nodes/{nodeId}/connections/{slug}
{ "operations": ["get-carrier-2", "list-parcels"], "version": "…" }   // get-carrier left out
```

Leaving the old function's name out drops it (409 naming the steps that still use it and the
flows they are in); the new one takes the operation over (its `functionName`), and the connection
is no longer `drifted` for it. The old function cannot be shown: it keeps the old shape, so show
the new one instead.
Leaving the new one's name out drops the new one instead. While the pair waits, the connection
stays `drifted` and the daily check reports it as waiting, not as a new change. A changed one whose test fails waits hidden while its
earlier version keeps serving (`waiting`) — show it with `PATCH …/abilities/{operation}` once
the cause is fixed. A function the API no longer serves retires, unless a step still uses it: then
it keeps serving and is named (`kept`), and the connection stays `drifted` until those steps
change. New operations are listed (`added`): add them with `PATCH …/connections/{slug}`
(`operations`). Nothing breaking left, `drifted` clears.

## An MCP server

An MCP server's link connects the same way, with `"sourceKind": "mcp"`. Its tools are read with
`tools/list` on your credential, and each tool that only reads becomes a function.

```
POST /v1/nodes/{nodeId}/connections
{
  "slug": "helpline",
  "sourceKind": "mcp",
  "sourceUrl": "https://mcp.helpline.example/mcp",
  "credential": { "kind": "bearer", "token": "…" },   // or { "kind": "api-key", "key": "…", "name": "X-Api-Key" }
  "operations": ["search-tickets"]                     // optional: tools by name; absent, every one
}
```

- **The credential** is a bearer token, or a key in a header you name (`api-key` with `name`). A
  key in the query, `basic`, or `include` are refused (422): tools are chosen by name in
  `operations`. The link must be https.
- **Reads and sends.** A tool the server marks read-only (`readOnlyHint: true`) is a read. Any
  other — one that may change something, or says nothing — is a send (see "Sends": sent once the
  run is saved, never called at connect, never tested daily), unless you name it in `reads`. A
  send's answer is never read, so its output schema neither types nor refuses it. Not
  served, each with its reason: a tool whose input
  is no object, whose schema refers to another document or uses `oneOf`, one whose answer type
  refers to itself, one that runs only as a task, and one whose `x-mcp-header` annotation is
  invalid (an argument it marks is mirrored into an `Mcp-Param-*` header on every call).
- **Settings and answers.** Every argument of the tool is a setting on the step, named as the tool
  names it (a `default` its own type refuses — `null` on a string — is dropped). A tool that declares an output schema answers typed items; when that answer holds
  exactly one list (`{ "tickets": [...] }`), its items are the list's elements and the step takes
  `maxItems`. A tool with no output schema answers its text as JSON when it is JSON, else as one
  `{ "text": … }` item; its type comes from the test call's answer.
- **What never happens.** No person is ever asked: a tool that asks for confirmation or more input
  fails the step as a refusal, charging nothing. A tool's own error fails the step with the
  server's words. The server's `instructions` are dropped, and a tool's description is kept only as
  the vendor's words, never read as an instruction.
- **Drift and refresh** read `tools/list` again on your stored credential — a tool's changed
  schema, annotations or description is breaking, as for a document — and the same `refresh`
  rules apply.

## Daily tests, if you want them

`PATCH /v1/nodes/{nodeId}/connections/{slug}/daily-tests` `{ "enabled": true, "version": … }` calls each reading
function once a day, on your key, with what its first test sent (or `input` per operation), and
records whether the answer still has its shape. Off until you turn it on: each test is a real
request your API's account pays for. A function that sends is never tested. Beside a new shape,
the old function keeps the tests it had; the new one is tested on the new shape.

## Change and remove

`PATCH …/connections/{slug}` with `operations` serves exactly that list from now on (one left out
retires its function; 409 while a step in your organization still uses it) — operations of the
document as it was last read: one new since is a 422 asking you to refresh first. With a new
`credential` it tests every function on it before keeping it; a shown function whose test fails
keeps serving, and the answer says so. `DELETE …/connections/{slug}`
retires every function and removes the key (409 naming the steps that still use it). A 409 like
this lists, per function, its `steps`, `flowCount` and up to ten `flows` (`id`, `label`,
`project`) in `details.dependents`: change those flows' steps first. The slug is
then free: connect a source under it again and its functions take the same names
(`parcel-desk.get-parcel`); past runs keep their history.
