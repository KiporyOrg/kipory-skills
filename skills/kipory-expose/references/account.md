# Signing out, and the signed-in person's account

Read this when your product signs a person out or offers account screens: the sign-out route, the `/v1/me` routes a session calls, account deletion and push devices.

<!-- key-unreachable-ok: GET /v1/me — an end user's own session calls it; listed so a product client knows the route, never for the builder's key -->
<!-- key-unreachable-ok: PATCH /v1/me — an end user's own session calls it -->
<!-- key-unreachable-ok: DELETE /v1/me — an end user's own session calls it -->
<!-- key-unreachable-ok: GET /v1/me/stats — an end user's own session calls it -->
<!-- key-unreachable-ok: GET /v1/me/profile — an end user's own session calls it -->
<!-- key-unreachable-ok: PATCH /v1/me/profile — an end user's own session calls it -->
<!-- key-unreachable-ok: GET /v1/me/identities — an end user's own session calls it -->
<!-- key-unreachable-ok: DELETE /v1/me/identities/{provider} — an end user's own session calls it -->
<!-- key-unreachable-ok: GET /v1/me/sessions — an end user's own session calls it -->
<!-- key-unreachable-ok: DELETE /v1/me/sessions/{id} — an end user's own session calls it -->

## Signing out, and the account routes

Signing out is `GET /v1/auth/signout` on the project host, with the cookie or the session Bearer. It ends that session, clears the cookie and answers a 302. It is safe to call twice.

- **The redirect goes to your project's landing.** With no `callbackUrl` the browser is sent to the project's configured landing — `redirect.callbackUrl`, else the root of `redirect.appDomain` — and to the platform's own app only when the project has neither. A `callbackUrl` in the query is honoured when sign-in would accept it as its own `callbackUrl` on this host, and a path is resolved against the default; a refused value lands on the project's landing. The native literal `kipory://auth/callback` is accepted as on sign-in.
- **A background call works too**: a `fetch` that sends the cookie and does not follow the redirect, or a native client or your server sending the session as a Bearer.

The signed-in person's own account lives under `/v1/me` on the project host. These take a session, never an API key:

| Route                                 | What it does                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET /v1/me`                          | the account: name, email, avatar                                                                      |
| `PATCH /v1/me`                        | change the display name                                                                               |
| `DELETE /v1/me`                       | delete the account — everywhere, or with a scoped session only as far as your project reaches (below) |
| `GET /v1/me/profile`                  | the person's profile in this project, typed by the project's profile schema                           |
| `PATCH /v1/me/profile`                | edit it                                                                                               |
| `GET /v1/me/identities`               | the providers the person can sign in with                                                             |
| `DELETE /v1/me/identities/{provider}` | unlink one; a 409 when it is the only one left                                                        |
| `GET /v1/me/sessions`                 | every live session the account holds; one row is the current one                                      |
| `DELETE /v1/me/sessions/{id}`         | end one of them                                                                                       |
| `GET /v1/me/stats`                    | totals across what the account holds: records, stored bytes, records being processed                  |

A session that came from the own-domain exchange, a native app's one-time-code exchange (Google on iOS and Android), or a test user's session is scoped to its project: it reads and edits the account and the profile, and is refused `403 SESSION_SCOPED_TO_PROJECT` on the account-wide acts — the sessions list, ending a session, unlinking a provider.

**Deleting the account with a scoped session** — what an app's "Delete account" does for a person signed in with Google — reaches only as far as your project could. When the account holds a seat in your project and none beyond it, `DELETE /v1/me` ends the whole account and answers `scope: "account"`. When it holds seats elsewhere too, the person leaves your project — their seat, profile, the sessions and Apple grants made for it end, what they made there is erased shortly after, and your project hears `member.left` with reason `account-deleted` — the account stays, and the answer is `scope: "project"`. Either way every session made for your project has ended, the one that asked included: treat both as deleted and sign the person out. A `409` says why the person cannot leave — `no-seat` (no seat of their own in your project: their access comes from an organization above it, or they have none), `last-owner` (they are your project's only owner) or `test-seat` (a test user's seat goes only with the test user). A whole-account delete can also be refused `409` for a reason in an organization the person alone belongs to, such as credits or a debt left in its wallet. If an admin removed the person in the same moment, your project hears `member.left` with reason `removed` instead, and the deletion still finishes. `DELETE /v1/me?validateOnly=true` answers the same `derived.scope` and `reason` before you offer the button.

<!-- key-unreachable-ok: POST /v1/devices — the person's own app calls it with their session -->
<!-- key-unreachable-ok: GET /v1/devices — the person's own app lists its devices with their session -->
<!-- key-unreachable-ok: DELETE /v1/devices/{id} — the person's own app stops a device with their session -->

**Push devices.** An app that wants pushes registers the device on the project host with the person's own session, `POST /v1/devices` with `pushService` (`apns` or `fcm`), `token`, `appId` and, for iOS, `environment`. Call it at every launch and whenever the operating system hands the app a new token: registering again refreshes the device rather than adding one. `GET /v1/devices` lists the person's own devices in this project and `DELETE /v1/devices/{id}` stops one. A key cannot register a device. Signing out, or ending the session with `DELETE /v1/me/sessions/{id}`, removes every device that session registered, so register again after the next sign-in; leaving the project and deleting the account remove them too (`kipory-channels` for what a flow does with them).

The `auth` and `account` groups can be switched off per project (route enablement, in [pitfalls.md](pitfalls.md)); `GET /v1/coded-routes` lists both groups in full, and the project host's `GET /v1/openapi.json` has each body.
