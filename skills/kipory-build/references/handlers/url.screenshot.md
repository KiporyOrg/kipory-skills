<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `url.screenshot` — Capture a page screenshot

Capture a web page screenshot as an image file.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **I/O:** `string` → `file`
- **Reads:** One URL — the page to capture. Anything that is not `http` or `https` is refused before the request goes out. _(shape hint: `string`)_
- **Emits:** A `FileRef` for the captured image — PNG by default, JPEG when you ask for it. An empty one when there was no URL to capture.
- **Suggested input streams:** `currentUrl`
- **External dependency:** Firecrawl — Renders the page in a headless browser and captures a full-page screenshot via the Firecrawl API (KIPORY_FIRECRAWL_API_KEY).
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `firecrawl` (vendor: Firecrawl); falls through to the platform's own key when no node holds one.
- **Rate limit:** 10 per 60000ms in bucket `firecrawl` — shared with `url.scrape`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 120000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `format` | `png` \| `jpeg` | no | `"png"` | Output image format. PNG is lossless; JPEG is smaller and accepts a quality knob. |
| `jpegQuality` | integer | no | `85` | JPEG quality (1-100). Only used when format is jpeg; ignored for png. 85 is a sensible default for screenshots. |
| `maxBytes` | integer | no | `10000000` | Hard cap on the persisted image size. Larger responses fail the handler rather than silently truncate. |
| `timeoutMs` | integer | no | `60000` | How long to wait for the provider, in milliseconds. |
| `viewportWidth` | integer | no | `1280` | Viewport width in CSS pixels. Height is implicit — the handler always renders a full-page capture. |

## Worked example

Loads the page in a headless browser and captures the whole thing as an image file.

Reads: render + capture. Emits: attachFile → FileRef.

#### typical PNG

Default config — full-page PNG capture at 1280px viewport. Bytes land under the record's storage prefix.

Reads `string` → emits `file` · 1 in → 1 out

Input:

```
https://example.com/blog/2026/launch
```

Output:

```
{
  "key": "items/usr_ck.../2026/05/screenshot-12-3f8c1a2b.png",
  "name": "screenshot-example.com.png",
  "mime": "image/png"
}
```

#### JPEG q=70

JPEG output with `format: jpeg`, `jpegQuality: 70` — smaller bytes for high-volume archival flows.

Reads `string` → emits `file` · 1 in → 1 out

Input:

```
https://news.example.org/articles/feature
```

Output:

```
{
  "key": "items/usr_ck.../2026/05/screenshot-22-c1d4f0a2.jpg",
  "name": "screenshot-news.example.org.jpg",
  "mime": "image/jpeg"
}
```

#### invalid URL

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
