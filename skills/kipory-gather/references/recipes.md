# Two read recipes

Read this when building a page read that must not come back empty, or a feed reader: the steps for each.

<!-- field-ok: userInfo — an ambient value the platform fills, not a request field -->

## Scrape with a plain-fetch fallback

A page read that must not come back empty. Run the two sources side by side on the same `url` and
keep whichever filled:

```yaml
- key: read
  parallel:
    - key: scrape
      function: url.scrape
      with: { url: url }
    - key: fetch
      try:
        steps:
          - key: raw
            function: url.fetch
            with: { url: url }
        out: { raw: { path: raw, optional: true } }
      catch: { steps: [] }
  out:
    page: { path: scrape.content, optional: true }
    raw: { path: fetch.raw, optional: true }
- key: body
  function: value.transform
  with:
    expression: >-
      $ifEmpty(read.page, $trim($replace($replace($replace(read.raw,
      /<(script|style)[\s\S]*?<\/(script|style)>/i, " "), /<[^>]+>/, " "), /\s+/, " ")))
- key: summary
  if:
    - test: { filled: body }
      steps:
        - key: keyPoints
          function: text.generate
          with: { prompt: "The key points of {{url}}:\n\n{{body}}" }
      out: { points: keyPoints }
```

1. **Coalesce text with text.** `url.scrape` gives a `ScrapedPage` object and `url.fetch` the raw
   body as one string, so `body` weighs `content` (the scraped markdown) against the stripped
   fetch, never the bare objects. `$ifEmpty` takes the second when the first is nothing or `""`.
2. **Put the fetch in a `try`.** The two sources fail differently. `url.scrape` turns a vendor
   refusal into a warning and an empty page. `url.fetch` fails its step on a 4xx page, on an address
   that does not resolve and on a refused one, and outside a `try` one failed step fails the whole
   run, even when the scrape beside it worked: a sync endpoint answers `502`
   (`details.phase: "function-error"`, or `"target-unreachable"` for a name that does not resolve),
   or `400` "blocked network request" for a private address. Only a 5xx from the site comes back
   as an empty value with a `FETCH_FAILED` warning. Inside `catch`, `error` says why.
3. **Run every reader of `body` inside `if` with `{filled: body}`**, model steps included. Both
   reads may come back with nothing, and a prompt that also names `url` would otherwise reach the
   model with no page, and the model invents one. The save asks for this guard
   (`STEP_INPUT_MAY_BE_ABSENT`) and its finding carries the edit that adds it.

**With no vendor at all** — no Firecrawl key, or its credit spent — drop `scrape` and read the
stripped fetch as the body, and take the title from `url.metadata` on the same `url` (its `title`,
from the page's `<title>` or `og:title`). A page that builds its text in the browser comes back
nearly empty this way; an `if` on its length that ends in a `fail` step turns that into a clear
refusal (`kipory-build`'s `references/endpoint-answers.md`, endpoint answers and refusals).

## Reading an RSS or Atom feed

No function parses a feed. <!-- absent-function: feed.* --> The working shape is a fetch, a regex
cut and an `each`; each value looks its item up, then creates or updates it:

```yaml
- key: fetch
  function: url.fetch
  with: { url: feedUrl }
  reuseResultsForMinutes: 0
- key: feed
  if:
    - test: { filled: fetch }
      steps:
        - key: blocks
          function: text.extract
          with: { text: fetch, pattern: "<item[\\s\\S]*?</item>", flags: [i] }
        - key: perItem
          each: blocks
          as: block
          steps:
            - key: item
              function: value.transform
              with:
                expression: >-
                  { "title": $trim($match(block, /<title>([\s\S]*?)<\/title>/)[0].groups[0]),
                    "link": $trim($match(block, /<link>([\s\S]*?)<\/link>/)[0].groups[0]) }
            - key: store
              if:
                - test: { filled: item.link }
                  steps:
                    - key: found
                      function: record.list
                      with:
                        tableKey: post
                        limit: 1
                        fieldFilters:
                          [{ field: link, op: eq, value: item.link }]
                    - key: write
                      if:
                        - test: { filled: found.records }
                          steps:
                            - key: update
                              function: record.update
                              with:
                                {
                                  recordId: { expr: "found.records[0].id" },
                                  data: item,
                                }
                      else:
                        steps:
                          - key: create
                            function: record.create
                            with: { tableKey: post, data: item }
```

- **`url.fetch` returns the feed as one string**, whatever content type the server names, so
  `text.extract` reads the XML as text. Leave `responseAs` unset: `json` on XML fails the step.
- **Two size limits.** A body over the step's `maxBytes` (5,000,000 by default) fails the step. A
  body under it but over the value cap (500,000 characters unless the deployment set another) is
  cut to fit and ends in `[TRUNCATED]`, with only a `slot-truncated` warning on the run — so a
  large feed loses its last items, and the cut can land inside one.
- **A feed server that wants its own `Accept`.** `url.fetch` asks for JSON, XML and text, which a
  feed server accepts. For one that wants a different value, set `with.headers` to
  `{ "Accept": "…" }`; a header the step names replaces the default.
- **Set the fetch step's own cache.** `url.fetch` reuses an answer for 24 hours by default, so a
  poll that leaves `reuseResultsForMinutes` alone reads the same XML all day.
- **The cut is by tag.** RSS wraps an item in `<item>`, Atom in `<entry>` — use
  `<entry[\\s\\S]*?</entry>` there. `text.extract` returns every match as a list of strings.
- **Read a field with `$match`**, as in `item`. The link is `<link>…</link>` in RSS and the `href`
  attribute of `<link …/>` in Atom. Strip `<![CDATA[` … `]]>` where the feed uses it.
- **Look the link up before you write.** There is no upsert function, and a `key` use does not turn
  a create into an update. <!-- absent-function: record.upsert --> What `record.create` alone does with an item an earlier poll wrote:
  - **Unchanged item, project-wide table**: the record's id comes from its data, so
    `record.create` lands on the record that is already there and adds nothing.
  - **Changed item** (an edited title, a new date): with no `key` use it becomes a second
    record; with a `key` use on the link it is different data under a held key, the create is
    refused `RECORD_NATURAL_KEY_TAKEN`, and the whole poll writes nothing.
  - So match on the link first, as `found` does. Give the link field a `filter` use
    (`kipory-model`) so `found` can filter on it. `record.update` merges the new fields over the
    stored ones. The `store` test skips an item with no link, and an item `value.transform` gave
    nothing for.
  - A `key` use beside the `filter` use (`"uses": ["key", "filter"]`) is a backstop that
    refuses a second record under one link; it is never the update.
  - Store the items in a project-wide table. A scheduled poll has no end user, so a per-user
    table refuses there; and inside an `each` a per-user record gets a new id on every run.
  - Match on the link, not on the feed's `<guid>`, which is not always stable between fetches.

  `kipory-build`'s `references/endpoint-answers.md` (§8, natural-key collisions) has the
  refusal's details.

- **A feed is untrusted text** like any fetched page: `text.sanitize` it before a model reads it.
