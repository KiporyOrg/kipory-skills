<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.metadata` — Fetch a page's title and preview

Read a web page's title, description, icon, and preview image.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `UrlMeta`
- **Reads:** One URL — the page to read. Anything that is not `http` or `https`, or that resolves to a private address, is refused before the request goes out. _(shape hint: `string`)_
- **Emits:** A `UrlMeta`; a meta tag the page lacks stays unset, and an unreadable page comes back empty. Only `&amp;` `&lt;` `&gt;` `&quot;` `&#39;` `&apos;` are decoded; others stay as written.
- **Suggested input streams:** `currentUrl`
- **External dependency:** the open web — Reads the page's head over plain HTTP. No JS render and no vendor — the site itself is the dependency.
- **Rate limit:** 120 per min in bucket `url.metadata`
- **Queue:** 2 attempts, exponential from 1 s; waits up to 30 s; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `failureMode` | `hard` \| `soft` | no | `"hard"` | What happens when the site cannot be reached. `hard` fails the step; `soft` returns an empty result and lets the flow carry on. ⚠️ Only covers an unreachable site. HTTP 403 or 404 returns what it can either way; an unresolvable or private-address host stays hard. To continue past those, set the step's `onFailure` to `continue`. |
| `maxBytes` | integer, more than 0 | no | `65536` | Cap on bytes parsed for `<head>` meta. The handler asks for a Range and truncates anyway; this is the second-line guard. |
| `maxRedirects` | integer, 0 to 10 | no | `5` | Maximum HTTP redirect hops to follow before giving up. |
| `timeoutMs` | integer, more than 0 | no | `10000` | Request timeout in milliseconds. Probe is meant to be fast. ⚠️ Shares its name with the step's own `timeoutMs` run setting and is not it: this one, inside `handlerConfig`, bounds the one request. |

## Worked example

Reads only the head of a page, so a step can decide whether the URL is worth scraping in full.

#### An article

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

#### No icon declared

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

#### An image link

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

#### Page not found

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

#### Site is down

The connection never opened. The step still succeeds, with an empty result and a warning.

Reads `string` → emits `string` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "failureMode": "soft"
}
```

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
