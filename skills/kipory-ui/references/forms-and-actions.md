# Forms, inputs and actions

<!-- field-ok: bookId — the worked model's own input -->
<!-- field-ok: userId — the worked model's own input -->

Examples are bodies for the worked model's `book` page, as in `components.md`: it reads `book` and `reviews`, declares the state `q`, `stars` and `shown`, and has a dialog `recommend`.

## `form`

`endpoint` (required), `with`, `fields`, `submit` (word), `then` (actions). A form draws **one control per input of its endpoint**, chosen from the input's type, and sends them to that endpoint as the visitor. An input `with:` supplies is not drawn. A header input is never drawn, so a required one is passed in `with:`.

```yaml
- form:
    endpoint: add-review
    with: { bookId: path.bookId }
    fields:
      text: { as: long-text, label: Your review, help: What did you think? }
    submit: Add review
```

Before sending, the form checks each value against the input's declared type. A refusal from the endpoint is shown on the page, and an input error on the field it names. An endpoint that answers 202 shows that the request was accepted, then its result when it is ready. After a successful submit every read of the page runs again, then `then` runs, reading the answer as `result`:

```yaml
add-a-book:
  path: /new-book
  title: Add a book
  body:
    - form:
        endpoint: add-book
        submit: Add
        then: [{ go: book, with: { bookId: result.id } }]
```

**`fields`** overrides one input, by its name:

| Setting  | Means                                                                    |
| -------- | ------------------------------------------------------------------------ |
| `label`  | the field's label; default: the input's title, or its name made readable |
| `help`   | a line under the field                                                   |
| `as`     | the control, one of the 12 below                                         |
| `pick`   | where a `pick` takes its options                                         |
| `value`  | a prefilled value (data): `value: book.title`                            |
| `hidden` | `true`: not drawn; sent only when `with:` or `value` gives it a value    |
| `chip`   | a word: the input drawn locked, as a chip with this text and its tile    |

A `chip` shows the visitor what a supplied input is set to without letting them change it — the book a review is added to, when the form opens from the book's page. Its value comes from `with:` or `value` (else `UI_VALUE_INVALID`), and it is not `hidden` too:

```yaml
- form:
    endpoint: add-review
    with: { bookId: path.bookId }
    fields:
      bookId: { label: Book, chip: "{{book.title}}" }
```

The form itself draws a field the endpoint does not require with "optional" beside its label and marks a required one; in a dialog it sets short fields (a date, a number, an amount) two in a row. A field's `label` and `help` are plain text, with no fill-ins. An `as` must fit the input's type (`amount` a number, `date` a text), and `as: pick` needs a `pick` source. An edit form follows its prefilled data as it loads; a field that had a value and was cleared is sent as `null` when its input accepts null, and otherwise left out so the old value stays; the form waits for a file still uploading.

Every required input is supplied by `with:`, a `value`, or a field that is drawn. A required input that is hidden and has no value is refused (`UI_INPUT_MISSING`); an optional one is simply not drawn and not sent.

## An object input: a field per property

A body or query input whose type is an object with `properties` (a whole form taken as one input) is drawn as **one field per property**, each with its own control, labelled from the property's title or name. A property is required when the object lists it in `required` and the input itself is required. The form sends the properties back inside the object, under the input's name, leaving out the empty optional ones, and leaves out an optional object input none of whose properties is filled. Key a property's override `<input>.<property>`. An unknown property is `UI_INPUT_UNKNOWN`, and an `as` must fit the property's type. Hiding an optional property leaves it out of what is sent, as a honeypot a bot fills and a person never sees:

```yaml
- form:
    endpoint: contact
    fields:
      contactForm.comments: { label: Anything else?, help: Optional }
      contactForm.website: { hidden: true }
```

One level only: a property that is itself an object is one field, drawn as an input of that type is. An override on the input itself (`contactForm: { value: … }`, `hidden`, `chip`, `as`, `pick`) draws or supplies the input whole, as does `with:`. An input error the endpoint names at `/contactForm/email` shows on that property's field.

## The 12 controls

| Control     | Drawn for, when `fields` names none                                               |
| ----------- | --------------------------------------------------------------------------------- |
| `text`      | a string                                                                          |
| `long-text` | a string whose `maxLength` is over 200 and that has no `format`                   |
| `number`    | a number                                                                          |
| `select`    | an `enum`                                                                         |
| `radio`     | an `enum`, only when `fields` names it: every option shown                        |
| `checkbox`  | a list of an `enum`; a boolean, when `fields` names it                            |
| `switch`    | a boolean                                                                         |
| `date`      | a string with `format: date`                                                      |
| `date-time` | a string with `format: date-time`: typed and shown in UTC, marked "UTC"           |
| `file`      | a `file` input: the visitor's own file, uploaded, its reference sent              |
| `pick`      | an id chosen from a list endpoint of the project, or from people                  |
| `amount`    | a number in hundredths, only when `fields` names it: typed as 45.00, sent as 4500 |

An `amount` takes "45.50", "45,50", "1,234.50" and "1.234,50"; one mark with exactly three digits after it groups thousands ("1,500" and "1.500" are 1,500.00).

## `pick`

A field that takes the id of something the project lists shows a searchable list of those things instead of a text box. `pick` names the list endpoint (a GET), the row field submitted (`value`), the row field shown (`label`), and optionally the endpoint's input that receives the typed text (`search`):

```yaml
- form:
    endpoint: recommend
    with: { bookId: path.bookId }
    fields:
      userId:
        label: Member
        pick: { from: list-members, value: id, label: name, search: q }
    submit: Recommend
```

The options are what that endpoint answers to this visitor. `value` and `label` must be fields of its rows, and `search` one of its inputs. `pick: people` lists the project's users instead, as the project's `findPeople` setting allows; with it `off` the field is a text box (`sign-in-and-sharing.md`).

## `search` and `filter`

**`search`** — `into` (a state key), `placeholder` (word). It writes the typed text into page state, and every read whose `with:` reads that state runs again a moment after typing stops.

```yaml
- search: { into: q, placeholder: Find a review }
```

**`filter`** — `into` (a state key), `placeholder`, `options`: written out as `{ value, label }`, or read from a list as `{ from, value, label }`.

```yaml
- filter:
    into: shown
    options:
      [{ value: all, label: All reviews }, { value: five, label: Five stars }]
- filter:
    into: stars
    placeholder: Any stars
    options: { from: reviews.items, value: stars, label: stars }
```

A state value does something only where a `with:` or a `show:` reads it.

## `button`, `link` and `menu`

**`button`** — `label` (word), `tone` (`primary`, `default`, `danger`), `confirm` (word: asked before the actions run), `do` (actions).

```yaml
- button:
    label: Five stars
    tone: primary
    confirm: Add a five-star review of {{book.title}}?
    do:
      - { call: add-review, with: { bookId: path.bookId, stars: 5 } }
      - { set: stars, to: result.stars }
```

**`link`** — `label` (word), and either `go` (a page) with `with`, or `href` (data), never both. An outside address is a literal: `https`, `http` or `mailto`.

```yaml
- link: { label: All books, go: books }
- link:
    { label: Write to the club, href: { literal: "mailto:club@example.com" } }
```

**`menu`** — `label` (word), `items`: entries of `label`, `confirm`, `show` and `do`. The same entries are a `table`'s or `list`'s row `actions`, where they read `row`.

```yaml
- menu:
    label: More
    items:
      - { label: Recommend, do: [{ open: recommend }] }
      - {
          label: Show five-star reviews,
          do: [{ set: shown, to: { literal: five } }],
        }
      - label: Edit
        show: { eq: [book.mine, true] }
        do: [{ go: edit-book, with: { bookId: path.bookId } }]
```

## Actions

A `button`, a menu entry, a row action and a form's `then` run a list of actions, in order. The list stops at the first one that fails.

| Action  | Written as                      | Does                                                                                 |
| ------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| `call`  | `{ call: <endpoint>, with: … }` | calls an endpoint as the visitor; its answer is `result` for what follows            |
| `go`    | `{ go: <page>, with: … }`       | opens a page; `with` passes every parameter of its address, and may add query values |
| `set`   | `{ set: <state key>, to: … }`   | sets a page state value; the key must be declared under the page's `state` first     |
| `open`  | `{ open: <dialog> }`            | opens a dialog of this page                                                          |
| `close` | `{ close: <dialog> }`           | closes it                                                                            |

`confirm:` on a button or an entry asks before anything runs; its yes button carries the pressed control's label, in the danger tone for a `danger` control or a `DELETE` call. After a successful `call`, every read of the page runs again. A `call` passes every required input of its endpoint in `with:`; a stream or subscribe endpoint cannot be called. There is no script: nothing else runs on a page.

**Refusals reach the visitor.** A `403` from an endpoint is shown as the refusal; nothing hides a control by role unless the page's own `show:` says so. A `401` mid-visit sends the visitor to sign in and back.
