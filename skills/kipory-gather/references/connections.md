# Your own API as functions: a connection

<!-- field-ok: operationId — an OpenAPI document's own field, read from the customer's document, not a request field -->
<!-- field-ok: flowCount — a field of a 409's `details.dependents`, which error details carry untyped, not a request field -->

An API with an OpenAPI document becomes a set of functions your organization's projects can use as
steps — one per operation that reads. That is a **connection**. It is made once, at the
organization, from the document's link and a credential; every project under the organization can
then use its functions like any other source.

## What a connection can do

- **It reads.** Each `GET` (or `HEAD`) operation the import can serve becomes a function. An operation
  that sends something — `POST`, `PUT`, `PATCH`, `DELETE` — is listed and not served, with the
  reason "writes come in a later release". To send to the API today, use `url.send` with a stored
  key (`references/url-send.md`).
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
- **One test call per reading operation**, on your key, at connect. One that answers makes its
  function **shown**, and its answer becomes the function's example. A parameter's own `example`
  (or a `default`) is what the test call asks it. One that fails leaves its
  function **hidden**, with the reason on the operation — often a required parameter the document
  gives no example or default for. Fix the cause, then `PATCH /v1/nodes/{nodeId}/connections/{slug}/abilities/{operation}`
  `{ "status": "shown", "version": … }`, which tests it again first and keeps that call as the
  function's example (an untyped answer gives it its type). If every test fails, nothing is
  stored and the answer is a 424 naming each failure.
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
would break it — a setting newly required or retyped, an answer field removed — keeps serving its
old shape, and the new shape becomes a **new function beside it**, named with a number:
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
