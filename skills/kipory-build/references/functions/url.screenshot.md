<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.screenshot` — Take a page screenshot

Take a picture of a web page.

Saves the page as a PNG or JPEG. Each fresh shot is paid; repeats within a day are reused.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A new run that keeps the record's files saves this file again under the new attempt's key.
- **Not undone when a run fails:** `file` — The file's bytes are stored while the action runs. A later attempt of the run stores them again under its own key; a file no record keeps is removed by the platform later. Doing it twice is not harmless; a failed run lists it in `closing.unstagedEffects`.
- **I/O:** `string` → `file`
- **Also found as:** website screenshot, capture page, page image
- **Reads:** One URL — the page to capture. Anything that is not `http` or `https` is refused before the request goes out. _(shape hint: `string`)_
- **Emits:** A `FileRef` for the captured image, PNG or JPEG. An empty one when there was no URL, or when a failed capture became a warning.
- **Softens these failures:** `rate-limited`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `currentUrl`
- **External dependency:** Firecrawl — Renders the page in a headless browser and captures a full-page screenshot via the Firecrawl API. Uses a Firecrawl API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `firecrawl` (vendor: Firecrawl); falls through to the platform's own key when no node holds one.
- **Charged as:** `firecrawl/screenshot` per call. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it.
- **Rate limit:** 10 per min in bucket `firecrawl`, counted per project — shared with `url.scrape`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 2 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `failureMode` | `hard` \| `soft` | no | `"hard"` | `hard` fails the action; `soft` returns an empty picture and continues. ⚠️ A refused key, an address that is not `http` or `https`, or a storage failure still fails the action. |
| `format` | `png` \| `jpeg` | no | `"png"` | Image format: PNG is lossless, JPEG is smaller. |
| `jpegQuality` | integer, 1 to 100 | no | `85` | JPEG quality from 1 to 100; used only for JPEG. |
| `maxBytes` | integer, more than 0 | no | `10000000` | Largest image in bytes; a bigger one fails. |
| `timeoutMs` | integer, more than 0 | no | `60000` | How long to wait for the provider, in milliseconds. ⚠️ This limits the one page read, not the action's own `timeoutMs` run setting. |
| `viewportWidth` | integer, more than 0 | no | `1280` | Page width in CSS pixels; the whole page height is captured. |

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

#### Carry on past a failure

Under `failureMode: "soft"`, a failed screenshot gives an empty file reference and a warning; the run goes on.

Reads `string` → emits `file` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "failureMode": "soft"
}
```

Input:

```
https://slow.example.org/very-long-page
```

Output:

```
{
  "key": "",
  "name": "",
  "mime": ""
}
```
