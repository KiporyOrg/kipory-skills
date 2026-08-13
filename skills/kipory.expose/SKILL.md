---
name: kipory.expose
description: Put a Kipory flow on HTTP as a dynamic endpoint — sync, async or streaming — and get a credential that can call it. Use when a flow works and the outside world needs to reach it, or when an endpoint returns 404, 403 or 502 and the cause is not obvious.
---

# Expose a flow over HTTP

Fetch `GET /v1/capability-packs/api-endpoints-anatomy`. It carries the whole request lifecycle, the
contract and action model, and the error table — read it before debugging anything, because most of
this surface's failures are indistinguishable by status code alone.

## Two planes, and this is what costs people the most time

You author on the **design plane** — the API host, with your key. Your users are served on the
**dynamic plane** — the project's own host. They are different hosts with different rules, and
reaching for one from inside the other is the single most expensive confusion here.

**Never hardcode the host.** The endpoint read returns a computed `invokeUrl`; use it. A host copied
from documentation belongs to whichever deployment wrote the documentation.

## The order that avoids the two silent failures

1. **The flow's output binding projects its declared slots.** Do this first. An unbound output makes
   every call a 502 while the flow itself previews fine — the most common cause by a wide margin.
2. **Create the endpoint**: path, contract, action. The path starts with `/v1/`, has no adjacent
   parameters, and must collide with no coded route or sibling.
3. **Check for a shadowing coded route** — ask for the shadowed expansion on the endpoints read. A
   coded route wins, and the symptom is your endpoint simply never being reached.
4. **Bind every input.** Each field the flow needs is a declared parameter or body field, bound in
   the inputs, and every required non-provider slot is bound.
5. **Preview first, then call for real.** Preview bills the project's payer but commits no side
   effects.

## The credential

⛔ **You cannot mint the key.** Key management accepts a signed-in session only — a key cannot mint
another key, so that a leaked one cannot manufacture siblings outliving its revocation. **Ask the
human.**

Tell them what to mint, because the grant cannot be edited afterwards — revoke and mint again:

- **The node** it acts at. A grant reaches that node and everything beneath it, so a key granted at
  one project reaches only that project.
- **The role**, which is uniform over that whole reach and defaults to the least it can do.
- **An expiry**, which is required.

The plaintext is shown once. Only a hash and a short prefix persist.

## Reading a refusal

|                     |                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------- |
| **404 on the host** | unknown project-shaped host — it never falls through to another project                |
| **404 on the path** | no match, **or the right path with the wrong method** — method existence is not leaked |
| **401**             | missing, malformed, revoked or expired credential                                      |
| **403**             | the grant does not reach this project, or a write on an endpoint not marked read-only  |
| **502**             | almost always the output binding                                                       |

⚠️ **A key has no owner whose status could refuse it.** Its authority is the grant on the row, so
there is no membership to go stale and checking one is wasted time — revocation and expiry are what
stop a key. A session is the opposite: its user must still be active.

## Then

`kipory.prove` to pin the behaviour, `kipory.operate` to run it on a clock or emit signals from it.
