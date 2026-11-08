# Two read recipes

Read this when building a page read that must not come back empty, or a feed reader: the actions for each.

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->

## Scrape with a plain-fetch fallback

A page read that must not come back empty. Run the two sources side by side off the same `url`
slot and keep whichever filled:

```
scrape   url.scrape                  url → page            (page.content: rendered markdown, or "")
fetch    url.fetch                   url → raw             (the raw HTML/text, no vendor)
strip    value.transform             raw → plain           (tags stripped, below)
body     value.first-non-empty       { "inputs": ["page.content", "plain"], "valueKind": "string" } → body
```

1. **Coalesce text with text.** The two sources emit different types — `url.scrape` a
   `ScrapedPage` object, `url.fetch` the raw body as one string — so the `body` action reads
   `page.content` (the scraped markdown) against `plain`, never the bare `page` against `raw`. It
   lists every root it reads in `inputStreams` (`page`, `plain`), types them `ScrapedPage` and
   `string` in `inputSchemas`, and states `outputSchema` `string`.
2. **Strip the tags in `strip`.** The expression (in a JSON document every `\` doubles):

   ```
   $trim($replace($replace($replace(raw, /<(script|style)[\s\S]*?<\/(script|style)>/i, " "), /<[^>]+>/, " "), /\s+/, " "))
   ```

3. **Set `"onFailure": "continue"` on the `fetch` action.** The two sources fail differently.
   `url.scrape` turns a vendor refusal into a warning and an empty page. `url.fetch` fails the action
   on a 4xx page, on an address that does not resolve and on a refused one — and one failed action
   fails the whole run, even when the scrape beside it worked: a sync endpoint answers `502`
   (`details.phase: "function-error"`, or `"target-unreachable"` for a name that does not resolve),
   or `400` "blocked network request" for a private address. Only a 5xx from the site comes back as an empty value with a `FETCH_FAILED`
   warning. With `continue` a failed fetch is a warning, its readers skip, and `body` takes the
   scrape.
4. **Guard every action that reads `body` beside another slot** with
   `condition: { "op": "slotPresent", "slot": "body" }` — model actions included, not only writes. A
   action runs while any one input is present: a key-point `text.generate` that also reads `url` (to
   cite it) runs on the URL alone when every read failed, and the model invents a page. Guard the
   writes the same way on the slot they store, so such a run writes nothing instead of a half-empty
   record.

**With no vendor at all** — no Firecrawl key, or its credit spent — drop `scrape` and read
`url.fetch` → `strip` as the body, and take the title from `url.metadata` on the same `url` (its
`title`, from the page's `<title>` or `og:title`; also `onFailure: continue`). A page that builds
its text in the browser comes back nearly empty this way; a `$assert` on the length turns that into
a clear refusal (`kipory-build`'s `references/endpoint-answers.md`, endpoint answers and
refusals).

## Reading an RSS or Atom feed

No function parses a feed. <!-- absent-function: feed.* --> The working shape is a fetch, a regex
cut and a fan-out; each branch looks its item up, then creates or updates it:

```
fetch    url.fetch          feedUrl → xml         "reuseResultsForMinutes": 0, or the polling period
items    text.extract       xml → blocks          { "pattern": "<item[\\s\\S]*?</item>", "flags": ["i"] }
each     flow.fan-out       blocks → one block per branch
fields   value.transform    block → item          { title, link, published } — $match on each tag, below
found    record.list        item → found          { "tableKey": "<type>", "fieldFilters": [{ "field": "link", "op": "eq", "value": "item.link" }], "limit": 1 }
create   record.create      item                  { "tableKey": "<type>", "data": "item" } — when nothing was found
update   record.update      item, found           "recordId": "found.records[0].id", "data": "item" — when one was
```

- **`url.fetch` returns the feed as one string**, whatever content type the server names, so
  `text.extract` reads the XML as text. Leave `responseAs` unset: `json` on XML fails the action.
- **Two size limits.** A body over the action's `maxBytes` (5,000,000 by default) fails the action. A
  body under it but over the slot cap (500,000 characters unless the deployment set another) is
  cut to fit and ends in `[TRUNCATED]`, with only a `slot-truncated` warning on the run — so a
  large feed loses its last items, and the cut can land inside one.
- **A feed server that wants its own `Accept`.** `url.fetch` asks for JSON, XML and text, which a
  feed server accepts. For one that wants a different value, set the action's `headers` to
  `{ "Accept": "…" }`; a header the action names replaces the default.
- **Set the fetch action's own cache.** `url.fetch` reuses an answer for 24 hours by default, so a
  poll that leaves `reuseResultsForMinutes` alone reads the same XML all day.
- **The cut is by tag.** RSS wraps an item in `<item>`, Atom in `<entry>` — use
  `<entry[\\s\\S]*?</entry>` there. `text.extract` returns every match as a list of strings.
- **Read a field with `$match`.** In the `fields` action, `$match(block, /<title>([\s\S]*?)<\/title>/)[0].groups[0]`
  is the title; the link is `<link>…</link>` in RSS and the `href` attribute of `<link …/>` in
  Atom. Wrap a value in `$trim`, and strip `<![CDATA[` … `]]>` where the feed uses it.
- **Look the link up before you write.** There is no upsert function, and a `key` use does not turn
  a create into an update. <!-- absent-function: record.upsert --> What `record.create` alone does with an item an earlier poll wrote:
  - **Unchanged item, project-wide table**: the record's id comes from its data, so
    `record.create` lands on the record that is already there and adds nothing.
  - **Changed item** (an edited title, a new date): with no `key` use it becomes a second
    record; with a `key` use on the link it is different data under a held key, the create is
    refused `RECORD_NATURAL_KEY_TAKEN`, and the whole poll writes nothing.
  - So match on the link first. Give the link field a `filter` use (`kipory-model`) so `found`
    can filter on it, and guard the two writes on what it returned:
    `create` with `{ "op": "listEmpty", "slot": "found", "path": "records" }`, `update` with
    that condition inside `{ "op": "not", "inner": … }`.
    `record.update` merges the new fields over the stored ones. `listEmpty` also holds when
    `found` is absent, and `found` is skipped for an item with no link — so if the feed can
    omit one, add `{ "op": "slotPresent", "slot": "item", "path": "link" }` to the `create`
    guard under an `and`.
  - Leave `inputStreams` out of all three actions and the save derives them from each action's
    config: `update` reads `item` and `found`, `found` reads `item` and, like every
    `record.list`, `userInfo`, and `create` reads `item` alone. `create`'s condition names
    `found`, and that alone runs it after the lookup; listing `found` among `create`'s inputs
    is refused `FREE_FORM_INPUT_STREAMS_MISMATCH`.
  - A `key` use beside the `filter` use (`"uses": ["key", "filter"]`) is a backstop that
    refuses a second record under one link; it is never the update.
  - Store the items in a project-wide table. A scheduled poll has no end user, so a per-user
    table refuses there; and inside a fan-out a per-user record gets a new id on every run.
  - Match on the link, not on the feed's `<guid>`, which is not always stable between fetches.

  `kipory-build`'s `references/endpoint-answers.md` (§8, natural-key collisions) has the
  refusal's details.

- **A feed is untrusted text** like any fetched page: `text.sanitize` it before a model reads it.
