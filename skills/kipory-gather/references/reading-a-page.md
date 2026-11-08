# Reading a page

Read this before choosing how a flow reads a URL: the four ways to read a page, and the one that must not come back empty.

## Choosing between the four ways to read a page

- **`url.fetch`** when the URL returns data — an API, a JSON or RSS feed, a text file. It renders nothing
  and re-encodes nothing. No vendor. A plain GET needs no config; an API that needs more takes
  `query`, `headers`, a POST `body` and a stored key named in `secret` (the `kipory-secrets`
  skill says how to store one). Set `responseAs` to `json` to address an object's fields, or to `json-list` for an API that returns
  a list of objects, which a fan-out can then walk. It is a
  read: it may be sent several times and is cached, so a POST here must change nothing.
  <!-- field-ok: body — a `url.fetch` config field, listed on the function's reference page -->
- **`url.metadata`** when you only need the head: title, description, icon. It reads the page's head
  over plain HTTP with no JS render, so it is cheap and it is wrong about pages that build their
  own title in the browser. It is also the liveness check: a site that cannot be reached does not
  fail the action. The output carries `failure.code` instead of `httpStatus`, one of
  `dns-not-found` (the name has no address), `connection-refused` (the host answered that nothing
  listens there), `tls-failed` (the certificate or handshake was refused), `redirect-limit` (more
  redirects than `maxRedirects`, or one that names no target), `timeout` (no answer within
  `timeoutMs`), `connection-reset` (the connection was dropped mid-request) and `unreachable`
  (anything else). Wire `failure.code` to store why; an action wired to `httpStatus` is skipped when
  the site never answered. To stop a flow on a dead site, put a condition on `failure`: the action
  itself no longer fails. An HTTP error such as 404 is an answer: it has `httpStatus` and no
  `failure`. A live page often reads `206`, not `200`, because the function asks for the head of the
  page only: test for a status below 400, or for `failure` being absent, never for `200`. A
  `flow.dispatch` that matches on `contentType` sends a dead site to its `default` branch, since
  the field is absent: branch on `failure` first. Only a missing name and a redirect dead end are
  remembered for the cache period; every other failure is read afresh next time.
- **`url.scrape`** when you need the readable body of a modern page. It renders JavaScript, which is
  why it costs a vendor call and sits in the tightest bucket.
- **`url.fetch-as-file`** when you want the bytes rather than the text — a PDF, an image, an
  archive. It stores them and emits a file reference for `kipory-extract` to open.

`url.send` is not a fifth way to read: it writes to an outside system, and has its own page,
`url-send.md`.

**A page read that must not come back empty** runs `url.scrape` and `url.fetch` side by side off
the same `url` slot and keeps whichever filled, with `value.first-non-empty`. Three things make it
work, and `recipes.md` (Scrape with a plain-fetch fallback) has the actions, the
tag-stripping expression and the no-vendor variant:

- coalesce text with text — `page.content` against the stripped fetch, never the bare objects;
- set `"onFailure": "continue"` on the `fetch` action, because `url.fetch` fails the action on a 4xx
  or an unresolvable address and one failed action fails the run; its `failureSlot` then says which,
  with `httpStatus` — 403 is a site refusing the fetch, 404 a page that is not there;
- guard every action that reads the body beside another slot with a `slotPresent` condition, model
  actions included — an action runs while any one input is present.

`url.fetch`, `url.fetch-as-file` and `url.metadata` go through an SSRF guard: they reach the open
web, not the deployment's own network. On `url.fetch` a host name that does not resolve is refused
by the same guard, so a typo in a URL reaches the caller as `400 BAD_REQUEST` "The flow attempted a
blocked network request.", not as a network error. `url.metadata` reports it as a value
(`failure.code: "dns-not-found"`), and `url.fetch-as-file` softens it when its `failureMode` is
`soft`. A private address is refused by all three, always.
