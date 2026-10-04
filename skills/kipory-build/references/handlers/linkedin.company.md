<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `linkedin.company` — Fetch a LinkedIn company page

Look up a company's public LinkedIn page.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialProfile`
- **Reads:** One LinkedIn company link (`linkedin.com/company/…`). Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A `SocialProfile`. A bare `{}` when the page does not exist.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads LinkedIn through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

_No operator-tunable config._

## Worked example

Looks up one company's public LinkedIn page from its link.

#### A company link

The company's public details.

Reads `string` → emits `SocialProfile` · 1 in → 1 out

Input:

```
https://www.linkedin.com/company/microsoft
```

Output:

```
{
  "platform": "linkedin", "handle": "microsoft", "name": "Microsoft",
  "url": "https://www.linkedin.com/company/microsoft",
  "bio": "Every company has a mission …",
  "data": { "industry": "Software Development", "employeeCount": 220000 }
}
```
