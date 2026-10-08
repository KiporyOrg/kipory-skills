<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `facebook.page` — Fetch a Facebook page

Look up a public Facebook page's details and numbers.

Reads one public Facebook page from its handle or page link: name, category, contact details, address, counts, its ad library id and whether it runs ads. A private page comes back marked private. A link to anything else is refused before anything is fetched.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `FacebookPage`
- **Reads:** One Facebook page handle, with or without `@`, or a page link. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A `FacebookPage`. A bare `{}` when the page does not exist; a private page has `isPrivate` set.
- **Softens these failures:** `vendor-refused`, `rate-limited`, `not-found`, `error` — the step still finishes with a warning, and a `failureSlot` on it then holds the code (`step-fields.md` §6).
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads Facebook through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and a step makes at most 2 requests. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `facebook.posts`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.search`, `instagram.search-profiles`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `withLastPost` | boolean | no | `false` | Also read when the page last posted, into lastPostAt. On, the step makes a second paid request. ⚠️ On, the step makes a second paid request, so it costs twice as much. |

## Worked example

Looks up one public Facebook page from its link.

#### A page link

The page's identity, contact details and counts.

Reads `string` → emits `FacebookPage` · 1 in → 1 out

Input:

```
https://www.facebook.com/harbourcycles
```

Output:

```
{
  "platform": "facebook", "id": "100088017857524",
  "handle": "harbourcycles", "name": "Harbour Cycles",
  "url": "https://www.facebook.com/harbourcycles",
  "category": "Bicycle Shop", "phone": "+31 15 555 0100",
  "website": "https://harbourcycles.example",
  "followerCount": 3200, "likeCount": 3224,
  "adLibraryId": "104359362513119", "runsAds": true
}
```
