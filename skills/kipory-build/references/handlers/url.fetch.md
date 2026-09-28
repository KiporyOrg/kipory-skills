<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.fetch` — Fetch text from a web address

Download the text behind a web address.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Reads:** One URL to fetch. Anything that is not `http` or `https`, resolves to a private address, or does not resolve at all is refused as a blocked request. _(shape hint: `string`)_
- **Emits:** The response body as text, nothing rendered. Empty on no URL or a 5xx, with a warning. Any other non-2xx answer fails the step, and with it the run.
- **Suggested input streams:** `currentUrl`
- **External dependency:** the open web — Fetches whatever the URL points at, over plain HTTP, through the SSRF guard. No vendor and no key — the site itself is the dependency.
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

#### A JSON API

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

#### A text file

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

#### Bad address

Non-`http(s)` URL — refused before any request fires. The step fails, and an endpoint over it answers 400.

Reads `string` → emits `string` · 1 in → (empty)

Input:

```
data:text/plain;base64,SGVsbG8=
```

Output:

```

```
