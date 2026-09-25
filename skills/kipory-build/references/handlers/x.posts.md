<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `x.posts` — Scrape X posts

Scrape an X/Twitter tweet, profile or search URL into a page with its posts.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `ScrapedPage`
- **Reads:** One X URL — a single post, a profile, or a search. Results are cached for a day by default. _(shape hint: `string`)_
- **Emits:** A `ScrapedPage` — markdown body of the posts, a `UrlMeta` header, and a `data` bag carrying author stats, per-post languages and engagement. A bare `{}` when the source returns nothing.
- **Suggested input streams:** `source`
- **External dependency:** Apify or twitterapi.io — Each step picks its vendor (`provider`): Apify's `twitter-scraper-lite` actor (KIPORY_APIFY_API_KEY), the default, or twitterapi.io's API (KIPORY_TWITTERAPI_API_KEY). With `fallback` on — the default — a failed vendor hands the URL to the other, and the output says which answered.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per 60000ms in bucket `apify` — shared with `telegram.search-channels`, `web.rankings`, `web.search`, `web.traffic`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `fallback` | boolean | no | `true` | If the chosen vendor errors, is rate-limited or has no key, try the others in turn. An empty answer does not fall back. ⚠️ A fallback is billed by the vendor that answered — a step whose chosen vendor runs on your own key can be charged for the other vendor on the platform's. |
| `maxItems` | integer | no | `20` | How many posts to pull for a profile or search URL, up to 100. A single-post URL returns one regardless. ⚠️ This bound is required, not a nicety — without it a single pasted link would pull everything the source will give, up to hundreds of posts. |
| `provider` | `apify` \| `twitterapi` | no | `"apify"` | Which vendor does the work: apify or twitterapi. Each spends its own key and bills at its own rate. "apify" when left unset. |
| `sort` | `Latest` \| `Top` \| `Latest + Top` | no | `"Latest"` | Result ordering for profile/search scrapes. 'Top' surfaces high-engagement posts; 'Latest' the most recent. |

## Worked example

Scrapes one X URL — a post, a profile, or a search — into a page with the posts as markdown.

Reads: scrape posts. Emits: page + data.

#### profile URL

A profile digest — the posts rendered into the body, with author stats and engagement alongside.

Reads `string` → emits `ScrapedPage` · 1 in → 1 out

Input:

```
https://x.com/paulg
```

Output:

```
{
  "content": "**Paul Graham (@paulg ✓)** …",
  "meta": {
    "url":         "https://x.com/paulg",
    "finalUrl":    "https://x.com/paulg/status/1900000000000000000",
    "httpStatus":  200,
    "contentType": "text/html",
    "siteName":    "X",
    "ogType":      "profile"
  },
  "data": { "source": "x", "kind": "profile-or-search", "tweetCount": 20,
            "author": { "handle": "paulg", "followers": 4380126 },
            "languages": ["en"] }
}
```
