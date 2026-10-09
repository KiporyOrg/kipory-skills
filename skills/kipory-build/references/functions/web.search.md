<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `web.search` — Search the web

Search the web and return the results.

Runs one search query and returns its organic results, reading pages until it has `maxResults` or is within a few of it. Each page read is charged. A search that runs out of time or pages returns what it read and warns.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `WebSearchResults`
- **Reads:** One search query. Each page of results read is charged; a page holds about ten, often fewer. _(shape hint: `string`)_
- **Emits:** A `WebSearchResults`. Warns `TRUNCATED` when time or pages ran out well short, `NO_RESULTS` with no value when nothing is found or kept, and `SEARCH_FAILED` when it could not be made.
- **Softens these failures:** `rate-limited`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `query`
- **External dependency:** Apify — Runs Apify's `google-search-scraper` actor. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Charged as:** `apify/web-search` per item — a page of search results read, about ten results. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.reviews`, `place.search`, `telegram.search-channels`, `web.rankings`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `after` | string | no | — | Return only results from this day on, as `YYYY-MM-DD`. |
| `before` | string | no | — | Return only results up to this day, as `YYYY-MM-DD`. |
| `countryCode` | `af` \| `al` \| `dz` \| `as` \| `ad` \| `ao` \| `ai` \| `aq` \| `ag` \| `ar` \| `am` \| `aw` \| `au` \| `at` \| `az` \| `bs` \| `bh` \| `bd` \| `bb` \| `by` \| `be` \| `bz` \| `bj` \| `bm` \| `bt` \| `bo` \| `ba` \| `bw` \| `bv` \| `br` \| `io` \| `bn` \| `bg` \| `bf` \| `bi` \| `kh` \| `cm` \| `ca` \| `cv` \| `ky` \| `cf` \| `td` \| `cl` \| `cn` \| `cx` \| `cc` \| `co` \| `km` \| `cg` \| `cd` \| `ck` \| `cr` \| `ci` \| `hr` \| `cu` \| `cy` \| `cz` \| `dk` \| `dj` \| `dm` \| `do` \| `ec` \| `eg` \| `sv` \| `gq` \| `er` \| `ee` \| `et` \| `fk` \| `fo` \| `fj` \| `fi` \| `fr` \| `gf` \| `pf` \| `tf` \| `ga` \| `gm` \| `ge` \| `de` \| `gh` \| `gi` \| `gr` \| `gl` \| `gd` \| `gp` \| `gu` \| `gt` \| `gn` \| `gw` \| `gy` \| `ht` \| `hm` \| `va` \| `hn` \| `hk` \| `hu` \| `is` \| `in` \| `id` \| `ir` \| `iq` \| `ie` \| `il` \| `it` \| `jm` \| `jp` \| `jo` \| `kz` \| `ke` \| `ki` \| `kp` \| `kr` \| `kw` \| `kg` \| `la` \| `lv` \| `lb` \| `ls` \| `lr` \| `ly` \| `li` \| `lt` \| `lu` \| `mo` \| `mk` \| `mg` \| `mw` \| `my` \| `mv` \| `ml` \| `mt` \| `mh` \| `mq` \| `mr` \| `mu` \| `yt` \| `mx` \| `fm` \| `md` \| `mc` \| `mn` \| `me` \| `ms` \| `ma` \| `mz` \| `mm` \| `na` \| `nr` \| `np` \| `nl` \| `an` \| `nc` \| `nz` \| `ni` \| `ne` \| `ng` \| `nu` \| `nf` \| `mp` \| `no` \| `om` \| `pk` \| `pw` \| `ps` \| `pa` \| `pg` \| `py` \| `pe` \| `ph` \| `pn` \| `pl` \| `pt` \| `pr` \| `qa` \| `re` \| `ro` \| `ru` \| `rw` \| `sh` \| `kn` \| `lc` \| `pm` \| `vc` \| `ws` \| `sm` \| `st` \| `sa` \| `sn` \| `rs` \| `sc` \| `sl` \| `sg` \| `sk` \| `si` \| `sb` \| `so` \| `za` \| `gs` \| `es` \| `lk` \| `sd` \| `sr` \| `sj` \| `sz` \| `se` \| `ch` \| `sy` \| `tw` \| `tj` \| `tz` \| `th` \| `tl` \| `tg` \| `tk` \| `to` \| `tt` \| `tn` \| `tr` \| `tm` \| `tc` \| `tv` \| `ug` \| `ua` \| `ae` \| `gb` \| `us` \| `um` \| `uy` \| `uz` \| `vu` \| `ve` \| `vn` \| `vg` \| `vi` \| `wf` \| `eh` \| `ye` \| `zm` \| `zw` \| `uk` | no | — | The country to search from, as a lower-case 2-letter code like 'us', 'de' or 'il'. Omit to search from the United States. ⚠️ The United Kingdom is gb; uk is read as gb. |
| `excludeSites` | string[], 1 to 20 items | no | — | Leave out results on these hosts and their subdomains. |
| `excludeUrlContains` | string[], 1 to 20 items | no | — | Leave out results whose address contains one of these texts, like `/p/` for a post. |
| `includeUrlContains` | string[], 1 to 20 items | no | — | Keep only results whose address contains one of these texts. |
| `languageCode` | `af` \| `sq` \| `sm` \| `ar` \| `az` \| `eu` \| `be` \| `bn` \| `bh` \| `bs` \| `bg` \| `ca` \| `zh-CN` \| `zh-TW` \| `hr` \| `cs` \| `da` \| `nl` \| `en` \| `eo` \| `et` \| `fo` \| `fi` \| `fr` \| `fy` \| `gl` \| `ka` \| `de` \| `el` \| `gu` \| `iw` \| `hi` \| `hu` \| `is` \| `id` \| `ia` \| `ga` \| `it` \| `ja` \| `jw` \| `kn` \| `ko` \| `la` \| `lv` \| `lt` \| `mk` \| `ms` \| `ml` \| `mt` \| `mr` \| `ne` \| `no` \| `nn` \| `oc` \| `fa` \| `pl` \| `pt-BR` \| `pt-PT` \| `pa` \| `ro` \| `ru` \| `gd` \| `sr` \| `si` \| `sk` \| `sl` \| `es` \| `su` \| `sw` \| `sv` \| `tl` \| `ta` \| `te` \| `th` \| `ti` \| `tr` \| `uk` \| `ur` \| `uz` \| `vi` \| `cy` \| `xh` \| `zu` \| `he` \| `jv` \| `nb` \| `fil` | no | — | The search's interface language, as a lower-case ISO 639-1 code like 'en', 'de' or 'he'. Omit for the search engine's default. ⚠️ Chinese and Portuguese name their variant: zh-CN, zh-TW, pt-BR or pt-PT. |
| `maxResults` | integer, more than 0, at most 50 | no | `10` | The most results to return, up to 50. Pages of about ten are read until it is nearly met, each one charged. ⚠️ Each page read is charged, and thin pages mean up to two more than one per ten results. A search that finds nothing is charged its page, and the answer is cached. |
| `maxResultsSlot` | string, at most 512 characters | no | — | A slot holding this run's bound, a whole number from 1 to 50. It replaces `maxResults`. ⚠️ A value that is not a whole number in range fails the action. An empty slot falls back to `maxResults`. |
| `resultsLanguage` | `ar` \| `bg` \| `ca` \| `cs` \| `da` \| `de` \| `el` \| `en` \| `es` \| `et` \| `fi` \| `fr` \| `hr` \| `hu` \| `id` \| `is` \| `it` \| `iw` \| `ja` \| `ko` \| `lt` \| `lv` \| `nl` \| `no` \| `pl` \| `pt` \| `ro` \| `ru` \| `sk` \| `sl` \| `sr` \| `sv` \| `th` \| `tr` \| `uk` \| `zh-CN` \| `zh-TW` \| `he` | no | — | Return only pages written in this language, as a code like 'en', 'ru', 'ar' or 'he'. |
| `since` | `day` \| `week` \| `month` \| `year` | no | — | Return only results from the last day, week, month or year. |
| `sites` | string[], 1 to 20 items | no | — | Keep only results on these hosts, like `instagram.com`. A host covers its subdomains. ⚠️ A result read and then left out by `sites`, `excludeSites` or an address text is still charged with its page. `dropped` counts them. |

## Worked example

Runs one search and returns the organic results with the related searches beside them. Ads are dropped.

#### A topic search

One page was enough for ten results, so one page is charged. `hasMore` says more exist.

Reads `string` → emits `WebSearchResults` · 1 in → 1 out

Input:

```
artemis program launch schedule
```

Output:

```
{
  "query": "artemis program launch schedule",
  "results": [
    { "title": "Artemis — NASA", "url": "https://nasa.gov/artemis", "snippet": "…", "position": 1 }
  ],
  "pagesRead": 1,
  "hasMore": true,
  "dropped": 0,
  "relatedSearches": ["artemis 3 launch date"],
  "questions": [{ "question": "When is the next Artemis launch?" }]
}
```
