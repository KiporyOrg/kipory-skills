# Signing end users in

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
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

How the people who use your product get a session, what the session is afterwards, and how they end it. Every sign-in route is served on the **project's host** — `baseUrl`, read from `GET /v1/projects/{nodeId}` or from the project's entry in `GET /v1/grant` (`kipory-connect`'s `references/conventions.md` has the two-hosts rule). The routes that configure sign-in are design routes: the api host, with your key.

Two providers exist, Google and Apple, and no others. There is no password, magic-link or anonymous sign-in.

## Pick the row for your client

| Client                                 | How it signs a user in                                                                                                                                  | What it holds afterwards    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Web app on the project's platform host | browser to `GET /v1/auth/signin/google` on the project host                                                                                             | the session cookie          |
| Web app on your own proven domain      | the same, with `callbackUrl` and `state`, then `POST /v1/auth/handoff/exchange` — "Your own domain" below                                               | `session`, sent as a Bearer |
| Native app, Apple                      | the system sheet, then `POST /v1/auth/native/apple { identityToken, authorizationCode, rawNonce, fullName? }` on the project host → `{ session, user }` | `session`, sent as a Bearer |
| Native app, Google                     | a browser at `GET /v1/auth/signin/google?callbackUrl=kipory://auth/callback` — "Native app, Google" below                                               | `session`, sent as a Bearer |
| A builder holding only an API key      | cannot — "What a key cannot do" below                                                                                                                   | nothing                     |

Apple has no web flow: its one route is the native POST, so a web app signs people in with Google only.

A session, however it arrived, is one credential: the cookie in a browser, or the opaque `session` string sent as `Authorization: Bearer <session>`. A signed-in user reaches a flow as the `userInfo` provider slot.

## Which providers a project offers: `authConfig`

```
GET /v1/projects/{nodeId}/auth-config                        VIEWER — what is stored, what is in force, and what each provider would do
PUT /v1/projects/{nodeId}/auth-config   { authConfig }       ADMIN — replaces the whole stored document
```

The document goes inside `authConfig`:

```json
{
  "authConfig": {
    "providers": {
      "google": { "enabled": true },
      "apple": { "enabled": true, "bundleId": "com.acme.app" }
    },
    "redirect": {
      "callbackUrl": "https://app.acme.com/welcome",
      "appDomain": "https://app.acme.com"
    }
  }
}
```

| Field                          | Meaning                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers.<name>.enabled`     | whether the project offers that provider. `<name>` is `google` or `apple`                                                                                                                           |
| `providers.<name>.credentials` | `shared` (the platform's application — the default when absent) or `byo` (your own, stored in your vault). Both providers take `byo` — "Your own Google OAuth client" and "Native app, Apple" below |
| `providers.apple.bundleId`     | the app's bundle id. Required whenever Apple is enabled: the save is refused with a 422 on `authConfig.providers.apple.bundleId`                                                                    |
| `redirect.appDomain`           | the origin your app is served from. Its origin is one sign-in may return to and one that may call the project host from a browser                                                                   |
| `redirect.callbackUrl`         | where a sign-in lands when the request names no `callbackUrl` of its own — a full URL with its path. Null lands on the app domain's root, and with no app domain on the platform's own landing      |

What to know before the write:

- **Both `providers` and `redirect` must be present**, and neither takes an unknown key. With no app of your own, send `"redirect": {}`. The example above names a domain outside the platform's, so on a deployed platform it saves only after that host is claimed ("Your own domain", below).
- **It replaces, never merges.** A provider you omit is disabled. `"authConfig": null` clears the document and goes back to the platform default: Google on, through the platform's application, no origin of yours.
- **Both `redirect` URLs must be deliverable.** On a deployed platform that means `https` and a host that is the platform's base domain or under it — the session cookie reaches nothing else — or the one host the project has claimed as its own domain (below). Anything else is refused at the save, naming the field.
- **Ask first with `validateOnly: true`.** The PUT then answers a verdict at 200 and stores nothing; its `derived.delivery` says, per origin the document names, how a session would reach it — `cookie`, `code` (the one-time handoff, to a proven domain only) or `null`, which means a person signing in would be returned there signed out.
- **Read what is in force, not what you sent.** The GET returns `stored` (your document, or null), `effective` (what sign-in uses) and `providerStatus` — one entry per provider with `signIn`: `shared-app`, `own-app` or `refused`, and for a refusal the `refusal` reason: `provider-off`, `no-bundle-id` or `no-credential`.
- **`malformed: true` is urgent.** A stored document the platform can no longer read falls back to the default, which switches Google sign-in on. Nothing else reports it.
- **A provider that is off has no routes.** Its paths answer 404 and are left out of that project's `GET /v1/openapi.json`, which is why Apple's route is missing there until the document enables it. `GET /v1/coded-routes` lists the path either way.

## Web app on the platform host

Send the browser to `GET /v1/auth/signin/google` on the project host. Add `callbackUrl=<a URL on your app's origin>` to choose the landing page; its origin must be one the document names (`redirect.appDomain` or the origin of `redirect.callbackUrl`). The browser comes back signed in, holding the session cookie, and every call it makes to the project host carries it. A sign-in that fails does not come back to your `callbackUrl`: a `callbackUrl` the project does not allow is answered with `?error=invalid_callback` on the project's default landing or the platform's own sign-in screen, and a failure at the provider lands on the platform's sign-in screen with `?error=<code>`.

## Your own domain

An app served from a domain outside the platform's cannot receive the cookie. It gets a one-time code instead, which its server exchanges for the session.

1. **Claim the domain.** `PUT /v1/projects/{nodeId}/app-domain { host }` (api host, ADMIN). The answer names a DNS TXT record.
2. **Prove it.** Publish the TXT record, then `POST /v1/projects/{nodeId}/app-domain/verify`. `GET /v1/projects/{nodeId}/app-domain` reads the claim and whether it is verified. A claim that is only pending lets the document name the host and delivers nothing to it.
3. **Name it in `authConfig`** as `redirect.appDomain` (and a `redirect.callbackUrl` on it if the landing is not the root).
4. **Start sign-in from the browser**: `GET /v1/auth/signin/google?callbackUrl=<a URL on your domain>&state=<random>` on the project host. `state` is 16–512 characters your app generates for this sign-in and keeps (in its own cookie, say). It is required for your own domain; without it the browser comes back with `?error=state_required`.
5. **Receive the code.** Sign-in returns to `callbackUrl` with a one-time `?code=`. The state is never echoed.
6. **Exchange it from your server, at once**: `POST /v1/auth/handoff/exchange { code, state }` on the project host → `{ session, expiresAt }`. The code is good for one exchange, for about a minute, on this project's host only, with the `state` the sign-in started with.
7. **Keep `session` server-side** (in your own HttpOnly cookie, say) and send it as a Bearer to the project host. It works there and nowhere else — not on the api host, not on another project — until `expiresAt`.

A `401 HANDOFF_CODE_INVALID` covers every bad code alike — unknown, expired, used, another project's, the wrong state. Send the person through sign-in again; never retry the exchange.

## Native app, Apple

Run the system Sign in with Apple sheet, then post what it returned: `POST /v1/auth/native/apple { identityToken, authorizationCode, rawNonce, fullName? }` on the project host. The answer is `{ session, user }`.

- Give Apple the SHA-256 of your nonce and send the **raw** nonce here; hashing this one breaks sign-in.
- Apple supplies the name only on the first authorization ever. Forward `fullName` then, or it is not recoverable.
- The project's `authConfig` must enable `apple` with the app's `bundleId`.
- **Your own Apple signing key** is `"credentials": "byo"` on `apple`, with a secret of type `apple_signin`, purpose `apple`, on the project's node or an ancestor (`kipory-secrets`; `GET /v1/secrets/catalog` gives the value's fields). Unlike Google, Apple `byo` with no usable secret still signs people in — the identity token is checked against `bundleId` alone — but the platform then cannot capture the Apple grant, so it cannot revoke it later.
- Sent with a session Bearer already present, the call links Apple to that account instead of signing in.

## Native app, Google

There is no native Google route; a native app uses the web flow with a deep link. <!-- absent: POST /v1/auth/native/google -->

1. Register the `kipory` URL scheme in the app.
2. Open a browser at `GET /v1/auth/signin/google?callbackUrl=kipory://auth/callback` on the project host. That literal is the only non-http callback accepted.
3. The sign-in ends by opening the app at `kipory://auth/callback?session=<token>`, or `kipory://auth/callback?error=<code>` when it failed.
4. Send the token as a Bearer.

## Your own Google OAuth client

By default people sign in through the platform's Google application. To use your own:

1. Create an OAuth client in Google's console and add `<api base URL>/v1/auth/callback/google` as an authorised redirect URI — the callback is served on the api host, not the project's.
2. Store the client with `POST /v1/secrets`: type `oauth_client`, purpose `google`, on the project's node or an ancestor (`kipory-secrets`; `GET /v1/secrets/catalog` gives the value's fields).
3. Set `"credentials": "byo"` on `google` in `authConfig`.

With `byo` and no usable secret, Google sign-in is refused — `providerStatus` reads `refused` with `no-credential` — and is never served by the platform's application instead. Read `providerStatus` before saving: its `credential.state` says whether a client already resolves for the project, on its own node or above it.

## Signing out, and the account routes

Signing out is `GET /v1/auth/signout` on the project host, with the cookie or the session Bearer. It ends that session, clears the cookie and answers a 302. It is safe to call twice.

- **The redirect goes to your project's landing.** With no `callbackUrl` the browser is sent to the project's configured landing — `redirect.callbackUrl`, else the root of `redirect.appDomain` — and to the platform's own app only when the project has neither. A `callbackUrl` in the query is honoured when sign-in would accept it as its own `callbackUrl` on this host, and a path is resolved against the default; a refused value lands on the project's landing. The native literal `kipory://auth/callback` is accepted as on sign-in.
- **A background call works too**: a `fetch` that sends the cookie and does not follow the redirect, or a native client or your server sending the session as a Bearer.

The signed-in person's own account lives under `/v1/me` on the project host. These take a session, never an API key:

| Route                                 | What it does                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /v1/me`                          | the account: name, email, avatar                                                     |
| `PATCH /v1/me`                        | change the display name                                                              |
| `DELETE /v1/me`                       | delete the account, everywhere — not only in this project                            |
| `GET /v1/me/profile`                  | the person's profile in this project, typed by the project's profile schema          |
| `PATCH /v1/me/profile`                | edit it                                                                              |
| `GET /v1/me/identities`               | the providers the person can sign in with                                            |
| `DELETE /v1/me/identities/{provider}` | unlink one; a 409 when it is the only one left                                       |
| `GET /v1/me/sessions`                 | every live session the account holds; one row is the current one                     |
| `DELETE /v1/me/sessions/{id}`         | end one of them                                                                      |
| `GET /v1/me/stats`                    | totals across what the account holds: records, stored bytes, records being processed |

A session that came from the own-domain exchange is scoped to its project: it reads and edits the account and the profile, and is refused `403 SESSION_SCOPED_TO_PROJECT` on the account-wide acts — the sessions list, ending a session, unlinking a provider, deleting the account.

The `auth` and `account` groups can be switched off per project (route enablement, in the skill's main page); `GET /v1/coded-routes` lists both groups in full, and the project host's `GET /v1/openapi.json` has each body.

## The end-user profile

A project's end users each have a profile, typed by one schema entry the builder connects. Until one is connected there is no profile: `userInfo` carries `userId` alone. These are design routes — the api host, with your key:

| Route                                                        | Floor  | What it does                                                                                  |
| ------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| `GET /v1/projects/{nodeId}/profile-schema`                   | VIEWER | the type that shapes the project's profiles, or none                                          |
| `PUT /v1/projects/{nodeId}/profile-schema { schemaEntryId }` | EDITOR | connects a schema entry; re-pointing to another is refused once profiles exist                |
| `POST /v1/projects/{nodeId}/profile-schema/starter { key }`  | EDITOR | creates a type from the platform's starter shape and connects it; refused once profiles exist |
| `DELETE /v1/projects/{nodeId}/profile-schema`                | ADMIN  | disconnects it and keeps the type; stored profiles are left typed by nothing                  |
| `GET /v1/users/{userId}/profile?project={nodeId}`            | VIEWER | one person's profile                                                                          |
| `PATCH /v1/users/{userId}/profile?project={nodeId} { data }` | EDITOR | edits it                                                                                      |

The person reads and edits the same profile with their session, at `/v1/me/profile` on the project host. User ids come from `GET /v1/users?project={nodeId}` (VIEWER).

## What a key cannot do

A key cannot sign a user in, mint a session, or call any `/v1/me` route. To test as a user:

- A human signs in once per test user and hands you the `session`; send it as a Bearer to the project host.
- Inside an eval suite, `runAsUserId` runs the flow as one user without a session (`kipory-prove`). Plan a two-user proof as two suites.

A key calling a product endpoint has no `userInfo` at all, and what that does depends on the step: anything that needs a person fails closed — a per-user record type refuses, and an endpoint whose flow writes person-owned records answers 403 — while a step that reads a project-wide type runs without one.
