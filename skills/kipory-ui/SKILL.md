---
name: kipory-ui
description: Give a Kipory project its own web UI as configuration — the document's `ui` section, with pages built from a closed catalog of components (tables, lists, facts, forms, buttons, tabs, dialogs), a menu and a four-setting theme, drawn by the platform on the project's own host while the API stays on /v1. Use when the user wants people to open the product in a browser, asks for screens, an admin panel, a dashboard or a public page to share, when a plan is refused with a UI_ code or a page shows as unavailable, when the pages the platform derives from the endpoints need changing, or when deciding who may sign up (open or invite-only) and whether users can find each other. Not for the endpoints themselves (kipory-expose), and not for a native app or a frontend of your own, which call the endpoints like any other client.
license: MIT
---

<!-- field-ok: bookId — the worked model's own input -->
<!-- field-ok: addedAt — the worked model's own field -->
<!-- field-ok: userId — the worked model's own input -->

# A project's own web UI

A project can carry its own web UI in its document. The top-level `ui` section holds pages, a menu and a theme. The platform draws them on the project's own host, signs people in, and calls the project's endpoints as the signed-in person. The fact most people get wrong: **a page reads and writes only through the project's endpoints.** It has no query of its own and no way around a flow. A `show:` hides a control; it never protects anything. The flow behind the endpoint decides who may do what.

## On, off, and the default pages

| The document says | What happens                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| no `ui` key       | nothing changes: a project that has a UI keeps it, one that has none keeps answering as before |
| `ui: {}`          | the UI is on, with pages the platform derives from the endpoints                               |
| `ui:` with pages  | the UI is on, with exactly the written pages; nothing is derived                               |
| `ui: off`         | the UI is off: paths outside `/v1` answer as for a project that never had one                  |

A section is stated whole, like a flow's steps: what it leaves out is dropped. A new project starts with `ui: {}`. As soon as `pages` holds one page, visitors see only the written pages, and an endpoint no page uses is not shown.

**Where it is served.** One host, the project's (`baseUrl` on `GET /v1/grant`). `/v1/…` stays the API, and `/health`, `/llms.txt` and the addresses AI apps use (`/mcp`, `/.well-known/…`, `/oauth/…`) answer as before. Every other path opened in a browser is the UI. A page's path never starts with `/v1`, `/health`, `/llms`, `/_next`, `/_ui`, `/mcp`, `/.well-known` or `/oauth`.

## The worked model

**Reading club** has two tables, `book` (shared) and `review` (owned by its writer), and these endpoints:

| Key            | Method | Path                                                | Sign-in  |
| -------------- | ------ | --------------------------------------------------- | -------- |
| `list-books`   | GET    | `/v1/app/books` (takes `q`, `cursor`)               | required |
| `get-book`     | GET    | `/v1/app/books/{bookId}`                            | required |
| `add-book`     | POST   | `/v1/app/books`                                     | required |
| `update-book`  | PATCH  | `/v1/app/books/{bookId}`                            | required |
| `list-reviews` | GET    | `/v1/app/books/{bookId}/reviews`                    | required |
| `add-review`   | POST   | `/v1/app/books/{bookId}/reviews`                    | required |
| `recommend`    | POST   | `/v1/app/books/{bookId}/recommend` (takes `userId`) | required |
| `list-members` | GET    | `/v1/app/members` (takes `q`)                       | required |
| `public-book`  | GET    | `/v1/pub/books/{bookId}`                            | none     |

A list answers `{ items, nextCursor }`; a book carries `id`, `title`, `author`, `year`, `addedAt` and `mine`. Two pages of its `ui` section:

```yaml
ui:
  name: Reading club
  home: books
  menu: [books]
  theme: { accent: "#2f6fed", appearance: auto, radius: medium, font: sans }
  pages:
    books:
      path: /books
      title: Books
      state: { q: "" }
      data:
        books: { endpoint: list-books, with: { q: state.q } }
      body:
        - search: { into: q, placeholder: Find a book }
        - table:
            rows: books.items
            columns:
              [title, author, { field: addedAt, label: Added, format: date }]
            open: { go: book, with: { bookId: row.id } }
            empty: No books yet.
    book:
      path: /books/{bookId}
      title: "{{book.title}}"
      data:
        book: { endpoint: get-book, with: { bookId: path.bookId } }
        reviews: { endpoint: list-reviews, with: { bookId: path.bookId } }
      body:
        - facts: { from: book, fields: [author, year, addedAt] }
        - list:
            rows: reviews.items
            title: "{{row.stars}} stars"
            text: "{{row.text}}"
            empty: No reviews yet.
        - form:
            {
              endpoint: add-review,
              with: { bookId: path.bookId },
              submit: Add review,
            }
```

The search box writes into the page state `q`; the `books` read passes it to `list-books` and is read again when it changes. A row opens the book's page with its id in the address. After the review form succeeds, every read of the page runs again, so the new review appears without a reload.

## How to work

1. **Start from the derived pages.** Ship `ui: {}`, then read what the platform derives: `kipory call - GET /v1/_ui --out ui.json` (the project host, no sign-in). Its `ui` holds `derived: true`, `menu` and `pages`, already in the form the section takes. Copy `pages` and `menu` into the document, leave `derived` out, and edit. `references/default-ui.md` says how the platform groups endpoints and how to name them so it groups well.
2. **Plan.** The plan checks every page against the endpoints as that plan would leave them: each endpoint, input, answer field, page, dialog, state key, component and setting must exist. A refusal names the page, the place inside it, and often the near name you meant (`references/checks.md`).
3. **Prove it.** Add a check that the page is drawn: `{ "as": "-", "GET": "/v1/_ui", "expect": { "has": ["ui.pages.book.body"] } }`. A page the platform cannot draw is served as `{ path, broken: true }` and has no `body`. Then open the host in a browser and use the forms as a person would.

## The value rules

Every setting is one of four kinds. The kind decides how a string is read.

| Kind      | Settings                                                                                                           | A string is                                                     | Write a literal as                |
| --------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------- |
| word      | `title`, `description`, `label`, `text`, `empty`, `confirm`, `submit`, `placeholder`, `meta`, `who`, `alt`, `help` | text, with `{{path}}` and `{{path\|filter}}` filled in          | plain text                        |
| data      | `rows`, `from`, `value`, `src`, `image`, `when`, `max`, `href`, `each`, `to`, every value of a `with:`             | a path                                                          | `{ literal: … }`; numbers, `true` |
| condition | `show`                                                                                                             | not used: a condition is an object, `{ eq: [book.mine, true] }` | inside it, as for data            |
| name      | `endpoint`, `call`, `go`, `open`, `close`, `into`, `set`, `home`, a menu `page`                                    | a key of the project or of this section                         | not needed                        |

A data value takes the document's argument forms: a path, `{ literal: … }`, `{ path: x, optional: true }` or `{ path: x, default: … }`. A path starts at one of these roots:

| Root           | Means                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| `path.<name>`  | a parameter of this page's address (`path.bookId` on `/books/{bookId}`)      |
| `query.<name>` | a query-string value of the address                                          |
| `state.<key>`  | a page value declared under the page's `state`                               |
| a data key     | the answer of a `data` read of this page or of `ui.data`                     |
| an `as` name   | the item of an enclosing `each`                                              |
| `row`          | the current row inside a `table`, `list` or `timeline`, and in its `actions` |
| `result`       | the answer of the last successful `call` in the same action list             |

A form field's `label` and `help` are plain text, with no fill-ins. A data key, a state key and an `as` are identifiers: letters, digits and `_`.

There are **no expressions and no `matches`** in pages: paths, templates with filters, conditions and formats are the whole language. `references/pages-and-values.md` has templates, filters, conditions and formats in full.

## Rules that keep the plan clean

- **A bare string in a data setting is a path.** An outside address in a `link` is `href: { literal: "https://…" }`; `href: https://…` reads a path and is refused.
- **Every required input is supplied**: a `data` read and a `call` pass each in `with:`; a `form` supplies it by `with:`, a field's `value`, or a visible field. A header input is always passed in `with:`.
- **A `go` passes every parameter of the target's address** (`go: book` needs `with: { bookId: … }`).
- **A page reads only GET endpoints**: a `data` read and a `pick`'s list name a GET; a write is a `call` or a `form`.
- **A public page reads only endpoints with `auth: none`**, its pickers' lists too (`references/sign-in-and-sharing.md`).
- **`home` names a page whose path has no `{…}`**: nothing fills its parameters there.
- **Components nest at most four deep**, the page body being the first level. `path`, `query`, `state`, `row` and `result` are not names for a data key, a state key or an `as`.
- **A streaming or subscribe endpoint is never a page's data** or a form's endpoint.

## What will bite you

- **Writing one page turns the rest off.** The derived pages stop the moment `pages` holds a page. Start from the whole derived set, not from an empty section.
- **Changing an endpoint a page uses.** A plan that renames or removes an input, a field or an endpoint a written page uses is refused naming the page. Fix the page in the same document; or an admin names it in `acceptBreaks.pages` and visitors see "this page is unavailable" until a later plan fixes it. An endpoint, flow or type saved on its own route, and an endpoint's `DELETE`, are judged the same way (`references/checks.md`).
- **Sign-up is open unless you close it.** Anyone who signs in on the host becomes a user of the project. A tool meant for known people sets `project.identity.signUp: invite-only` (`references/sign-in-and-sharing.md`).
- **Hiding is not refusing.** A role check belongs in the flow; a button behind `show:` still leaves the endpoint callable.

## References

| File                                | What it answers                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `references/pages-and-values.md`    | a page's settings, `data` and `every`, `state`, `dialogs`, `each`; templates, conditions, formats |
| `references/components.md`          | the layout and display components, each with its settings and an example                          |
| `references/forms-and-actions.md`   | `form` and its 12 controls, `pick`, `search`, `filter`, `button`, `link`, `menu`, the actions     |
| `references/menu-and-theme.md`      | the menu (items, groups, links, `show`), `home`, `layout`, `ui.data`, the icons, the theme        |
| `references/checks.md`              | every `UI_*` code with its fix; breaking a page; `acceptBreaks.pages`; broken pages               |
| `references/default-ui.md`          | how pages are derived from the endpoints, how to name endpoints for it, `GET /v1/_ui`             |
| `references/sign-in-and-sharing.md` | serving and sign-in, public pages and link previews, `signUp`, `findPeople`, `pick: people`       |

## Then

`kipory-expose` for an endpoint a page needs and does not have, and for sign-in providers. `kipory-evolve` before changing an endpoint that written pages use. `kipory-prove` to keep the pages' endpoints working.
