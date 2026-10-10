<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.screenshot` — Take a page screenshot

Take a picture of a web page.

Renders a web page in full and saves the picture as a PNG or JPEG file. Returns a reference to that file. A fresh screenshot is a paid request; a repeat for the same record within a day is reused.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A new run that keeps the record's files saves this file again under the new attempt's key.
- **I/O:** `string` → `file`
- **Reads:** One URL — the page to capture. Anything that is not `http` or `https` is refused before the request goes out. _(shape hint: `string`)_
- **Emits:** A `FileRef` for the captured image — PNG by default, JPEG when you ask for it. An empty one when there was no URL to capture.
- **Softens these failures:** `rate-limited`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `currentUrl`
- **External dependency:** Firecrawl — Renders the page in a headless browser and captures a full-page screenshot via the Firecrawl API. Uses a Firecrawl API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `firecrawl` (vendor: Firecrawl); falls through to the platform's own key when no node holds one.
- **Charged as:** `firecrawl/screenshot` per call. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it.
- **Rate limit:** 10 per min in bucket `firecrawl` — shared with `url.scrape`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 2 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `format` | `png` \| `jpeg` | no | `"png"` | Output image format. PNG is lossless; JPEG is smaller and accepts a quality knob. |
| `jpegQuality` | integer, 1 to 100 | no | `85` | JPEG quality (1-100). Only used when format is jpeg; ignored for png. 85 is a sensible default for screenshots. |
| `maxBytes` | integer, more than 0 | no | `10000000` | Hard cap on the persisted image size. Larger responses fail the function rather than silently truncate. |
| `timeoutMs` | integer, more than 0 | no | `60000` | How long to wait for the provider, in milliseconds. ⚠️ Shares its name with the action's own `timeoutMs` run setting and is not it: this one, inside `functionConfig`, bounds the one page read. |
| `viewportWidth` | integer, more than 0 | no | `1280` | Viewport width in CSS pixels. Height is implicit — the function always renders a full-page capture. |

## Worked example

Loads the page in a headless browser and captures the whole thing as an image file.

#### As a PNG

Default config — full-page PNG capture at 1280px viewport. Bytes land under the record's storage prefix.

Reads `string` → emits `file` · 1 in → 1 out

Input:

```
https://example.com/blog/2026/launch
```

Output:

```
{
  "key": "files/user/usr_ck.../2026/05/screenshot-12-3f8c1a2b.png",
  "name": "screenshot-example.com.png",
  "mime": "image/png"
}
```

#### As a JPEG

A JPEG instead of a PNG — smaller bytes for high-volume archival flows.

Reads `string` → emits `file` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "format": "jpeg",
  "jpegQuality": 70
}
```

Input:

```
https://news.example.org/articles/feature
```

Output:

```
{
  "key": "files/user/usr_ck.../2026/05/screenshot-22-c1d4f0a2.jpg",
  "name": "screenshot-news.example.org.jpg",
  "mime": "image/jpeg"
}
```

#### Bad address

Not a web address, so nothing is captured and the result is an empty file reference.

Reads `string` → emits `file` · 1 in → 1 out

Input:

```
ftp://legacy.example.com/old-archive
```

Output:

```
{
  "key": "",
  "name": "",
  "mime": ""
}
```
