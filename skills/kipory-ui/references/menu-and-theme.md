# The menu, the shell and the theme

<!-- field-ok: bookId — the worked model's own input -->

Each example is a whole `ui` section for the worked model (`SKILL.md`), with its pages left out where they are the ones shown there.

## The shell

Every page is drawn inside one shell: the project's name, the menu, and an account corner with the signed-in person's name, picture and sign-out. The account corner is not configurable. On a narrow screen the menu collapses and every layout stacks.

| Setting  | Means                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| `name`   | the name in the shell and on the sign-in page; default: the project's name          |
| `home`   | the page served at `/`, one whose path has no `{…}`; default: the first menu page   |
| `layout` | where the menu sits: `side` (the default) or `top`                                  |
| `data`   | endpoint reads made once per visit, by key; only a menu item's `show` reads them    |
| `menu`   | the menu; default: every page whose path needs no id, in the order they are written |
| `theme`  | the look, below                                                                     |
| `pages`  | the pages by key; absent or empty, the platform derives them (`default-ui.md`)      |

With no `pages` written, `home` and `menu` name the derived pages.

## The menu

An item is one of four things:

| Item            | Written as                                                           |
| --------------- | -------------------------------------------------------------------- |
| a page          | its key: `books`                                                     |
| a page, dressed | `{ page: books, label: All books, icon: book, show: … }`             |
| a group         | `{ group: Club, items: [books, add-book] }`, one level deep          |
| an outside link | `{ link: "https://example.com/club", label: Our site, icon: globe }` |

A page item's label defaults to the page's title. A link goes to `https`, `http` or `mailto`; it is a plain address here, not a path. A page that is broken drops out of the menu, and a group with none of its pages left is not shown.

```yaml
ui:
  home: books
  layout: top
  data:
    members: { endpoint: list-members }
  menu:
    - { page: books, label: All books, icon: book }
    - group: Club
      items:
        - add-book
        - { page: book, label: This book, icon: star }
    - { link: "mailto:club@example.com", label: Write to us, icon: mail }
  pages:
    books:
      path: /books
      title: Books
      data:
        books: { endpoint: list-books }
      body:
        - table:
            { rows: books.items, open: { go: book, with: { bookId: row.id } } }
    book:
      path: /books/{bookId}
      title: "{{book.title}}"
      data:
        book: { endpoint: get-book, with: { bookId: path.bookId } }
      body:
        - facts: { from: book }
    add-book:
      path: /add-book
      title: Add a book
      body:
        - form:
            {
              endpoint: add-book,
              then: [{ go: book, with: { bookId: result.id } }],
            }
```

**An item whose page needs an id** (`book`, at `/books/{bookId}`) appears only while the current address already carries every parameter it needs, by name, and reuses them. Above, "This book" shows on `/books/abc` and on any other page whose path has `{bookId}`, and opens that same book. It is hidden everywhere else. There is no switcher to choose one.

A page under a menu page's path (`/books/abc` under `/books`) keeps that item marked and offers a way back.

**`show` on an item** reads only `ui.data`: the menu sits outside every page, so `path`, `state` and a page's data are not readable there. An item whose `show` reads data that failed to load is hidden. Like every `show`, it hides; it does not protect.

```yaml
ui:
  data:
    members: { endpoint: list-members }
  menu:
    - books
    - { page: members, show: { filled: members.items } }
```

That section writes no pages, so its menu names derived pages: `books` and `members` are the ones the platform derives from `list-books` and `list-members`. A menu that names a page neither written nor derived is refused. Here `add-book` is not a derived page, because the derived `books` page holds the create form in a dialog:

```yaml
# refused: UI_PAGE_UNKNOWN
ui:
  menu: [books, add-book]
```

The icons:

```text
home list grid table book file folder inbox mail message bell calendar clock chart star
heart tag bookmark user users settings search plus check image map globe link lock cart
card box layers help
```

## The theme

Four settings, and nothing else:

| Setting      | Values                                       | Default     |
| ------------ | -------------------------------------------- | ----------- |
| `accent`     | one colour, `"#rrggbb"`                      | `"#0f5daa"` |
| `appearance` | `light`, `dark`, `auto` (follows the device) | `auto`      |
| `radius`     | `none`, `small`, `medium`, `large`           | `medium`    |
| `font`       | `sans`, `serif`, `rounded`, `mono`           | `sans`      |

```yaml
ui:
  name: Reading club
  theme: { accent: "#d97706", appearance: dark, radius: large, font: serif }
```

The page itself is the platform's: warm paper, dark ink and hairline rules, in a light and a dark set. Everything that marks is derived from `accent`: a filled button, links, the current menu item and tab, the focus ring, the hover of a control. Text on a filled button and links stay readable at a contrast of 4.5 to 1 whatever the accent; a filled button's edge and the focus ring stand out from the page at 3 to 1 even for a pale accent. In dark the accent is drawn lighter, so it reads on dark paper.

`radius` rounds two kinds of thing: chips, tiles and menus, and the controls, cards and dialogs, which are square unless `large`:

| `radius` | chips, tiles, menus | buttons, fields, cards, dialogs |
| -------- | ------------------- | ------------------------------- |
| `none`   | 0                   | 0                               |
| `small`  | 2px                 | 0                               |
| `medium` | 3px                 | 0                               |
| `large`  | 8px                 | 6px                             |

`font` picks the reading face: `sans` Instrument Sans, `serif` Source Serif 4, `rounded` Nunito, `mono` IBM Plex Mono. Figures, amounts, dates and ids are always IBM Plex Mono, and column heads, card titles and fact labels are its capitals. The fonts are served by the platform, and a page loads nothing from anyone else. There is no logo, no custom CSS and no other colour to set. The sign-in page follows the theme too.

A colour written as `#fff` or `orange` is refused naming the setting (`UI_VALUE_INVALID`); write all six digits, in quotes, since `#` starts a YAML comment.
