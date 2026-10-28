<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Expression functions

Every expression a flow holds — a `value.transform`, a `value.build` field, an `{expr: …}` argument, a condition — and a table's computed-field formula may call JSONata 2.2's own functions and these 25 the platform adds. An expression cannot define a function another action calls; reach for one of these before writing a helper. A name you bind with `:=` hides the platform's for that expression (the plan warns `JSONATA_SHADOWS_BUILTIN`).

No value means missing, `null`, empty text or an empty list: a function given none answers nothing (the action's slot stays empty) unless its entry says otherwise. A wrong type fails the action at the call. No function reads the clock, the host's time zone or its locale: `runInfo.now` is the time, and a date or locale function takes its zone and locale as arguments (UTC and `en` when left out).

## Values

### `$default(value, fallback)`

The fallback when the value is missing, null, empty text or an empty list; else the value.

- **No value:** The fallback.
- **Signature:** `<xx:x>`
- `$default(post.brief, post.text)` over `{"post":{"text":"Full text"}}` → `"Full text"`
- `$default(count, 0)` over `{"count":3}` → `3`

## Lists

### `$compact(value)`

The value with null, empty text, empty lists and empty objects removed, at every depth.

- **No value:** Nothing; also when nothing is left.
- **Signature:** `<x:x>`
- `$compact(contact)` over `{"contact":{"name":"Ada","phone":null,"tags":[],"links":["","a.org"]}}` → `{"name":"Ada","links":["a.org"]}`
- `$compact({"a": null, "b": ""})` → nothing

### `$groupBy(list, key)`

An object from each value of the items' `key` field to the items that have it, in order. Items without it are left out.

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<xs:o>`
- `$groupBy(posts, "source")` over `{"posts":[{"id":"p1","source":"a"},{"id":"p2","source":"b"},{"id":"p3","source":"a"}]}` → `{"a":[{"id":"p1","source":"a"},{"id":"p3","source":"a"}],"b":[{"id":"p2","source":"b"}]}`
- `$count($groupBy(posts, "source").a)` over `{"posts":[{"source":"a"},{"source":"a"},{}]}` → `2`

### `$indexBy(list, key)`

An object from each value of the items' `key` field to the first item with it — a lookup table. Read one with `$lookup(table, value)`.

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<xs:o>`
- `$lookup($indexBy(sources, "id"), post.sourceId).name` over `{"sources":[{"id":"s1","name":"Harbour Daily"},{"id":"s2","name":"Tide Notes"}],"post":{"sourceId":"s2"}}` → `"Tide Notes"`
- `$indexBy(rows, "key")` over `{"rows":[{"key":"a","v":1},{"key":"a","v":2},{"v":3}]}` → `{"a":{"key":"a","v":1}}`

### `$list(value)`

Always a list: a list as it is, one value as a list of one, no value as an empty list.

- **No value:** An empty list.
- **Signature:** `<x:a>`
- `$count($list(topics))` over `{"topics":{"slug":"sailing"}}` → `1`
- `$list(missing)` over `{}` → `[]`
- `$list([1, 2])` → `[1,2]`

### `$uniqBy(list, key)`

The items, keeping the first with each value of their `key` field, in order. Items without it are kept.

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<xs:a>`
- `$uniqBy(links, "url").title` over `{"links":[{"url":"a.org","title":"A"},{"url":"b.org","title":"B"},{"url":"a.org","title":"A again"}]}` → `["A","B"]`
- `$count($uniqBy(items, "id"))` over `{"items":[{"id":1},{"id":1},{"id":2}]}` → `2`

## Text

### `$decodeHtml(text)`

The text with every HTML character reference decoded: named (`&amp;`), decimal (`&#8217;`) and hex (`&#x2019;`). The result is text, not safe HTML: `&lt;script&gt;` becomes `<script>`, so escape it before putting it into HTML.

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<(sla)-:s>`
- `$decodeHtml(title)` over `{"title":"Fish &amp; chips&#x2019; &quot;best&quot;"}` → `"Fish & chips’ \"best\""`
- `$decodeHtml("5 &lt; 6")` → `"5 < 6"`

### `$fold(text)`

Text for comparing: lower case, accents and marks removed, punctuation turned to spaces, spaces collapsed. Lower case is not full case folding: `ß` stays `ß`.

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<(sla)-:s>`
- `$fold(name)` over `{"name":"  Café — Déjà Vu!  "}` → `"cafe deja vu"`
- `$fold("Ёлка") = $fold("елка")` → `true`

### `$htmlText(html)`

HTML as plain text: tags removed, character references decoded, paragraphs kept as blank lines, `<br>` as line breaks and table cells as spaces; runs of spaces collapse, `<pre>` included. The result is text, not safe HTML.

- **No value:** Nothing; also when the HTML holds no text.
- **Signature:** `<(sla)-:s>`
- `$htmlText(body)` over `{"body":"<p>Fish &amp; chips&#x2019;</p><p>Next</p>"}` → `"Fish & chips’\n\nNext"`
- `$htmlText("Line one<br>Line   two<script>x()</script>")` → `"Line one\nLine two"`

## Addresses

### `$hostOf(url)`

The address's host in lower case, without a leading `www.` or `m.`; a scheme is optional. A path, a query, a fragment or a `mailto:`/`tel:` address names no host.

- **No value:** Nothing; also for text that is not an address.
- **Signature:** `<(sla)-:s>`
- `$hostOf(url)` over `{"url":"https://www.Example.org/a/b?x=1"}` → `"example.org"`
- `$hostOf("m.example.org/path")` → `"example.org"`

### `$url(url)`

An absolute address in parts: `scheme`, `host`, `port`, `path`, `query` (an object) and `fragment`.

- **No value:** Nothing; also for a relative or unreadable address.
- **Signature:** `<(sla)-:o>`
- `$url(link)` over `{"link":"https://example.org:8080/a?x=1&x=2&y=3#top"}` → `{"scheme":"https","host":"example.org","port":8080,"path":"/a","query":{"x":["1","2"],"y":"3"},"fragment":"top"}`
- `$url("/relative/path")` → nothing

## Dates

### `$dateAdd(date, amount, unit)`

The date moved by a whole number of `second`, `minute`, `hour`, `day`, `week`, `month` or `year` (calendar months, in UTC).

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<(snla)ns:s>`
- `$dateAdd(due, 1, "month")` over `{"due":"2026-01-31T09:00:00Z"}` → `"2026-02-28T09:00:00.000Z"`
- `$dateAdd("2026-10-28", -2, "day")` → `"2026-10-26T00:00:00.000Z"`

### `$dateDiff(from, to, unit)`

Whole units from the first date to the second, negative when the second is earlier. Months and years count as `$dateAdd` moves: from 31 January, 28 or 29 February is a whole month, but the reverse is not.

- **No value:** Nothing when either date has no value.
- **Signature:** `<(snla)(snla)s:n>`
- `$dateDiff(post.publishedAt, runInfo.now, "day")` over `{"post":{"publishedAt":"2026-10-20T12:00:00Z"},"runInfo":{"now":"2026-10-28T08:00:00Z"}}` → `7`
- `$dateDiff("2026-03-15", "2026-01-31", "month")` → `-1`

### `$parseDate(text, [timeZone])`

An ISO 8601 instant from ISO 8601 text, a feed or mail date (RFC 2822), or a number of epoch milliseconds (not seconds: multiply those by 1000); a time with no offset is read in the time zone (default UTC), and one a daylight-saving change makes happen twice is its first.

- **No value:** Nothing; also for text it cannot read.
- **Signature:** `<(snla)s?:s>`
- `$parseDate(item.pubDate)` over `{"item":{"pubDate":"Tue, 27 Oct 2026 18:30:00 +0200"}}` → `"2026-10-27T16:30:00.000Z"`
- `$parseDate("2026-10-28 09:00", "Asia/Jerusalem")` → `"2026-10-28T07:00:00.000Z"`

## Locale

### `$formatDate(date, pattern, [locale], [timeZone])`

The date in the pattern's form — `yyyy`, `yy`, `MMMM`, `MMM`, `MM`, `M`, `dd`, `d`, `EEEE`, `EEE`, `HH`, `hh`, `mm`, `ss`, `a`, text in single quotes — with names in the locale (default `en`) and the time zone (default UTC).

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<(snla)ss?s?:s>`
- `$formatDate(publishedAt, "d MMMM yyyy", "en")` over `{"publishedAt":"2026-10-28T09:00:00Z"}` → `"28 October 2026"`
- `$formatDate("2026-10-28T22:30:00Z", "EEE d MMM, HH:mm", "en", "Asia/Jerusalem")` → `"Thu 29 Oct, 00:30"`

### `$formatMoney(amount, currency, [locale])`

The amount in a currency (an ISO 4217 code the runtime knows), written the locale's way (default `en`).

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<xss?:s>`
- `$formatMoney(price, "EUR", "en")` over `{"price":1234.5}` → `"€1,234.50"`
- `$formatMoney(12, "USD")` → `"$12.00"`

## Parsing

### `$parseJson(text)`

The value JSON text holds. It parses data and runs nothing; text that is not JSON fails the action.

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<(sla)-:x>`
- `$parseJson(raw).items[0]` over `{"raw":"{\"items\": [\"a\", \"b\"]}"}` → `"a"`
- `$parseJson("[1, 2]")` → `[1,2]`

## Terms

### `$termLabel(term, [language])`

A record's term's label in a language (`he`, `pt-BR`), from the term a record read carries: the exact tag (any case, `_` or `-`), then its language (`he-IL` → `he`), then a regional label of that language, then the default label. A list of terms gives one label per term. Over a list use `$map(ts, function($t){ $termLabel($t, lang) })`: `$map(ts, $termLabel)` would pass each index as the language.

- **No value:** Nothing (an action reading only it is skipped).
- **Signature:** `<x(sl)?:(sa)>`
- `$termLabel(article.topic, "he-IL")` over `{"article":{"topic":{"slug":"sailing","label":"Sailing","labels":{"he":"שייט","ru":"Парусный спорт"}}}}` → `"שייט"`
- `$termLabel(article.topic, "fr")` over `{"article":{"topic":{"slug":"sailing","label":"Sailing"}}}` → `"Sailing"`

## Formatters

### `$humanBytes(bytes)`

A byte count for people: `1.2 MB`.

- **No value:** Empty text.
- **Signature:** `<x:s>`
- `$humanBytes(1258291)` → `"1.2 MB"`
- `$humanBytes(512)` → `"512 bytes"`

### `$humanDate(isoDate)`

An ISO date as `31 August 2020`, in UTC. For a locale or a pattern use `$formatDate`.

- **No value:** Empty text.
- **Signature:** `<x:s>`
- `$humanDate("2020-08-31T04:42:00Z")` → `"31 August 2020"`
- `$humanDate("not a date")` → `"not a date"`

### `$humanDateTime(isoDate)`

An ISO date and time as `31 August 2020, 04:42 UTC`.

- **No value:** Empty text.
- **Signature:** `<x:s>`
- `$humanDateTime("2020-08-31T04:42:00Z")` → `"31 August 2020, 04:42 UTC"`
- `$humanDateTime("2020-08-31")` → `"31 August 2020, 00:00 UTC"`

### `$humanDuration(seconds)`

Seconds for people: `3 minutes 24 seconds`.

- **No value:** Empty text.
- **Signature:** `<x:s>`
- `$humanDuration(204)` → `"3 minutes 24 seconds"`
- `$humanDuration(0)` → `"0 seconds"`

### `$lower(text)`

The text in lower case.

- **No value:** Empty text.
- **Signature:** `<x:s>`
- `$lower("Harbour")` → `"harbour"`
- `$lower(missing)` over `{}` → `""`

### `$truncate(text, [length])`

The first characters (100 unless a length is given), then an ellipsis when cut.

- **No value:** Empty text.
- **Signature:** `<xx?:s>`
- `$truncate("Harbour Notes", 7)` → `"Harbour…"`
- `$truncate("Short", 40)` → `"Short"`

### `$upper(text)`

The text in upper case.

- **No value:** Empty text.
- **Signature:** `<x:s>`
- `$upper("Harbour")` → `"HARBOUR"`
- `$upper(missing)` over `{}` → `""`

## Refused

A save naming one of these is refused `JSONATA_FORBIDDEN_FUNCTION`.

- `$eval` — Runs text as an expression, outside every check. Use `$parseJson` to read JSON text.
- `$millis` — Reads the clock, so the same input gives different answers. Read `runInfo.now`.
- `$now` — Reads the clock, so the same input gives different answers. Read `runInfo.now`.
- `$random` — A different answer each time; an action must answer the same for the same input.
- `$shuffle` — A different order each time; an action must answer the same for the same input.
