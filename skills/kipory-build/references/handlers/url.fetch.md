<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `url.fetch` — Fetch raw URL content

Fetch raw text or JSON from a URL.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `string`
- **Reads:** One URL — the thing to fetch. Anything that is not `http` or `https`, or that resolves to a private address, is refused before the request goes out. _(shape hint: `string`)_
- **Emits:** The response body as text — JSON, plain text, anything that is not a web page. Nothing is rendered or re-encoded. Empty on no URL, or a site failure.
- **Suggested input streams:** `currentUrl`
- **External dependency:** The open web — Fetches whatever the URL points at, over plain HTTP, through the SSRF guard. No vendor and no key — the site itself is the dependency.
- **Rate limit:** 120 per 60000ms in bucket `url.fetch`
- **Queue:** 3 attempts, exponential from 500ms; waits up to 60000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxBytes` | integer | no | `5000000` | Reject responses larger than this before the slot cap applies. |
| `maxRedirects` | integer | no | `3` | Maximum HTTP redirect hops to follow. |
| `timeoutMs` | integer | no | `15000` | Request timeout in milliseconds. |

## Worked example

A plain GET for a JSON or text endpoint. For a web page, use `url.scrape` instead.

Reads: GET (SSRF-checked). Emits: decode UTF-8.

#### JSON API

Typical JSON endpoint — body returned as raw UTF-8 text (no parsing).

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://api.example.com/v1/users/42
```

Output:

```
{
  "id": 42,
  "name": "Sam Rivera",
  "team": "ingestion",
  "createdAt": "2025-11-03T14:21:00.000Z"
}
```

#### plaintext

Plain text endpoint — robots.txt, sitemap, etc.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://example.com/robots.txt
```

Output:

```
User-agent: *
Disallow: /admin/
Disallow: /internal/
Allow: /

Sitemap: https://example.com/sitemap.xml
```

#### non-http(s)

Non-`http(s)` URL — silently dropped at the URL parser. No request fires; output is the empty string.

Reads `string` → emits `string` · 1 in → (empty)

Input:

```
data:text/plain;base64,SGVsbG8=
```

Output:

```

```
