<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.fetch-as-file` — Fetch a web address as a file

Download a web address and save it as a file.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A new run that keeps the record's files saves this file again under the new attempt's key.
- **I/O:** `string` → `file`
- **Reads:** One URL — the thing to download. Anything that is not `http` or `https`, or that resolves to a private address, is refused. _(shape hint: `string`)_
- **Emits:** A `FileRef` for the downloaded bytes, saved to storage. An empty one when the URL is missing, or when a soft failure turns a failed download into a warning.
- **Suggested input streams:** `currentUrl`
- **External dependency:** the open web — Fetches whatever the URL points at, through the SSRF guard, and stores the bytes. The site itself is the dependency. A service that needs a key takes a stored request credential, named in `secret`.
- **Step credential:** a step may name a stored secret of type `http_credential` in `secret`, by its purpose; resolved from the project's node and the organisations above it, with no platform fallback.
- **Rate limit:** 60 per min in bucket `outbound-request`, counted per project and host addressed — shared with `url.fetch`
- **Queue:** 3 attempts, exponential from 1 s; waits up to 1 min 30 s; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `allowedMimePatterns` | string[] | no | — | Content types to accept, as regular expressions. A response matching none of them fails the step. Leave it empty to accept anything. |
| `bodyAs` | `json` \| `form` \| `text` | no | — | How the body is sent: `json` (the default), `form` (an object of plain values, URL-encoded) or `text` (a string, as it is). ⚠️ Under `json` a string is sent quoted, as a JSON string. To send text you built yourself, use `text` and set `contentType`. |
| `bodySlot` | string, at most 4096 characters | no | — | The slot holding the request body, built by an earlier step. |
| `contentType` | string, at most 128 characters | no | — | The content type of a `text` body. |
| `failureMode` | `hard` \| `soft` | no | `"hard"` | What happens when the download fails. `hard` fails the step; `soft` returns an empty file reference and lets the flow carry on. ⚠️ A bad URL, a private address, or a storage failure stays hard either way — `soft` covers a download that could not happen, including a site whose name no longer resolves. |
| `headerSlots` | object | no | — | Request headers whose value is read from a slot. An empty slot leaves the header out. |
| `headers` | object | no | — | Request headers with fixed values. A credential does not go here: store it and name it in `secret`. |
| `maxBytes` | integer, more than 0 | no | `25000000` | Hard cap on the downloaded response size. Larger responses fail the handler rather than silently truncate. |
| `maxRedirects` | integer, 0 to 10 | no | `5` | Maximum HTTP redirect hops to follow. SSRF re-validates the host on every hop to defeat DNS rebinding. |
| `method` | `GET` \| `POST` | no | — | GET, the default, or POST for a service that returns a file only to a POST. ⚠️ A POST here is a read: it may be sent several times and is answered from the cache. Use it only where it changes nothing. |
| `query` | object | no | — | Query parameters with fixed values, appended to the address. One the address already carries is kept, not replaced. |
| `querySlots` | object | no | — | Query parameters whose value is read from a slot. An empty slot leaves the parameter out. |
| `secret` | string, at most 128 characters | no | — | The name of a stored request credential. Its stored row says where in the request it goes and which hosts may receive it. ⚠️ Sent only over `https` on the default port. If the stored credential lists hosts, any other host fails before a request is made; with none listed, it goes wherever the step is addressed. |
| `timeoutMs` | integer, more than 0 | no | `30000` | HTTP request timeout in milliseconds. ⚠️ Shares its name with the step's own `timeoutMs` run setting and is not it: this one, inside `handlerConfig`, bounds the one request. |

## Worked example

Downloads what a URL returns and saves it as a file on the record, so a later step can process it.

#### An image

PNG image at a CDN URL — `Content-Type: image/png` recognized, baseName derives from the URL pathname (`hero.png`).

Reads `string` → emits `file` · 1 in → 1 out

Input:

```
https://cdn.example.com/assets/hero.png
```

Output:

```
{
  "key": "files/user/usr_ck.../2026/05/hero-12-3f8c1a2b.png",
  "name": "hero.png",
  "mime": "image/png"
}
```

#### Wrong file type

The page answers `text/html`, which the step does not accept, so the download is refused.

Reads `string` → emits `file` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "allowedMimePatterns": [
    "^image/"
  ]
}
```

Input:

```
https://example.com/landing-page
```

Output:

```
Error: url.fetch-as-file: Content-Type "text/html" from
  https://example.com/landing-page does not match any allowedMimePatterns
```

#### Bad address

Not a web address, so nothing is requested and the result is an empty file reference.

Reads `string` → emits `file` · 1 in → 1 out

Input:

```
ftp://legacy.example.com/archive.tar
```

Output:

```
{
  "key": "",
  "name": "",
  "mime": ""
}
```
