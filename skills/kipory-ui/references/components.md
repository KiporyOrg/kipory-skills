# Components: layout and display

<!-- field-ok: bookId — the worked model's own input -->
<!-- field-ok: addedAt — the worked model's own field -->

The catalog is closed: 21 components, and nothing else is drawn. A name or a setting it does not have is refused, never ignored. This page has the layout and display components; `forms-and-actions.md` has `form`, `search`, `filter`, `button`, `link` and `menu`.

| Group   | Components                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------ |
| layout  | `section`, `columns`, `tabs`, `dialog`                                                                 |
| display | `heading`, `text`, `image`, `facts`, `table`, `list`, `timeline`, `stat`, `badge`, `progress`, `alert` |
| input   | `form`, `search`, `filter`                                                                             |
| action  | `button`, `link`, `menu`                                                                               |

**A component is a one-key object**: the key is its name, the value its settings. Every component takes `show:` inside its settings (`{ table: { show: …, rows: … } }`); `columns` and `tabs` take it on each column or tab. `heading`, `text` and `alert` have a short form, a bare text, which carries no `show`. Loading, empty and refused states are drawn by the platform the same way everywhere; a component sets only its `empty` text.

**The page these examples sit on** is the worked model's `book` page, here with three state values:

```yaml
book:
  path: /books/{bookId}
  title: "{{book.title}}"
  state: { q: "", stars: 0, shown: all }
  data:
    book: { endpoint: get-book, with: { bookId: path.bookId } }
    reviews: { endpoint: list-reviews, with: { bookId: path.bookId } }
  dialogs:
    recommend:
      title: Recommend {{book.title}}
      body:
        - form:
            {
              endpoint: recommend,
              with: { bookId: path.bookId },
              then: [{ close: recommend }],
            }
  body:
    - heading: "{{book.title}}"
```

Each example below is one body for that page.

## Layout

**`section`** — `title` (word), `body`. A titled group.

```yaml
- section:
    title: About the book
    body:
      - facts: { from: book, fields: [author, year] }
```

**`columns`** — a list of columns, each `span` (1, 2 or 3; default 1), `show`, `body`. They stack on a narrow screen.

```yaml
- columns:
    - span: 2
      body:
        - facts: { from: book }
    - body:
        - button: { label: Recommend, do: [{ open: recommend }] }
```

**`tabs`** — a list of tabs, each `label` (word), `show`, `body`.

```yaml
- tabs:
    - label: Book
      body:
        - facts: { from: book }
    - label: Reviews
      body:
        - list:
            {
              rows: reviews.items,
              title: "{{row.stars}} stars",
              text: "{{row.text}}",
            }
```

**`dialog`** — `title` (word), `body`. Declared under the page's `dialogs` and shown by an `open` action; never placed in a body (`pages-and-values.md`).

## Display

**`heading`** — `text` (word), `level` (1, 2 or 3; default 2). The short form is the text alone.

```yaml
- heading: { text: "{{book.title}}", level: 1 }
- heading: Reviews
```

**`text`** — `text` (word): Markdown with no raw HTML (a tag is shown as text, never drawn). Links go to `https`, `http`, `mailto` or an address of this UI.

```yaml
- text: "Written by **{{book.author}}**. See [the club's site](https://example.com/club)."
```

**`image`** — `src` (data), `alt` (word). `src` is a path to an address, or a literal one.

```yaml
- image:
    {
      src: { literal: "https://example.com/club/banner.png" },
      alt: Reading club,
    }
```

**`facts`** — `from` (data: one object), `fields` (default: every field but the record's processing state), `title` (word: the facts are drawn in a card under it), `labels` (`beside`, the default, or `above` each value). A field is its name, or `{ field, label, format }`, or `{ field, label, go }`: a link to the page `go`, whose address has one parameter, filled by the field's value. With `go`, `text` names another field of the same value shown as the link's text, drawn as a chip (a member's name beside the id that opens the member). `tile: true` on any field draws a tile of initials, coloured from the value's text, before it.

```yaml
- facts:
    from: book
    fields:
      [
        author,
        { field: year, label: Published },
        { field: addedAt, label: Added, format: date },
      ]
```

**`table`** — `rows` (data: a list), `columns` (fields as in `facts`; default: every field), `open` (a `go` a row opens, reading `row`; a row whose columns are all links gets an "Open <row>" link in its first cell, shown when focused), `actions` (entries offered on each row), `empty` (word), and the card it is drawn in: `title` (word; the row count sits beside it), `noun` (word, plural: a footer counts the rows, "12 reviews"), `limit` (1 to 100: that many rows, then "5 of 6 shown · Show all"), `search` (`true` filters the loaded rows by what is typed; `{ into, placeholder }` writes the text into a page state key the page's read passes to its endpoint). A table over `<key>.items` pages with the endpoint's cursor. Inside a `section` the table is drawn in the section's card, with no card of its own.

```yaml
- table:
    title: Reviews
    rows: reviews.items
    columns: [stars, text, { field: addedAt, format: relative }]
    limit: 5
    search: { placeholder: Find a review }
    actions:
      - { label: Recommend the book, do: [{ open: recommend }] }
    empty: No reviews yet.
```

**`list`** — `rows` (data), `title` (word, required), `text`, `meta` (words), `image` (data), `open`, `actions`, `empty`. Each word reads the row as `row`.

```yaml
- list:
    rows: reviews.items
    title: "{{row.stars}} stars"
    text: "{{row.text|truncate:120}}"
    meta: "{{row.addedAt|relativeDate}}"
    empty: No reviews yet.
```

**`timeline`** — `rows` (data), `text` (word, required), `who` (word), `when` (data, read from the row), `empty`. Rows in time order.

```yaml
- timeline:
    rows: reviews.items
    text: "{{row.stars}} stars: {{row.text}}"
    when: row.addedAt
```

**`stat`** — `label` (word), `value` (data), `format`. One number with its label.

```yaml
- stat: { label: Published, value: book.year }
```

**`badge`** — `value` (data), `tones` (value to `neutral`, `good`, `warn`, `bad` or `accent`; an unlisted value takes the tone its word suggests — done good, cancelled bad, pending warn, scheduled accent — else neutral).

```yaml
- each: reviews.items
  as: review
  body:
    - badge: { value: review.stars, tones: { "5": good, "1": bad } }
```

**`progress`** — `value` (data), `max` (data; default 100), `label` (word). A bar.

```yaml
- progress:
    value: { path: "reviews.items[first].stars", default: 0 }
    max: 5
    label: The latest review's stars
```

**`alert`** — `text` (word), `tone` (default `neutral`). The short form is the text alone.

```yaml
- alert: { text: Every member can read these reviews., tone: warn }
- alert: Reviews are shown newest first.
```

**`show` on any component** — here, a section only the book's owner sees. It hides; the endpoints still decide.

```yaml
- section:
    title: Your book
    show: { eq: [book.mine, true] }
    body:
      - text: You added this book.
```
