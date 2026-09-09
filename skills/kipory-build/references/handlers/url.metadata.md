<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `url.metadata` — Fetch page metadata

Fetch a URL's title, description, content type, icon, and social preview.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `UrlMeta`
- **Reads:** One URL — the page to read. Anything that is not `http` or `https`, or that resolves to a private address, is refused before the request goes out. _(shape hint: `string`)_
- **Emits:** A `UrlMeta`. Every meta field is optional — a page that declares no tag leaves it unset — and a page that could not be read comes back empty.
- **Suggested input streams:** `currentUrl`
- **External dependency:** The open web — Reads the page's head over plain HTTP. No JS render and no vendor — the site itself is the dependency.
- **Rate limit:** 120 per 60000ms in bucket `url.metadata`
- **Queue:** 2 attempts, exponential from 1000ms; waits up to 30000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `failureMode` | `hard` \| `soft` | no | `"hard"` | What happens when the site cannot be reached. `hard` fails the step; `soft` returns an empty result and lets the flow carry on. ⚠️ This is only about not reaching the site. An HTTP error like 403 or 404 already returns what it can either way, and a hostname that will not resolve stays hard. |
| `maxBytes` | integer | no | `65536` | Cap on bytes parsed for `<head>` meta. The handler asks for a Range and truncates anyway; this is the second-line guard. |
| `maxRedirects` | integer | no | `5` | Maximum HTTP redirect hops to follow before giving up. |
| `timeoutMs` | integer | no | `10000` | Request timeout in milliseconds. Probe is meant to be fast. |

## Worked example

Reads only the head of a page, so a step can decide whether the URL is worth scraping in full.

Reads: fetch + parse head. Emits: structured meta.

#### typical article

An article with full social metadata. `iconUrl` is the site's square mark; `ogImage` is the wide banner.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://example.com/blog/2026/launch
```

Output:

```
{
  "url":         "https://example.com/blog/2026/launch",
  "finalUrl":    "https://example.com/blog/2026/launch",
  "httpStatus":  200,
  "contentType": "text/html; charset=utf-8",
  "title":       "Launch retrospective — what went well, what didn't",
  "ogImage":     "https://example.com/og/launch.png",
  "iconUrl":     "https://example.com/icons/apple-touch-icon.png",
  "ogType":      "article",
  "siteName":    "Example Engineering",
  "publishedAt": "2026-04-12T08:00:00.000Z",
  "author":      "Sam Rivera",
  "description": "Two months after the cut-over to the new ingest pipeline…"
}
```

#### no icon declared (convention fallback)

The page declares no icon, so `iconUrl` guesses `/favicon.ico`. Nothing checks that guess before you use it.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://plainsite.example.com/some/deep/page?ref=nav
```

Output:

```
{
  "url":         "https://plainsite.example.com/some/deep/page?ref=nav",
  "finalUrl":    "https://plainsite.example.com/some/deep/page?ref=nav",
  "httpStatus":  200,
  "contentType": "text/html; charset=utf-8",
  "title":       "A page with no icon tag",
  "iconUrl":     "https://plainsite.example.com/favicon.ico"
}
```

#### image URL (parse skipped)

Not a web page, so only the structural fields are recorded and the body is never parsed.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://images.example.com/banner.jpg
```

Output:

```
{
  "url":         "https://images.example.com/banner.jpg",
  "finalUrl":    "https://images.example.com/banner.jpg",
  "httpStatus":  200,
  "contentType": "image/jpeg"
}
```

#### broken URL (404)

The page answered with an error, so the status is recorded and the body is skipped.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://example.com/missing
```

Output:

```
{
  "url":         "https://example.com/missing",
  "finalUrl":    "https://example.com/missing",
  "httpStatus":  404,
  "contentType": "text/html; charset=utf-8"
}
```

#### unreachable site (failureMode: soft)

The connection never opened, so there is no status. `soft` returns an empty result with a warning.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://offline.example.com/article
```

Output:

```
{}

// warning: FETCH_FAILED
//   "url.metadata: connect ECONNREFUSED 203.0.113.7:443"
```
