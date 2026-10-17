<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.fetch` — Fetch text from a web address

Download the text behind a web address.

Reads JSON, plain text or an XML feed. A 4xx answer or a refused address fails the action.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Also found as:** http, api call, json, rest api, get request, download text
- **Reads:** One URL to fetch. Anything that is not `http` or `https`, resolves to a private address, or does not resolve at all is refused as a blocked request. _(shape hint: `string`)_
- **Emits:** The body as text, or parsed: an object under `json`, a list of objects under `json-list`. Empty, with a warning, on no URL or a 5xx; another non-2xx fails.
- **Softens these failures:** `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `currentUrl`
- **External dependency:** the open web — Fetches whatever the URL points at, through the SSRF guard. No vendor — the site itself is the dependency. A service that needs a key takes a stored request credential, named in `secret`.
- **Action credential:** an action may name a stored secret of type `http_credential` in `secret`, by its purpose; resolved from the project's node and the organisations above it, with no platform fallback.
- **Rate limit:** 60 per min in bucket `outbound-request`, counted per project and host addressed — shared with `url.fetch-as-file`
- **Queue:** 3 attempts, exponential from 500 ms; waits up to 1 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `bodyAs` | `json` \| `form` \| `text` | no | — | How to send the body: `json` (default), `form` or `text`. ⚠️ Under `json` a string is sent quoted; for your own text use `text` and `contentType`. |
| `bodySlot` | string, at most 4096 characters | no | — | The slot holding the request body, built by an earlier action. |
| `contentType` | string, at most 128 characters | no | — | The content type of a `text` body. |
| `headerSlots` | object | no | — | Headers read from slots; an empty slot leaves one out. |
| `headers` | object | no | — | Headers with fixed values; put a credential in `secret` instead. |
| `maxBytes` | integer, more than 0, at most 100000000 | no | `5000000` | Reject responses larger than this many bytes. ⚠️ A body too long for its slot is cut to fit and ends in `[TRUNCATED]`. |
| `maxRedirects` | integer, 0 to 10 | no | `3` | Maximum HTTP redirect hops to follow. |
| `method` | `GET` \| `POST` | no | — | GET (default), or POST for a service that only answers POST. ⚠️ A POST may be sent several times and cached, so use it only where it changes nothing. |
| `query` | object | no | — | Query parameters with fixed values, added to the address. |
| `querySlots` | object | no | — | Query parameters read from slots; an empty slot leaves one out. |
| `responseAs` | `text` \| `json` \| `json-list` | no | — | `text` (default), `json` for an object, or `json-list` for a list. ⚠️ Under `json` a list arrives under `value`; `json-list` fails on anything but a list of objects. |
| `secret` | string, at most 128 characters | no | — | The name of a stored request credential to send. ⚠️ Sent only over `https`; if the credential lists hosts, any other host fails. |
| `timeoutMs` | integer, more than 0 | no | `15000` | Request timeout in milliseconds. ⚠️ This limits the one request, not the action's own `timeoutMs` run setting. |
| `userAgent` | `kipory` \| `browser` | no | — | `kipory`, the default, or `browser` for a site refusing Kipory's reader. |

## Worked example

A plain GET for a JSON or text endpoint. For a web page, use `url.scrape` instead.

#### A JSON API

Typical JSON endpoint — body returned as raw text (no parsing).

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

Non-`http(s)` URL — refused before any request fires. The action fails, and an endpoint over it answers 400.

Reads `string` → emits `string` · 1 in → (empty)

Input:

```
data:text/plain;base64,SGVsbG8=
```

Output:

```

```
