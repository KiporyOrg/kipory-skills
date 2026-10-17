<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.fetch-as-file` — Fetch a web address as a file

Download a web address and save it as a file.

Keeps the file on the record and returns a reference to it.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A new run that keeps the record's files saves this file again under the new attempt's key.
- **Not undone when a run fails:** `file` — The file's bytes are stored while the action runs. A later attempt of the run stores them again under its own key; a file no record keeps is removed by the platform later. Doing it twice is not harmless; a failed run lists it in `closing.unstagedEffects`.
- **I/O:** `string` → `file`
- **Also found as:** download, download file, save file from url, attachment
- **Reads:** One URL — the thing to download. Anything that is not `http` or `https`, or that resolves to a private address, is refused. _(shape hint: `string`)_
- **Emits:** A `FileRef` for the downloaded bytes, saved to storage. An empty one when the URL is missing, or when a soft failure turns a failed download into a warning.
- **Softens these failures:** `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `currentUrl`
- **External dependency:** the open web — Fetches whatever the URL points at, through the SSRF guard, and stores the bytes. The site itself is the dependency. A service that needs a key takes a stored request credential, named in `secret`.
- **Action credential:** an action may name a stored secret of type `http_credential` in `secret`, by its purpose; resolved from the project's node and the organisations above it, with no platform fallback.
- **Rate limit:** 60 per min in bucket `outbound-request`, counted per project and host addressed — shared with `url.fetch`
- **Queue:** 3 attempts, exponential from 1 s; waits up to 1 min 30 s; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `allowedMimePatterns` | string[] | no | — | Content types to accept, as RE2 regular expressions; empty accepts anything. |
| `bodyAs` | `json` \| `form` \| `text` | no | — | How to send the body: `json` (default), `form` or `text`. ⚠️ Under `json` a string is sent quoted; for your own text use `text` and `contentType`. |
| `bodySlot` | string, at most 4096 characters | no | — | The slot holding the request body, built by an earlier action. |
| `contentType` | string, at most 128 characters | no | — | The content type of a `text` body. |
| `failureMode` | `hard` \| `soft` | no | `"hard"` | `hard` fails the action; `soft` returns an empty file and continues. ⚠️ A bad address, private address or storage failure fails the action even under `soft`. |
| `headerSlots` | object | no | — | Headers read from slots; an empty slot leaves one out. |
| `headers` | object | no | — | Headers with fixed values; put a credential in `secret` instead. |
| `maxBytes` | integer, more than 0, at most 100000000 | no | `25000000` | Largest download in bytes; a bigger one fails. |
| `maxRedirects` | integer, 0 to 10 | no | `5` | How many redirects to follow at most. |
| `method` | `GET` \| `POST` | no | — | GET (default), or POST for a service that needs it. ⚠️ A POST may be sent several times and cached, so use it only where it changes nothing. |
| `query` | object | no | — | Query parameters with fixed values, added to the address. |
| `querySlots` | object | no | — | Query parameters read from slots; an empty slot leaves one out. |
| `secret` | string, at most 128 characters | no | — | The name of a stored request credential to send. ⚠️ Sent only over `https`; if the credential lists hosts, any other host fails. |
| `timeoutMs` | integer, more than 0 | no | `30000` | HTTP request timeout in milliseconds. ⚠️ This limits the one request, not the action's own `timeoutMs` run setting. |
| `userAgent` | `kipory` \| `browser` | no | — | `kipory`, the default, or `browser` for a site refusing Kipory's reader. |

## Worked example

Downloads what a URL returns and saves it as a file on the record, so a later action can process it.

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

The page answers `text/html`, which the action does not accept, so the download is refused.

Reads `string` → emits `file` · 1 in → 1 out

Action settings (`functionConfig`):

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
