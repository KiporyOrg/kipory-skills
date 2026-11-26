# Pages, and the values they hold

<!-- field-ok: bookId — the worked model's own input -->
<!-- field-ok: addedAt — the worked model's own field -->

The worked model is Reading club, in `SKILL.md`. Every example here plans clean against its endpoints. A list of components is written for the body of its `book` page, which reads `book` and `reviews`; a map of pages is added beside its pages.

## A page

| Setting       | Kind                    | Means                                                                                     |
| ------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `path`        | text, required          | the page's address, with `{name}` parameters: `/books/{bookId}`                           |
| `title`       | word                    | the page's title, also its title in the browser and in a link preview                     |
| `description` | word                    | the preview text of a public page                                                         |
| `access`      | `public` or `signed-in` | default `signed-in`; a public page needs no sign-in and reads only `auth: none` endpoints |
| `data`        | reads by key            | endpoint reads; each answer is readable by its key                                        |
| `state`       | values by key           | page values with their starting value; `search`, `filter` and `set` change them           |
| `dialogs`     | dialogs by key          | `{ title, body }`, opened by an `open` action                                             |
| `actions`     | buttons and menus       | the page's header buttons, right of its title                                             |
| `body`        | components, required    | what the page shows, in order                                                             |

A path starts with `/`, names each parameter once as `{name}`, and has no empty, `.` or `..` part and no trailing `/`. Two pages may not share a path once parameter names are erased: `/books/{bookId}` and `/books/{id}` are the same path. A path under `/v1`, `/health`, `/llms`, `/_next`, `/_ui`, `/mcp`, `/.well-known` or `/oauth` is refused: the platform answers those.

**A `data` read** names one GET endpoint, passes its inputs in `with:`, and may set `every`, a re-read interval from `2s` to `10m` while the page is open; a re-read waits for the one still in flight. Every required input of the endpoint is passed; a path parameter of the page usually supplies the id:

```yaml
reviews-live:
  path: /books/{bookId}/live
  title: Latest reviews
  data:
    reviews:
      { endpoint: list-reviews, with: { bookId: path.bookId }, every: 30s }
  body:
    - list:
        {
          rows: reviews.items,
          title: "{{row.stars}} stars",
          text: "{{row.text}}",
        }
```

The page's reads run when it opens, again when a state value a `with:` reads changes, and again after every successful `call` or form submit; a re-read keeps every page of rows "Show more" has loaded. A list answer `{ items, nextCursor }`, read by an endpoint that has a `cursor` or `after` input, is paged in a `table` or `list` whose `rows` is `<key>.items`.

**Page state** is declared with its starting value and read as `state.<key>`. A state key that is not declared is refused wherever it is read or set. A search or filter cleared by the visitor writes `null` into its key.

**`each`** repeats a body over a list. It takes no `show`, and its `as` names the item inside:

```yaml
- each: reviews.items
  as: review
  body:
    - text: "**{{review.stars}} stars.** {{review.text}}"
```

**Dialogs** are declared on the page and shown by `open`; `close` hides one. A dialog is one of the 21 catalog components, but it sits under `dialogs`, never in a body:

```yaml
book-with-dialog:
  path: /club/books/{bookId}
  title: "{{book.title}}"
  data:
    book: { endpoint: get-book, with: { bookId: path.bookId } }
  dialogs:
    edit:
      title: Edit {{book.title}}
      body:
        - form:
            endpoint: update-book
            with: { bookId: path.bookId }
            fields:
              { title: { value: book.title }, author: { value: book.author } }
            then: [{ close: edit }]
  actions:
    - { label: Edit, do: [{ open: edit }] }
  body:
    - facts: { from: book }
```

**Header actions** (`actions`) are the page's main buttons, drawn right of its title; on a narrow screen they wrap under it. Each is a button's settings — `label`, `tone`, `confirm`, `show`, `do`, checked as a `button` is — or `{ menu: { label, items } }`. Every one is drawn, and one is filled: the one with `tone: primary` (a header takes at most one), else the first button that names no `tone`; a button its `show` hides does not count. They are outside any row, so they read no `row`. The page above opens its edit dialog from its header.

**The rest of the header and a side column.** A page may also take:

- `back` — `{ go, with, label }`: a link above the header to another page, such as the list a record belongs to; its label defaults to that page's title.
- `tile` — a template: a large tile of initials, on a colour taken from the text, before the title.
- `count` — a list (data): the number of its loaded rows beside the title, with "+" when more can be fetched.
- `meta` — a line of small facts under the title, joined with a dot: each a template, left out when it comes out empty, or `{ count, noun }` ("6 reviews").
- `side` — a body drawn as a narrow column right of `body`; on a phone it drops under it.

```yaml
book:
  path: /books/{bookId}
  title: "{{book.title}}"
  back: { go: books }
  tile: "{{book.title}}"
  meta:
    - "{{#book.addedAt}}Added {{book.addedAt|relativeDate}}{{/book.addedAt}}"
    - { count: reviews.items, noun: reviews }
  data:
    book: { endpoint: get-book, with: { bookId: path.bookId } }
    reviews: { endpoint: list-reviews, with: { bookId: path.bookId } }
  body:
    - table:
        {
          title: Reviews,
          rows: reviews.items,
          columns: [stars, text],
          limit: 5,
        }
  side:
    - facts:
        { from: book, title: Details, labels: above, fields: [author, year] }
```

**Nesting.** Components nest at most four deep; the page body is the first level, a `section` inside it the second.

## Paths

A path reads a value the way a step's path does in a flow: a root, then `.name` for a field and brackets for a list — `[0]`, `[first]`, `[last]`, `[].name` (that field of every item), `[distinct]`, `[compact]`. A path that names nothing reads as missing. The roots are in `SKILL.md`. A path that reads a data key or `result` must name fields the endpoint's answer has, and a `row` path fields the row has; where the answer's schema is open, the plan lets it pass.

## Templates

A word setting is plain text with fill-ins. Nothing in it is ever run, and an HTML tag in it is refused.

```text
{{book.title}}                     the value
{{book.addedAt|humanDate}}         the value through a filter
{{row.text|truncate:80}}           a filter with its argument
{{#book.author}}by {{book.author}}{{/book.author}}   shown when the value is filled
{{^reviews.items}}No reviews.{{/reviews.items}}      shown when it is empty
```

The filters:

```text
humanBytes  humanDate  humanDateTime  humanDuration  json  lower  relativeDate  truncate  upper
```

A template's path is `name`, `name.field.field` or `name[N]`; the other bracket forms are for data settings. A section marker takes no filter and no `[N]`, and every `{{#x}}` is closed by `{{/x}}`. A `{{…}}` that is not a fill-in is shown as written, and the plan warns about it.

`text` is Markdown with no raw HTML: a tag in a value is shown as text, never drawn, while code spans, code blocks and `<https://…>` autolinks show as written. A link in it, a reference link and an autolink too, goes to `https`, `http` or `mailto`, or to an address of this UI (`/books`, `#top`); a `//…` address is refused.

## Conditions

`show:` takes the flow condition set without `expr` and `matches`. Each is a one-key object, false when a value it reads is missing:

```text
has  filled  eq  eqIgnoreCase  in  inIgnoreCase  gt  lt  gte  lte
before  after  startsWith  contains  containsExactCase  and  or  not
```

**A bare word inside a condition is a path, never text.** To compare with a piece of text, write it as `{ literal: … }`. Numbers and `true` / `false` are written as they are. Getting this wrong is refused as `UI_PATH_UNKNOWN`:

```yaml
show: { eq: [order.status, { literal: open }] } # text: a literal
show: { not: { eq: [note.role, { literal: viewer }] } }
show: { eq: [book.mine, true] } # true, false and numbers need no literal
show: { gt: [poll.votes, 0] }
show: { eq: [order.status, open] } # refused: `open` is read as a path
```

`has` and `filled` take one value; `and` and `or` a list of conditions; `not` one condition; the rest two values `[left, right]`. `eq` does not convert: `1` and `"1"` differ.

```yaml
- button:
    label: Edit
    show: { and: [{ eq: [book.mine, true] }, { filled: book.title }] }
    do: [{ go: edit-book, with: { bookId: path.bookId } }]
```

## Formats

A format says how a value is shown. It is set on a field in `facts` and `table` (`{ field, label, format }`) and on a `stat`:

| Format                      | Shows                                                                |
| --------------------------- | -------------------------------------------------------------------- |
| `date`, `date-time`         | a date; a date and time, in the visitor's language, in UTC           |
| `relative`                  | "3 weeks ago", "In 2 days", "Today, 3:00 PM"                         |
| `number`, `percent`         | a number grouped by thousands; a fraction as a percent (0.25 is 25%) |
| `amount`                    | hundredths with two decimals and no currency: 4500 is 45.00          |
| `bytes`                     | a size                                                               |
| `link`, `email`, `image`    | a link; a mail link; the image itself                                |
| `id`                        | an id, drawn as one                                                  |
| `{ money: EUR }`            | an amount in that currency; the value is in minor units              |
| `{ badge: { done: good } }` | a badge coloured by value; an unlisted value takes its word's tone   |

A date-time written without a zone is read as UTC, and a day not on the calendar (`2026-02-30`) is shown as written.

The tones are `neutral`, `good`, `warn`, `bad` and `accent`. A badge value its map does not list is toned by its word: done, paid, active, completed are `good`; cancelled, failed, overdue, rejected `bad`; pending, draft, due `warn`; scheduled, open, new, in progress `accent`; anything else `neutral`. Numbers under `number`, `amount`, `percent`, `bytes` and `money` line up on the right; an empty value is drawn as a grey bullet (•), read aloud as "empty". A status is its word in its tone's colour after a dot; a `neutral` one is a grey chip.

```yaml
- table:
    rows: reviews.items
    columns:
      - { field: stars, format: number }
      - text
      - { field: addedAt, label: Added, format: relative }
```

With no format, text shows as written, a number as written (a year stays 1871), a yes/no as Yes or No, and a list of plain values joined with commas.
