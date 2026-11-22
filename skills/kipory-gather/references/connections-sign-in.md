# A connection you sign in to (OAuth 2.1)

A connection (`references/connections.md`) to a server that takes no key: a person signs in once,
or a machine API signs in on its client's own id and secret.

Some servers take no key: a person signs in once and allows access. Connect one with
`"credential": { "kind": "oauth2", "grant": "authorization-code" }` (an MCP server or an OpenAPI
source alike). Kipory finds the server's sign-in from its link; it is refused (422, with
`details.reason`) when the server names another issuer (`issuer-mismatch`), cannot protect a
sign-in (`no-s256`), has an endpoint on a private address (`refused-url`) or offers none
(`no-metadata`). An OpenAPI document is read too, with no credential: a link that is no
document (an MCP server sent as `openapi`) is 422 `unreadable`; the dry run lists its operations.

1. **You create it.** The answer (201) is the connection with `status: "waiting-for-sign-in"`, no
   operations yet, and `signIn`: `url` (the connection's page in the Kipory app), `server`,
   `scopes` (what the sign-in asks, as the server names them), `client`, `callbackUrl` and
   `serverNamesItself`. `operations` and `reads` given here (by name, `"GET /path"` or
   the document's operation id) are kept and applied when the functions are first read; for an OpenAPI document
   the dry run already warns about a name it lacks. When none of the named `operations` exists at the server, nothing is served: the
   connection is `active` with no function, and its `statusReason` lists what the server offers —
   name them with `PATCH …/connections/{slug}` `operations`.
2. **A person signs in.** Give them `signIn.url`. Anyone with admin rights where the connection
   is held (its `heldAt`: the project, or the organization) presses "Sign in to <server>", allows
   access at the server, and lands back on the page. An agent cannot do this step:
   `POST /v1/nodes/{nodeId}/connections/{slug}/authorizations` starts a sign-in for a signed-in
   person only (an API key is 403 `sign-in-needs-a-person`). Tell them to use a shared team
   account: every flow that uses the connection runs as the account that signs in.
3. **The import runs.** Kipory keeps the sign-in in the vault where the connection is held and reads the
   server's functions as a connect does. Read `GET …/connections/{slug}`: `active`, the functions,
   and `signedIn` (who, when, `account`, `server`, `client`, `scopes`, `expiresAt`; never a
   token). A `statusReason` on an `active` connection is what that first read had to say (a
   function hidden because the sign-in lacks a permission, a name the server lacks); a refresh or a
   change of `operations` answers it.

The person's browser comes back through `GET /v1/oauth/callback`; nothing calls it by hand. On a
failure the page shows why (`access-denied`, `expired`, `other-user`, `not-admin`,
`wrong-server`, `no-refresh`, `token-refused`, `save-failed`, `server-error`) and nothing is kept;
`import-failed` keeps the sign-in (the page says "Needs a refresh" and why), and
`POST …/connections/{slug}/refresh` runs the import again. While nobody has signed in, `refresh`
and `checks` are 409 `needs-sign-in`; changing `operations` before the first read worked is 409
`not-read-yet` — refresh first.

**Which app Kipory signs in as** (`signIn.client`): `kipory` (the server reads Kipory's own client
document, `GET /v1/oauth/client-metadata.json`), `registered` (Kipory registered itself there
once for the project or organization holding the connection), or `own`. Kipory signs in as itself (`kipory`, `registered`) only
at a server that names itself on every sign-in it sends back (`signIn.serverNamesItself`); at one
that does not, only your own app signs in. When the server takes neither, or does not name
itself, `client` is `needs-own-app`: register an app at the server with `signIn.callbackUrl` as its redirect URI, then
`PATCH …/connections/{slug}` with `{ "credential": { "kind": "oauth2", "clientId": "…",
"clientSecret": "…" }, "version": … }` (or give `clientId` and `clientSecret` at create). It is
kept where the connection is held, for that server's issuer, and used by every later sign-in there; its id comes back as
`clientId`, its secret never.

**A machine API** (no person): `"grant": "client-credentials"` with your `clientId` and
`clientSecret` connects in one step, as a key does. There is no sign-in to give a person: when the
server refuses the client (`needs-reconnect`), send a working client's id and secret with
`PATCH …/connections/{slug}` `{ "credential": { "kind": "oauth2", "clientId": "…",
"clientSecret": "…" }, "version": … }`. Kipory gets a token with it first and keeps it only when
the server gives one (422 `token-refused` otherwise, nothing changed); the connection is active
again at once.

**After it is signed in, Kipory renews it on its own.** What can still happen, by `status`:

- `needs-reconnect` ("Sign in again"): the server refused the saved sign-in. Steps fail
  `connection-needs-sign-in`, not retried, and the alert "Connected API needs a sign-in", raised
  where the connection is held, names it. A person signs in again at `signIn.url` (a client-credentials connection: send
  its client again, as above). A refresh is 409 `needs-sign-in` until then.
- `needs-more-access` ("More access needed"): a step needed permissions the sign-in did not give;
  it failed `connection-needs-more-access`, naming them. Signing in again asks for them too.
- `sign-in-unreachable` ("Can't reach sign-in"): the server's sign-in did not answer (down, a 5xx,
  a 429). Nothing is lost: flows run on the current access while it lasts, then fail
  `sign-in-unreachable` and are retried. Three days of it is `needs-reconnect`.

A refusal ends a sign-in; a server that does not answer never does. When the person who signed in no
longer holds an operator seat (not an end user's) where the connection is held or above it, the connection keeps working and an alert asks for a sign-in with a team
account. `DELETE` revokes the sign-in at the server that issued it, when it offers that
(`revoked`); a sign-in is never pasted into the vault (`/v1/secrets` refuses an `oauth_grant`).
