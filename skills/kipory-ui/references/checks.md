# What the plan checks

<!-- field-ok: bookId — the worked model's own input -->

A plan checks the `ui` section against the endpoints **as that plan would leave them**, so an endpoint added in the same document can be used at once. Nothing unknown is ignored: a component, a setting, an action, a control, a format, a filter or a condition the catalog does not have is refused. Each finding carries the page key, the place inside the section (`ui.pages.book.body.2.form.endpoint`), a message in plain words, and a "did you mean" when a near name exists. Gate on `severity`: a `{{…}}` that is not a fill-in is a warning, every other finding an error. `kipory docs <CODE>` explains any of them.

## The codes

| Code                       | Means                                                                                                                                                                                                                                                                                                                                                   | Fix                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `UI_COMPONENT_UNKNOWN`     | a component the catalog does not have, or one object naming two                                                                                                                                                                                                                                                                                         | use one of the 21; one name per object                                              |
| `UI_SETTING_UNKNOWN`       | a setting, action, control, format, filter or condition operator that does not exist there                                                                                                                                                                                                                                                              | the message lists the settings that do; `show` goes inside the settings             |
| `UI_VALUE_INVALID`         | a value of the wrong kind or outside its values: a theme value, a bad link or image address, `go` and `href` together, an `every` outside 2s–10m, a template with HTML or an unclosed section, a text where a path was meant, a data or state key that is not an identifier, an `as` that cannot draw its input, a second `tone: primary` in one header | write the allowed value; a literal text in a data setting is `{ literal: … }`       |
| `UI_ENDPOINT_UNKNOWN`      | `endpoint`, `call` or `pick.from` names no endpoint of the project                                                                                                                                                                                                                                                                                      | the endpoint's key, as the hint suggests, or add the endpoint in the same document  |
| `UI_ENDPOINT_NOT_DRAWABLE` | the endpoint streams or is a subscription; a `data` read or a `pick.from` names an endpoint that is not a GET                                                                                                                                                                                                                                           | read a GET endpoint; call a write from a button or a form                           |
| `UI_INPUT_UNKNOWN`         | a `with:`, a `fields` entry or a `pick.search` names an input the endpoint does not take, or a `fields` key `<input>.<property>` a property its object input does not have                                                                                                                                                                              | the input's name as the endpoint declares it                                        |
| `UI_INPUT_MISSING`         | a read or a `call` leaves out a required input; a form neither supplies nor draws one                                                                                                                                                                                                                                                                   | pass it in `with:`; give a hidden field a `value`; a header input always in `with:` |
| `UI_FIELD_UNKNOWN`         | a path reads a field the endpoint's answer, or the row, does not have; a `pick`'s `value` or `label` is not a field of its rows; `rows`, `each`, a `count` or options `from` read a value that is not a list                                                                                                                                            | the field as the answer names it                                                    |
| `UI_PATH_UNKNOWN`          | a path's root is not known where it is used: `path.x` the address lacks, an undeclared `state.x`, `row` outside a row, `result` before a `call`                                                                                                                                                                                                         | declare the state, add the parameter to the page's path, or move the read           |
| `UI_PAGE_UNKNOWN`          | `go`, `home` or a menu item names no page of the section                                                                                                                                                                                                                                                                                                | the page's key; with no pages written, a derived page's key                         |
| `UI_PAGE_PARAM_MISSING`    | a `go` does not pass a parameter of the target page's address; `home` names a page whose path has a `{…}`                                                                                                                                                                                                                                               | add it to the `go`'s `with:`; make `home` a page with no `{…}`                      |
| `UI_DIALOG_UNKNOWN`        | `open` or `close` names no dialog of the same page                                                                                                                                                                                                                                                                                                      | declare it under the page's `dialogs`                                               |
| `UI_PATH_INVALID`          | a page path does not start with `/`, has an empty, `.` or `..` part, names a parameter twice, or lies under `/v1`, `/health`, `/llms`, `/_next`, `/_ui`, `/mcp`, `/.well-known`, `/oauth`                                                                                                                                                               | another path                                                                        |
| `UI_PATH_TAKEN`            | two pages have the same path once parameter names are erased                                                                                                                                                                                                                                                                                            | give one another path                                                               |
| `UI_PUBLIC_READS_PRIVATE`  | a public page reads, or a field of it picks from, an endpoint that requires sign-in                                                                                                                                                                                                                                                                     | read an `auth: none` endpoint, or make the page `signed-in`                         |
| `UI_NESTING_TOO_DEEP`      | components nest more than four deep                                                                                                                                                                                                                                                                                                                     | flatten: a `section` inside a `tabs` inside `columns` is already three              |
| `UI_NAME_RESERVED`         | `path`, `query`, `state`, `row` or `result` used as a data key, state key or `as`                                                                                                                                                                                                                                                                       | another name                                                                        |

## Examples the plan refuses

Each is refused with the code on its first line.

```yaml
# refused: UI_ENDPOINT_UNKNOWN
ui:
  pages:
    book:
      path: /books/{bookId}
      data:
        book: { endpoint: get-bok, with: { bookId: path.bookId } }
      body:
        - facts: { from: book }
```

```yaml
# refused: UI_FIELD_UNKNOWN
- facts: { from: book, fields: [titel] }
```

```yaml
# refused: UI_INPUT_MISSING
ui:
  pages:
    book:
      path: /books/{bookId}
      data:
        book: { endpoint: get-book }
      body:
        - facts: { from: book }
```

```yaml
# refused: UI_PATH_UNKNOWN
- text: "Searching for {{state.query}}"
- list: { rows: reviews.items, title: "{{state.query}}" }
```

```yaml
# refused: UI_PAGE_PARAM_MISSING
- button: { label: Edit, do: [{ go: edit-book }] }
```

```yaml
# refused: UI_PUBLIC_READS_PRIVATE
ui:
  pages:
    shared-book:
      path: /shared/{bookId}
      access: public
      data:
        book: { endpoint: get-book, with: { bookId: path.bookId } }
      body:
        - facts: { from: book }
```

```yaml
# refused: UI_PATH_TAKEN
ui:
  pages:
    one: { path: "/books/{bookId}", body: [{ heading: One }] }
    two: { path: "/books/{id}", body: [{ heading: Two }] }
```

## A change elsewhere that breaks a page

The pages depend on the endpoints, as a caller sees them. A page passes an endpoint's inputs by the names the endpoint takes (a path parameter by its name in the path), not by the flow's: renaming only the flow's input behind `inputs: { id: { from: path.bookId } }` breaks no page. A plan that renames or removes an endpoint, an input a page passes, or an answer field a page reads, without fixing the page in the same document, is refused with `CONTRACT_BREAK_NOT_ACCEPTED`. Its `contractChanges` has a row of kind `page` naming the page and what it still uses, each change at its place in the document (`ui.pages.book.data.book.with.bookId`) with its `UI_*` code.

Two ways out:

1. **Fix the page in the same document.** The plan checks the pages against the state it leaves, so a renamed input and the page's new `with:` plan together.
2. **Accept the break.** An admin names the page in the document's top-level `acceptBreaks`. Below admin, the plan is refused with `CONTRACT_BREAK_FORBIDDEN`. A page named that does not break is listed in `acceptBreaksNotNeeded`; a name that is no page of the section is refused.

```yaml
# not-ui: a document part, the flows and endpoints it changes are left out
kipory: 13
acceptBreaks:
  pages: [book]
```

A page applied under an accepted break is **broken**. A visitor who opens it sees "this page is unavailable", nothing of it is drawn, and its menu item is hidden. `GET /v1/_ui` serves it as `{ path, broken: true }`. Every later plan lists the pages still broken in `brokenPages`, and the mark clears on the first plan that finds the page whole again.

A `ui` section that is itself wrong (any code above) cannot be accepted: fix it. A plan that changes the section reports its errors directly, never as a `page` row. A change elsewhere that breaks the section as a whole, not one page (a `ui.data` read, `home` or a menu item), cannot be accepted either: edit that part of `ui` in the same document.

The same holds outside a document: an endpoint, flow, type, checkpoint or tool saved on its own route, and an endpoint's `DELETE`, answer a `page` row and are refused the same way until `acceptBreaks.pages` names the page (a `DELETE` takes `{ acceptBreaks }` as an optional body). Each refusal's fix sets one `acceptBreaks` naming every break, endpoints, tables, tools and pages together. On a project that writes pages, those answers and their dry runs list the pages still broken in `brokenPages`. A flow input renamed with `renameInputs` does not rewrite what a page passes: a page passing the old name breaks, and is fixed in the same document or named in `acceptBreaks.pages`.

## What else holds

- **Export gives the section back as written**, with no defaults added: an export of `ui: {}` is `ui: {}`, and a project whose UI is off exports no `ui` (a section left out is kept; a new project starts with its UI on).
- **A change to the section is versioned** like any other design write, and recorded in the change log as `project-ui`.
- **A visitor with a page open while a new document is applied** gets the new pages on their next navigation; a call to an endpoint that is gone shows its refusal.
