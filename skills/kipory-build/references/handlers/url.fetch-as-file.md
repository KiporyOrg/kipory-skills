<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `url.fetch-as-file` — Fetch URL as file

Download a URL and save the response body as a file.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **I/O:** `string` → `file`
- **Reads:** One URL — the thing to download. Anything that is not `http` or `https`, or that resolves to a private address, is refused. _(shape hint: `string`)_
- **Emits:** A `FileRef` for the downloaded bytes, saved to storage. An empty one when the URL is missing, or when a soft failure turns a failed download into a warning.
- **Suggested input streams:** `currentUrl`
- **External dependency:** The open web — Fetches whatever the URL points at, over plain HTTP, through the SSRF guard, and stores the bytes. The site itself is the dependency.
- **Rate limit:** 60 per 60000ms in bucket `url.fetch-as-file`
- **Queue:** 3 attempts, exponential from 1000ms; waits up to 90000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `allowedMimePatterns` | string[] | no | — | Content types to accept, as regular expressions. A response matching none of them fails the step. Leave it empty to accept anything. |
| `failureMode` | `hard` \| `soft` | no | `"hard"` | What happens when the download fails. `hard` fails the step; `soft` returns an empty file reference and lets the flow carry on. ⚠️ A bad URL, a private address, or a storage failure stays hard either way — `soft` only covers a download that could have worked. |
| `maxBytes` | integer | no | `25000000` | Hard cap on the downloaded response size. Larger responses fail the handler rather than silently truncate. |
| `maxRedirects` | integer | no | `5` | Maximum HTTP redirect hops to follow. SSRF re-validates the host on every hop to defeat DNS rebinding. |
| `timeoutMs` | integer | no | `30000` | HTTP request timeout in milliseconds. |

## Worked example

Downloads what a URL returns and saves it as a file on the record, so a later step can process it.

Reads: download bytes. Emits: attachFile → FileRef.

#### image download

PNG image at a CDN URL — `Content-Type: image/png` recognized, baseName derives from the URL pathname (`hero.png`).

Reads `string` → emits `file` · 1 in → 1 out

Input:

```
https://cdn.example.com/assets/hero.png
```

Output:

```
{
  "key": "items/usr_ck.../2026/05/hero-12-3f8c1a2b.png",
  "name": "hero.png",
  "mime": "image/png"
}
```

#### mime gate hit

The content type does not match what was allowed, so the download is refused.

Reads `string` → emits `file` · 1 in → 1 out

Input:

```
https://example.com/landing-page
```

Output:

```
Error: url.fetch-as-file: Content-Type "text/html" from
  https://example.com/landing-page does not match any allowedMimePatterns
```

#### invalid URL

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
