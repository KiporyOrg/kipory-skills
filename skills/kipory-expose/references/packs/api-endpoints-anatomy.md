<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: be2e8d720ebb · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Anatomy of a dynamic endpoint

> **Source of truth for facts:** the contract, action and input grammars, and the `api-endpoints`
> resource wire shape → live `GET /v1/openapi.json`. Which paths the platform itself occupies →
> `GET /v1/coded-routes`, the whole manifest as rows, before you pick a path. Whether a coded route
> already occupies one you have ALREADY saved → request `expand=shadowed` on the api-endpoints read,
> which returns the occupying route's method, path and group; the save refuses a collision
> regardless. This pack is the narrative and the judgment; the schemas are the truth.

**Read this one early.** It traces the whole life of a request, and every other capability —
schedules, events, record processing — rides the same machinery.

## What it is

You author an endpoint through the **design API**. That row declares an HTTP **contract** — method,
path, params — and an **action**: which flow to invoke, and how request fields map onto its input
slots. The endpoint is then live on the project's own host. No redeploy.

A fresh project serves **nothing**. There are no starter endpoints and no starter flows; every
route a project answers is one you authored.

## Two planes, and this is the thing that costs people the most time

- **The design plane** is where you _create and edit_ endpoints. It is the platform's own host,
  and it authenticates as an operator.
- **The dynamic plane** is where the endpoint is _called_. It is the project's own host, and it
  authenticates with a project-scoped key.

They are different hosts. Creating an endpoint on one and calling it on the other is the normal
flow, and confusing them produces a 404 that looks like the endpoint was never made.

⭐ **Never reconstruct the call URL by hand.** Every endpoint read carries a computed, read-only
`invokeUrl` — the absolute dynamic-plane URL. Use it. ⚠️ It is `null` on a deployment with no
derivable public host (bare local dev), so handle that arm rather than sending the literal.

Every read also carries a computed, read-only `access`: whether a VIEWER-level caller may make the
call, whether the method or the bound flow decided that, and which handlers in the flow write. It
is derived on each read from the same rule the write gate applies — never stored, never writable.

## The one write-shape rule people get wrong

⚠️ **The write body is the read shape minus everything the server derives.**

A flow-backed action names its flow **by id only** and carries **no signature** — the save reads
the slug and snapshots the signature off the live flow, so neither is a field you may send.
Both come back on every read.

**So you cannot echo a stored action config back verbatim.** Strip the signature and the flow slug
first. An unknown key is refused loudly, naming the key, rather than being silently dropped — which
is the right behaviour and also means a round-trip that "should" work fails until you understand
why.

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

⚠️ The endpoint key is **immutable**: a patch will not change it. Pick it as the name you will
refer to this endpoint by for its whole life.

## The contract

The path must start with `/v1/`, each segment being a literal or a single parameter, with no two
parameters adjacent. Path and query parameters can only carry string slots.

Collisions are computed on the **parameter-name-agnostic template**, so `/v1/x/{id}` and
`/v1/x/{key}` are the same path. It must not collide with a coded platform route or with a sibling
endpoint. `GET /v1/coded-routes` lists every coded path so you can check before saving rather than
discover it in a refusal.

A coded route occupies its path on **every** host, including one where it answers 404 — a group a
project has disabled, or a management-plane group addressed on a project subdomain, is still a
registered route and still wins the match. So "it 404s here" is never a reason to author onto it.

There is **no read-only flag to set.** Whether a VIEWER-level caller may make a call is the
platform's decision, not a declaration: an asynchronous invoke and a DELETE are writes; any other
GET is a read; anything else is a write exactly when the bound flow — sub-flows included — reaches a
step that changes data: a handler that writes, an event emitted beyond the run (it can start
triggers), or a facet resolution. An asynchronous invoke cannot be saved on GET. So a
POST search whose flow only reads is open to viewers without declaring anything — and a contract that still carries the old read-only key is refused like any unknown key.

## The action

Three kinds:

- **Invoke** — a buffered call. Synchronous returns the result and has a timeout ceiling;
  asynchronous returns an acknowledgement immediately.
- **Stream** — server-sent events, naming which output slot streams as deltas, with an optional
  allowlist of events to surface.
- **Subscribe** — a bus subscription over events (capability pack `events` — `GET /v1/capability-packs/events`).

**Input mapping** binds each flow input slot to a request location: the body, a path parameter or
a query parameter. At save time the grammar is enforced — every binding must reference a declared
input slot, a path binding needs that path parameter declared and required, and every required
non-provider slot must be bound. **Provider slots cannot be bound from HTTP at all**, which is
what stops a caller claiming to be a different user.

**An action declares no output mapping, and this is deliberate.** Its response shape comes from one
place — the flow signature snapshot (below) — so there is nothing to configure on the way out. An
earlier generation of endpoints worked the other way: you listed `outputFields`

<!-- field-ok: outputFields — RETIRED with the record-projection endpoint kind; named here only to explain what replaced it -->, each binding a

response key to a per-record _source family_ (the stored record, its submitted data, an ingest
flow's produced slots, attached files, facet terms). That mechanism is **retired**. Records are read
today through the `entity.read` / `entity.list` handlers inside a flow, so a record-shaped response
is just a flow output slot like any other, and the action view no longer advertises which source
families a kind can emit — every kind emitted none.

The practical consequence for an architect: **to change what an endpoint returns, change the flow
and re-save the endpoint.** There is no response mapping to edit, and no way for the published
contract to disagree with the flow it was snapshotted from.

## The snapshot, and the one way it goes stale

The bound flow's signature is **snapshotted at save**, authoritatively — there is no field for you
to supply your own copy. Saving again re-takes it.

**Nothing else re-takes it.** If the flow's signature changes afterwards, the endpoint keeps
publishing and validating the shape it captured, and the flow's new output is rejected by the
endpoint's own contract.

**Two guards, and they are now symmetric.** Both edits that could invalidate a captured shape are
refused by default with a `409` that names the holders, and both take the same opt-in to commit the
edit and re-snapshot every holder in one transaction:

- Changing a flow's **signature** while anything binds it → `FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS`.
- Editing a **shape** the flow's slots reference, where that reaches a bound snapshot →
  `SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`.

Re-send with `adoptSnapshots: true` to make the change and update the holders together. ⛔ **Do not
decompose it into unbind → change → rebind**, which is the shape a reader reaches for when they
think one side is unguarded: that leaves a live `/v1` route unbound in the middle. Two refusals to
expect on the opt-in itself: an incomplete adopt, and a SYSTEM flow whose holders live in other
projects, which cannot be adopted at all.

`expand=drift` on the endpoint read still answers "did this endpoint fall behind" for anything that
drifted before the guards, but it is no longer the only way to find out — the write now tells you.

## The life of a request

1. **Host resolves to a project.** An unknown project-shaped host is a 404 — it never falls
   through to another project.
2. **Bearer auth.** Missing, malformed, revoked or expired is a 401. A key whose grant does not
   **reach** this project is a 403 — reach is plain descent from the granted node, and it is
   resolved per request rather than trusted from mint time.

   ⚠️ **A key has no owner whose status could refuse it**, and looking for one costs real debugging
   time. Its authority is the grant written on the row, so there is no third party to go stale;
   revoking or expiring the key is what stops it. A **session** is the opposite — its user must
   still be active, and that is rechecked on every request.

3. **Dispatch.** One catch-all matches everything under `/v1`. No match is a 404, and **a wrong
   method on a path that exists is also a 404** — method existence is not leaked. More specific
   patterns win: fewer parameters first, then more literal characters, so a literal always beats a
   parameter.
4. **Write gate.** A write requires write permission. A GET is a read; a DELETE or an asynchronous
   invoke is a write; anything else is a write when its bound flow — sub-flows included — reaches a
   handler that writes, or a step the platform cannot resolve. It is checked _after_ matching, so a
   bogus path still 404s rather than revealing itself as a 403.
5. **Compile the contract** — from the _snapshot_, not the live flow. The same fragments back the
   published schema, so the wire and the docs cannot disagree.
6. **Validate and assemble.** Undeclared or wrong-typed fields are refused.
7. **Run the flow.**
8. **Project the output.** The run's declared output slots are taken, **undeclared extras are
   dropped rather than leaked**, and the result is validated before it is sent.

## The errors, and what each really means

| Status  | Trigger                                                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **401** | No, malformed, unknown, revoked or expired token                                                                                                                              |
| **403** | The grant does not reach this project; or a **VIEWER** principal making a call that counts as a write (step 4) — and VIEWER is what a key is minted at when no role is stated |
| **404** | Unknown host; no match; **wrong method on a matched path**; over-long path                                                                                                    |
| **422** | Bad, undeclared or wrong-typed body or query field — including an **undeclared query key**                                                                                    |
| **502** | Skill failure; a **declared-required output the run did not produce**; response fails validation                                                                              |
| **504** | A synchronous flow exceeding its timeout                                                                                                                                      |

⚠️ **The undeclared query key is the notorious one.** The query schema forbids extra properties,
so an unexpected `?foo=bar` is a 422 rather than being ignored. Callers who add a tracking
parameter break.

⚠️ **A 502 for a missing output does not name the slot** on the synchronous path — deliberately,
so a caller cannot map your flow's internals. The asynchronous path records
`INVOKE_REQUIRED_OUTPUT_MISSING` against the invocation. Either way, the fix is upstream: the
flow's output binding, or whatever stopped the step that feeds it from running at all.

⛔ **The error names the LAST link, and the break is often at the first.** A common cause is not the
binding but a skill upstream that was SKIPPED, because the pipeline reads an absent
input as "nothing to do here" and the skip cascades to the terminal step. Preview shows you which
steps ran — **but only under the same principal.** A flow triggered by a **schedule** resolves no
end user, so `userInfo` is absent and any skill reading only it is skipped; preview run as
yourself resolves you, skips nothing, and reports the flow healthy. Preview a scheduled flow with
`"principal": "noEndUser"` or you are testing a different run. See the preview section of
flows-and-skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`).

**The coalescing rule is worth knowing before you debug an empty response.** A _clean_ run that
leaves a required slot empty gets the type's empty value — an empty list, empty object, empty
string, zero, false — rather than a fault, because a zero-hit search is an empty result, not an
error. The four types with no safe empty value stay a genuine fault: a union, a record reference, a
file, and a reference to a library or operator object type. (The coalesced set includes
`optional → null`, which is easy to miss.) **Preview does not coalesce**,
which is exactly how you see the gap that production would paper over.

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
  "endpoint": "legacyExport",
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
omitting it mints a `VIEWER` — the least power, never the minter's — so a key minted without one
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

## Checklist for an endpoint that actually works

1. The bound flow exists **and its output binding projects the declared slots.** ⚠️ An unbound
   required slot does not reliably 502 — for any type with a safe empty value it is filled in and
   the call returns 200 with `[]`, `{}`, `""`, `0` or `null`, which is the quieter and worse
   failure. Preview is where you see it: preview does not fill anything in.
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
