<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.scrape` — Fetch a web page

Read a web page and return its main text and details.

Loads a page in a real browser and returns it as clean markdown, together with the page's metadata. Handles pages that need scripts to render. Results are cached for a day by default.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `ScrapedPage`
- **Reads:** One URL — the page to scrape. Anything that is not `http` or `https` is refused before a call is spent; an empty slot emits an empty result. _(shape hint: `string`)_
- **Emits:** A `ScrapedPage` — the rendered body as markdown, plus its metadata. Empty, with a `SCRAPE_FAILED` or `RATE_LIMITED` warning rather than a failed run, when the page could not be rendered.
- **Softens these failures:** `rate-limited`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `currentUrl`
- **External dependency:** Firecrawl — Renders JS-heavy pages via the Firecrawl API. Uses a Firecrawl API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `firecrawl` (vendor: Firecrawl); falls through to the platform's own key when no node holds one.
- **Charged as:** `firecrawl/scrape` per call. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it.
- **Rate limit:** 10 per min in bucket `firecrawl` — shared with `url.screenshot`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `excludeTags` | string[] | no | `[]` | CSS selectors to strip from the page before the text is extracted. ⚠️ Use it for chrome the main-content pass keeps — a consent or accessibility widget sitting above the article is the common case, and the extractor can mistake it for the article. |
| `includeTags` | string[] | no | `[]` | CSS selectors to keep, dropping everything else. Narrower than excludeTags; leave empty unless the article container is known and stable. |
| `mainContentFallbackMinChars` | integer, at least 0 | no | `0` | When the main-content pass returns fewer characters than this, scrape the whole page too and keep the longer result. 0 turns the retry off. ⚠️ A non-zero value bills a second scrape on every page that trips it. |
| `onlyMainContent` | boolean | no | `true` | Strip navigation, footers, and ads — request article body only. |
| `timeoutMs` | integer, more than 0 | no | `30000` | How long to wait for the provider, in milliseconds. ⚠️ Shares its name with the action's own `timeoutMs` run setting and is not it: this one, inside `functionConfig`, bounds the one page read. |

## Worked example

Renders any web page to clean markdown and returns the body alongside the page's metadata.

#### An article

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

#### A bare page

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

#### Bad address

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
