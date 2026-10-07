<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `x.posts` — Fetch X posts

Read the posts from an X post, profile, or search link.

Reads one X URL — a post, a profile, or a search — into a list of posts, each with its text, author, time, media and engagement counts.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `XPost[]`
- **Reads:** One X URL — a single post, a profile, or a search. Results are cached for a day by default. _(shape hint: `string`)_
- **Emits:** A list of `XPost`, in the order the source gave them. An empty list when the source returns nothing.
- **Suggested input streams:** `source`
- **External dependency:** Apify, twitterapi.io or ScrapeCreators — Each step picks its vendor (`provider`): Apify's `twitter-scraper-lite` actor, the default, twitterapi.io's API, or ScrapeCreators, which reads a post or a profile but not a search. Its profile read is one request returning about a hundred of the account's most popular posts, whatever `sort` and `maxItems` say — not a timeline to watch for new posts. With `fallback` on — the default — a failed vendor hands the URL to the next, and the output says which answered; a key the chosen vendor refuses fails the step instead. Each vendor uses its own API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** one per vendor the step's `provider` names, each resolved from the secrets vault and falling through to the platform's own key when no node holds one: `apify` (the default) — type `api_key`, purpose `apify`; `twitterapi` — type `api_key`, purpose `twitterapi`; `scrapecreators` — type `api_key`, purpose `scrapecreators`.
- **Charged as:** with `provider: "apify"` (the default): `apify/x-search` per call; `apify/x-search-item` per item — a post returned; `apify/x-single-tweet` per call · with `provider: "twitterapi"`: `twitterapi/x-post` per item — a post returned; `twitterapi/x-user-lookup` per call · with `provider: "scrapecreators"`: `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and a step makes one request. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it. A step answered by another vendor through `fallback` is charged that vendor's rows, not its chosen one's.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.reviews`, `place.search`, `telegram.search-channels`, `web.rankings`, `web.search`, `web.traffic`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `fallback` | boolean | no | `true` | If the chosen vendor errors, is rate-limited or has no key, try the others in turn. An empty answer does not fall back. ⚠️ A fallback is billed by the vendor that answered — a step whose chosen vendor runs on your own key can be charged for the other vendor on the platform's. |
| `maxItems` | integer, more than 0, at most 100 | no | `20` | How many posts to pull for a profile or search URL, up to 100. A single-post URL returns one regardless. ⚠️ This bound is required, not a nicety — without it a single pasted link would pull everything the source will give, up to hundreds of posts. |
| `provider` | `apify` \| `twitterapi` \| `scrapecreators` | no | `"apify"` | Which vendor does the work: apify or twitterapi or scrapecreators. Each spends its own key and bills at its own rate. "apify" when left unset. |
| `sort` | `Latest` \| `Top` \| `Latest + Top` | no | `"Latest"` | Result ordering for profile/search scrapes. 'Top' surfaces high-engagement posts; 'Latest' the most recent. |

## Worked example

Reads one X URL — a post, a profile, or a search — into a list of posts.

#### A profile

The account's recent posts, each with its text, time, counts and whether it is a repost or a reply.

Reads `string` → emits `XPost[]` · 1 in → 1 out

Input:

```
https://x.com/paulg
```

Output:

```
[
  {
    "platform": "x",
    "id": "1900000000000000000",
    "url": "https://x.com/paulg/status/1900000000000000000",
    "text": "The best way to get startup ideas is …",
    "author": { "handle": "paulg", "name": "Paul Graham", "url": "https://x.com/paulg", "verified": true },
    "postedAt": "2026-03-13T08:00:00.000Z",
    "language": "en",
    "counts": { "likes": 4210, "comments": 181, "shares": 392, "views": 601200 },
    "isRepost": false,
    "isReply": false,
    "provider": "apify"
  },
  ...
]
```
