<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `x.posts` — Fetch X posts

Read the posts from an X post, profile, or search link.

A video's link is its largest file; a smaller one among its variants may fit a storage limit.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `XPost[]`
- **Also found as:** tweets, twitter posts, x feed
- **Reads:** One X URL — a single post, a profile, or a search. Results are cached for a day by default. _(shape hint: `string`)_
- **Emits:** A list of `XPost`, in the order the source gave them. An empty list when the source returns nothing.
- **Softens these failures:** `vendor-refused`, `rate-limited`, `not-found`, `error` — the step does not fail: the run's warnings carry the code with the step's key, and the step may give nothing (`checking.md` §6).
- **Inputs (`with`):** `source`
- **External dependency:** the vendors `servedBy` lists on `GET /v1/functions/x.posts` — Which vendors serve this function, in order, and what each keeps of a step's settings is listed live under `servedBy` on `GET /v1/functions/{key}`. A step may name its vendor (`vendor.use`) and say when it may move to the next (`vendor.switch`); a vendor that cannot keep the step's settings is refused at save. Each vendor uses its own API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** one per vendor serving the step, type `api_key`, its purpose the vendor's name as `servedBy` on `GET /v1/functions/x.posts` gives it; each is resolved from the secrets vault and falls through to Kipory's own accounts when no node holds one.
- **Vendor settings:** a step may name one vendor from `servedBy` in `vendor.use` (absent: the order `servedBy` lists), say when it may move to the next in `vendor.switch` (`never`, the default; `when-kipory-account-fails`; `when-vendor-fails`), and set `onTransient` (`fail`, the default, or `retry-later`) — `action-fields.md` §1. A vendor that cannot keep the step's settings is refused at save with `VENDOR_DOES_NOT_COVER`.
- **Charged as:** the operations of the vendor that served the action's run, each a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; `servedBy` on `GET /v1/functions/x.posts` lists the vendors serving this function, and a run's action detail names the one that served it in its own `servedBy`. An action spending a stored vendor key is not charged it.
- **Rate limit:** each serving vendor's own allowance, counted per project and shared with every function that reaches the same vendor.
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the function's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxItems` | integer, more than 0, at most 100 | no | `20` | How many posts a profile or search link returns, up to 100. ⚠️ Without this bound one pasted link would pull hundreds of posts. |
| `sort` | `Latest` \| `Top` \| `Latest + Top` | no | `"Latest"` | Order for profile or search links: `Top` for engagement, `Latest` for newest. |

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
