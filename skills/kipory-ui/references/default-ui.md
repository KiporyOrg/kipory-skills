# The default UI: pages derived from the endpoints

<!-- field-ok: bookId — the worked model's own input -->
<!-- field-ok: categoryId — an example input name -->
<!-- field-ok: addedAt — the worked model's own field -->
<!-- field-ok: shopId — an example of a project's id field -->
<!-- field-ok: itemIds — an example of a project's id list -->
<!-- field-ok: shopName — an example of a name beside its id -->
<!-- field-ok: priceCents — an example of an amount in hundredths -->
<!-- field-ok: createdAt — an example of a record's created time -->

With the UI on and no pages written (`ui: {}`, or `pages` absent or empty), the platform derives an app from the project's endpoints: lists, a page per record, and forms. It reads only each endpoint's method, path, inputs, answer and flow label. The same endpoints always give the same pages. Nothing here is enforced: an endpoint named another way is still drawn, as a form or a section, never refused.

## How endpoints are grouped

The platform reads each path after `/v1` and its first word, the namespace: `/v1/app/books/{bookId}` is `books/{bookId}`. The next word is the collection.

| Method and path (after the namespace) | Becomes                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /books`                          | the list page `/books`, in the menu: one card with a search box, the rows and their count                                          |
| `POST /books`                         | on the list page, a "New book" header button that opens the create form in a dialog                                                |
| `GET /books/{bookId}`                 | the record's page `/books/{bookId}`: the facts of its answer, in a "Details" card beside the lists                                 |
| `PATCH /books/{bookId}`               | on the record's page, an Edit header button that opens the form in a dialog, filled from the read                                  |
| `DELETE /books/{bookId}`              | on the record's page, the last entry of the More menu, which asks first and returns to the list; on each list row, a Remove action |
| `GET /books/{bookId}/reviews`         | on the record's page, a "Reviews" card with its first five rows and "Show all"                                                     |
| `POST /books/{bookId}/reviews`        | on the record's page, the one filled header button, "New review"; any other `POST /books/{bookId}/<word>` goes in the More menu    |

The list page's key is the collection (`books`); the record page's is its singular (`book`, `category`, `box`), or `<collection>-item` when the word has no plural ending. A collection with only a `POST` still gets a list page in the menu. A path whose first word is `v1`, `health`, `_next`, `_ui`, `mcp`, `.well-known`, `oauth` or one starting `llms` is moved under `/app`. A word that is not plain letters and digits becomes a safe one: `Sales Reports` is `sales-reports`, a name in another script `s` and eight hex digits; a parameter `{book-id}` is `{bookId}`; a second data key of one name takes a digit (`book2`).

**What fills the pages:**

- **Rows.** A list answer is a list, an object with `items`, or an answer with no declared fields (read as `{ items, nextCursor }`). A table shows at most five plain fields of a row (text, number, yes/no): the title field, then up to three others in the answer's order, then one date — `createdAt`, else the first other field named `…At` — headed without "At" ("Created"). It skips `id`, a field naming another record by id (`shopId`, `itemIds`), text longer than 200 characters (`maxLength`), `updatedAt` and a second date. A record's page shows every plain field but `id`, ids and the title field (the page's title); text longer than 1000 characters is drawn below, under its label.
- **The look.** A list page shows its row count beside its title and one filled "New …" button; its card has a search box (it sends the text to the list's `q`, `search`, `query` or `text` input when the list takes one, else filters the rows already loaded) and a footer count. A row's name or title gets a tile of initials. A record's page has its list as the first breadcrumb, the tile, a line with "Added <date>" (from `createdAt` or `addedAt`) and its first list's count, then Edit, a More menu and one filled button — "New <child>" for its first list, else Edit. Dates in a list are relative ("3 weeks ago"); on a record's details they are absolute. An empty value shows a grey bullet (•), read aloud as "empty".
- **Ids.** A field `<x>Id` whose record has a page of its own (`shopId` and a page per shop) is shown as a link labelled with that record ("Shop") that opens its page; with a `<x>Name` or `<x>Title` beside it (`shopName`), that name is the link, drawn as a chip, and is not shown again; with no page for the record, the name alone. Other ids are not shown, and neither is a field whose name ends in "By" (who added or created something) or in "secret", "password", "token" or "api key" written as one word. A written page can show any of them. A record's processing state, which the platform keeps on a record answered as it is stored, is never shown; a `status` field the project declares is shown, as a badge.
- **Formats.** A field's `format` decides: `date-time`, `date`, `email`, `uri` (a link). With none, the name does: a text field ending `At` is a date and time, `date` or ending `Date` or `On` a date, `url`, `link` or ending `Url` a link, `email` or ending `Email` a mail link, a number ending `Bytes` a size, a text with an `enum`, or named `status`, `state`, `stage`, `priority` or ending `Status`, a badge toned by its word (done green, cancelled red, pending amber, scheduled in the accent). A number ending `Cents` (`priceCents`) is an amount: two decimals, no currency, headed "Price"; its form field is typed as 45.00 and sent as 4500. A value that is not what its name promises is shown as written.
- **Opening a row.** A row opens the record's page when the rows carry `id`. After a create whose answer carries `id`, the new record's page opens; otherwise the dialog closes.
- **Titles and labels.** A list page is titled by its collection ("Books"). A record page is titled by the record's first field among `title`, `name`, `displayName`, `question`, `subject`, `label`, `email`, `code`, `url`, `text`. A read that answers its record under one name (a flow returning `{ book: … }`) is read inside it: the facts are `from: book.book`. Answer it bare (`responseBody: book` on the endpoint) and written pages read `book.title`, as the examples here do. A button, a dialog and a form's submit take the flow's label, else the endpoint's key made readable (`add-book` is "Add book"). A child list's section takes its last path word ("Reviews"). An empty list says "No books yet."
- **Inputs of a read.** Each path parameter comes from the page's address, by position. Any other required input, apart from paging (`cursor`, `after`, `limit`, `offset`, `pageSize`), comes from the query string. An endpoint that needs a header input is not drawn.
- **Inputs of a form.** Path inputs come from the page; every other input is a field. On a record's page, the input the page's id fills is shown locked, as a chip with the record's title. An input named `<x>Id` becomes a picker when the project has a list of that collection: `bookId` picks from the `GET /books` endpoint, `categoryId` from `/categories`. That list must need no input beyond paging and have rows with `id`. The picker shows the rows' first title field, and searches with its `q`, `search`, `query` or `text` input when it has one.
- **Public pages.** A page that uses an endpoint, every one of which (its reads, calls, forms and pickers) is `auth: none`, is public: a page of public forms with no data too, such as a contact form on `/`.
- **Honeypots.** An optional string property of an object input whose `description` starts with "Honeypot" is hidden: `fields: { contactForm.website: { hidden: true } }`, not drawn and not sent.
- **The menu.** The list pages, in the order of their endpoints' keys, then any page of its own that needs no id. Each takes an icon its collection's name suggests (clients, members, people: people; appointments, events, bookings: a calendar; reminders, notifications: a bell; orders: a cart; payments, invoices: a card), else its first letter in a tile.

## What fits no rule

Every endpoint that can be drawn gets a place, in this order:

1. **On the page at its own path**: `POST /books/{bookId}` becomes a header button and dialog on the record's page; `PATCH /books` a form section on the list page.
2. **A `DELETE /books/{bookId}/reviews/{reviewId}`** becomes a row action of the reviews list on the book's page. A delete that needs more than its path is a form instead, in a dialog.
3. **On the deepest page its path starts with**: `GET /books/{bookId}/reviews/{reviewId}/votes` becomes a section on the book's page; a `GET` shows its answer, any other method its form (on a record's page, in a dialog).
4. **A page of its own** at its path, keyed by the endpoint and titled by its label: `POST /imports/run` is a form page `/imports/run`, in the menu. One that needs an id is linked from a page whose address has it.

A second list of one collection, or a second read of one record, gets a page of its own with its namespace in front (a public read at `/v1/pub/books/{bookId}` beside the signed-in one at `/v1/app/books/{bookId}` gets the page `/pub/books/{bookId}`), and the record's page links to it ("Public page" for an `auth: none` read).

**Left out:** endpoints that stream, subscriptions, and machine endpoints (public ones that take the raw request body, such as a signed webhook).

## Naming endpoints so the default UI groups well

- **One namespace word, then the collection in the plural**: `/v1/app/books`, `/v1/app/books/{bookId}`. Keep each record's own routes at `/<collection>/{<singular>Id}`.
- **Use the same parameter name everywhere** for one record's id (`{bookId}`), and name an input that takes another record's id `<singular>Id` so it is picked from that list.
- **Put children one level under their record**: `/books/{bookId}/reviews`.
- **Answer lists as `{ items, nextCursor }` with rows that carry `id`**, and a create with the new record's `id` (`kipory-build`'s endpoint answers).
- **Give every flow a label**: it is the header button, the dialog's title and the form's submit.
- **Give records a title field** (`title` or `name`): it titles their page, labels their picker and gives them their tile.
- **Answer the name beside an id** (`shopName` next to `shopId`) to show it as a chip, and name amounts in hundredths `…Cents`.

A page has at most four header buttons; past that, the fourth on go into one "More" menu.

In the worked model `recommend` (`POST /books/{bookId}/recommend`) is a header button on the book's page that opens its form, `list-members` a "Members" page in the menu, and `public-book` a public page linked from the book's. The stream `book-events` and the signed mail webhook are left out. Its derived list page, as `GET /v1/_ui` returns it:

```yaml
# derived from the Reading club
ui:
  menu: [{ page: books, icon: book }, { page: members, icon: users }]
  pages:
    books:
      path: /books
      title: Books
      state: { search: null }
      data:
        books: { endpoint: list-books, with: { q: state.search } }
      dialogs:
        add:
          title: New book
          body:
            - form:
                endpoint: add-book
                submit: Add a book
                then: [{ go: book, with: { bookId: result.id } }]
      count: books.items
      actions:
        - { label: New book, do: [{ open: add }] }
      body:
        - table:
            rows: books.items
            columns:
              - { field: title, tile: true }
              - author
              - year
              - mine
              - { field: addedAt, label: Added, format: relative }
            open: { go: book, with: { bookId: row.id } }
            empty: No books yet.
            noun: books
            search: { into: search, placeholder: Search books }
```

## Starting from the derived pages

`GET /v1/_ui` on the project's host, with no sign-in, answers what visitors are served: `ui.derived` is `true` while the pages are derived, and `ui.pages` and `ui.menu` are in the form the section takes. Read it with `kipory call - GET /v1/_ui --out ui.json`, copy `pages` and `menu` under `ui:` in the document (leave `derived` out), change what you want, and plan. From then on the written pages are the whole UI: a new endpoint shows up only once a page uses it. The answer also carries `project`, `signIn` (providers and `signUp`), `findPeople`, `surface` (the endpoints the pages name, with their inputs and answers) and a `version` that changes when the project's structure does. It answers 404 while the project has no `ui` section.

With no pages written, `name`, `theme`, `layout`, `home` and `menu` still apply, and `home` and `menu` name derived pages.
