<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `url.scrape` — Scrape a web page

Scrape a web page into clean markdown and page metadata.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `ScrapedPage`
- **Reads:** One URL — the page to scrape. Anything that is not `http` or `https` is refused before a call is spent; an empty slot emits an empty result. _(shape hint: `string`)_
- **Emits:** A `ScrapedPage` — the rendered body as markdown, plus the page's metadata read from that render. Empty when the URL is missing or the site could not be read.
- **Suggested input streams:** `currentUrl`
- **External dependency:** Firecrawl — Renders JS-heavy pages via the Firecrawl API (KIPORY_FIRECRAWL_API_KEY).
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `firecrawl` (vendor: Firecrawl); falls through to the platform's own key when no node holds one.
- **Rate limit:** 10 per 60000ms in bucket `firecrawl` — shared with `url.screenshot`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `cacheTtlMinutes` | integer | no | — | How long to reuse a scrape of this URL, in minutes. Leave it unset for the 24-hour default. ⚠️ A listing page IS the freshness signal, so give it a short value near your poll interval — a cached index replays the same links and nothing new is ever found. |
| `excludeTags` | string[] | no | `[]` | CSS selectors to strip from the page before the text is extracted. ⚠️ Use it for chrome the main-content pass keeps — a consent or accessibility widget sitting above the article is the common case, and the extractor can mistake it for the article. |
| `includeTags` | string[] | no | `[]` | CSS selectors to keep, dropping everything else. Narrower than excludeTags; leave empty unless the article container is known and stable. |
| `mainContentFallbackMinChars` | integer | no | `0` | When the main-content pass returns fewer characters than this, scrape the whole page too and keep the longer result. 0 turns the retry off. ⚠️ A non-zero value bills a second scrape on every page that trips it. |
| `onlyMainContent` | boolean | no | `true` | Strip navigation, footers, and ads — request article body only. |
| `timeoutMs` | integer | no | `30000` | How long to wait for the provider, in milliseconds. |

## Worked example

Renders any web page to clean markdown and returns the body alongside the page's metadata.

Reads: fetch + render. Emits: content + meta.

#### typical article

Article page with full OpenGraph metadata.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://example.com/blog/2026/launch
```

Output:

```
{
  "content": "# Launch retrospective — what went well, what didn't\n\nTwo months after the cut-over to the new ingest pipeline, we wrapped up our retrospective. Three things that surprised us…\n\n## What went well\n- Latency under the new fan-out runner held flat at p95 …",
  "meta": {
    "url":         "https://example.com/blog/2026/launch",
    "finalUrl":    "https://example.com/blog/2026/launch",
    "httpStatus":  200,
    "contentType": "text/html; charset=utf-8",
    "title":       "Launch retrospective — what went well, what didn't",
    "author":      "Sam Rivera",
    "publishedAt": "2026-04-12T08:00:00.000Z",
    "siteName":    "Example Engineering",
    "ogImage":     "https://example.com/og/launch.png"
  }
}
```

#### metadata-poor

Page without OpenGraph tags — `meta` carries only the structural fields; every optional meta tag stays unset.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://wiki.example.org/internal/notes
```

Output:

```
{
  "content": "# Internal notes — Q2 planning\n\nRough capacity numbers below; not yet reviewed.\n\n| Team | Engineers | Slack capacity |\n| ---- | --------- | -------------- |\n| Ingestion | 4 | 0.5 |\n| Search | 3 | 1.0 |\n\nOwner: TBD.",
  "meta": {
    "url":         "https://wiki.example.org/internal/notes",
    "finalUrl":    "https://wiki.example.org/internal/notes",
    "httpStatus":  200,
    "contentType": "text/html"
  }
}
```

#### invalid URL

Not an `http` or `https` URL, so it is dropped before any call. The result is empty.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
ftp://legacy.example.com/old-archive
```

Output:

```
{}
```
