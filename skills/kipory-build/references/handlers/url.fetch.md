<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.fetch` — Fetch text from a web address

Download the text behind a web address.

Reads JSON, plaintext or an XML feed. The request can carry query parameters, headers, a body and a stored credential named in `secret`. A read may repeat and is cached, so a POST must change nothing. A 4xx or a refused address fails the step.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Reads:** One URL to fetch. Anything that is not `http` or `https`, resolves to a private address, or does not resolve at all is refused as a blocked request. _(shape hint: `string`)_
- **Emits:** The body as text, or parsed: an object under `json`, a list of objects under `json-list`. Empty, with a warning, on no URL or a 5xx; another non-2xx fails.
- **Suggested input streams:** `currentUrl`
- **External dependency:** the open web — Fetches whatever the URL points at, through the SSRF guard. No vendor — the site itself is the dependency. A service that needs a key takes a stored request credential, named in `secret`.
- **Step credential:** a step may name a stored secret of type `http_credential` in `secret`, by its purpose; resolved from the project's node and the organisations above it, with no platform fallback.
- **Rate limit:** 60 per min in bucket `outbound-request`, counted per project and host addressed — shared with `url.fetch-as-file`
- **Queue:** 3 attempts, exponential from 500 ms; waits up to 1 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `bodyAs` | `json` \| `form` \| `text` | no | — | How the body is sent: `json` (the default), `form` (an object of plain values, URL-encoded) or `text` (a string, as it is). ⚠️ Under `json` a string is sent quoted, as a JSON string. To send text you built yourself, use `text` and set `contentType`. |
| `bodySlot` | string, at most 4096 characters | no | — | The slot holding the request body, built by an earlier step. |
| `contentType` | string, at most 128 characters | no | — | The content type of a `text` body. |
| `headerSlots` | object | no | — | Request headers whose value is read from a slot. An empty slot leaves the header out. |
| `headers` | object | no | — | Request headers with fixed values. A credential does not go here: store it and name it in `secret`. |
| `maxBytes` | integer, more than 0 | no | `5000000` | Reject responses larger than this many bytes. ⚠️ A body under it can still exceed the slot cap (500 000 characters unless the deployment set another): its text is cut to fit, ends in `[TRUNCATED]`, and the run warns `slot-truncated`. |
| `maxRedirects` | integer, 0 to 10 | no | `3` | Maximum HTTP redirect hops to follow. |
| `method` | `GET` \| `POST` | no | — | GET, the default, or POST for a service that answers a query only by POST. ⚠️ A POST here is a read: it may be sent several times and is answered from the cache. Use it only where it changes nothing. |
| `query` | object | no | — | Query parameters with fixed values, appended to the address. One the address already carries is kept, not replaced. |
| `querySlots` | object | no | — | Query parameters whose value is read from a slot. An empty slot leaves the parameter out. |
| `responseAs` | `text` \| `json` \| `json-list` | no | — | `text`, the default, emits the body as text. `json` parses it and emits an object. `json-list` parses it and emits a list of objects. ⚠️ Pick by what the service returns: a list under `json` arrives under `value`, and anything but a list of objects fails `json-list`. A parsed value over the slot cap is replaced by an empty one. |
| `secret` | string, at most 128 characters | no | — | The name of a stored request credential. Its stored row says where in the request it goes and which hosts may receive it. ⚠️ Sent only over `https` on the default port. If the stored credential lists hosts, any other host fails before a request is made; with none listed, it goes wherever the step is addressed. |
| `timeoutMs` | integer, more than 0 | no | `15000` | Request timeout in milliseconds. ⚠️ Shares its name with the step's own `timeoutMs` run setting and is not it: this one, inside `handlerConfig`, bounds the one request. |

## Worked example

A plain GET for a JSON or text endpoint. For a web page, use `url.scrape` instead.

#### A JSON API

Typical JSON endpoint — body returned as raw UTF-8 text (no parsing).

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://api.example.com/v1/users/42
```

Output:

```
{
  "id": 42,
  "name": "Sam Rivera",
  "team": "ingestion",
  "createdAt": "2025-11-03T14:21:00.000Z"
}
```

#### A text file

Plain text endpoint — robots.txt, sitemap, etc.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://example.com/robots.txt
```

Output:

```
User-agent: *
Disallow: /admin/
Disallow: /internal/
Allow: /

Sitemap: https://example.com/sitemap.xml
```

#### Bad address

Non-`http(s)` URL — refused before any request fires. The step fails, and an endpoint over it answers 400.

Reads `string` → emits `string` · 1 in → (empty)

Input:

```
data:text/plain;base64,SGVsbG8=
```

Output:

```

```
