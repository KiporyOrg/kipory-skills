# Serving, sign-in, public pages and finding people

<!-- field-ok: bookId — the worked model's own input -->
<!-- field-ok: userId — the worked model's own input -->

## Where the pages are served

The UI lives on the project's own host, the one its endpoints answer on (`baseUrl` on `GET /v1/grant`). There is no second host for it.

- `/v1/…` is the API, exactly as before; so are `/health`, `/llms.txt`, and `/mcp`, `/.well-known/…` and `/oauth/…`, where AI apps reach the project's tools.
- Every other path, opened with GET, is answered by the UI, but only for a project whose document has a `ui` section. Without one, those paths answer as they always did.
- `GET /v1/_ui` is the UI's own read: the project's name, its sign-in providers, its `signUp` and `findPeople` settings, the pages in force (written or derived, broken ones marked) and what the pages need to know about each endpoint they name. It takes no sign-in, answers only for the host it is asked on, and answers 404 while the project has no `ui` section. It keeps answering when the project turns its API docs off. It holds no record data: the pages and the endpoint list are already public in the project's API description.

The UI calls the endpoints from the visitor's browser with the visitor's own session and no other credential, so every endpoint answers exactly as it would to that person in any other client. Every page is served with a content security policy that allows script and style only from the UI itself and forbids framing by other sites. A value that holds HTML or script is shown as text.

## Sign-in

A signed-out visitor who opens a `signed-in` page gets a sign-in page with the project's name (the section's `name`) and one button per provider the project has on (`project.identity.providers`; `kipory-expose`). After signing in they return to the address they asked for. Sign-in started on the project's host returns to that host with no setting of yours: no `appDomain` is needed for the UI. A page fetched signed out carries no data from any endpoint.

If an endpoint answers 401 during a visit, the visitor is sent to sign in and brought back. A 403 is shown as the refusal.

## Who may sign up

**Sign-up is open unless the project says otherwise.** With it open, anyone who signs in on the host becomes a user of the project, as happens today with any client. A tool meant for known people, an internal tool or a club, sets `invite-only`:

```yaml
kipory: 13
project:
  identity:
    signUp: invite-only
    findPeople: email
ui: {}
```

| `signUp`      | Who becomes a user at sign-in                                                          |
| ------------- | -------------------------------------------------------------------------------------- |
| `open`        | anyone; the default, for new and existing projects alike                               |
| `invite-only` | only a person who already is a user, or holds a pending invite to the project by email |

With `invite-only`, a person with neither is not made a user: no account and no membership are created, they are refused with `project_access_unavailable`, and the UI shows "this project is by invitation". It holds for every way of signing in to the project, the API's own sign-in routes included, not only the UI's page. People who were users before the switch keep their access. An invite is sent by email by a signed-in admin of the project; an API key cannot send one, because an invite seats a person.

Like every `project.identity` setting, `signUp` and `findPeople` are kept when the document leaves them out, and changing them needs ADMIN.

## Finding other people

`findPeople` decides whether a user of the project can look up its other users, for a form field that takes a person's id. It is off unless set.

| `findPeople` | A signed-in user can                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `off`        | find no one; a `pick: people` field is a text box for the id                                                             |
| `email`      | type someone's exact email (case aside) and get that one person's id, name and picture; part of an address finds nothing |
| `browse`     | type at least two letters of a name or an email and pick from the matching people, with their picture                    |

Whatever the setting, only people who have signed in to this project are ever found, and a signed-out visitor finds no one. Test users (`kipory call alice …`) are never found: to see the picker list someone, sign in on the host with a real account.

```yaml
- form:
    endpoint: recommend
    with: { bookId: path.bookId }
    fields:
      userId: { label: Who should read it?, pick: people }
```

A project that lists its own users through an endpoint, as the worked model's `list-members` does, can pick from that list instead (`forms-and-actions.md`); that list is whatever its flow returns.

## Public pages and link previews

A page with `access: public` opens with no sign-in, to a visitor signed in elsewhere who is no user of the project too. Its `data` reads only endpoints with `auth: none`, or the plan refuses it (`UI_PUBLIC_READS_PRIVATE`). It may hold no data at all: a contact form to an `auth: none` endpoint, on `/`, is a public page anyone fills in. It is drawn on the server: its HTML already holds its title, its description and its content, so a link pasted into a chat shows the page's own title and text, and a search engine can read it. A read of an asynchronous endpoint, or one that has not answered within 4 seconds, is left to the visitor's browser.

```yaml
public-book:
  path: /p/books/{bookId}
  access: public
  title: "{{book.title}}"
  description: "{{book.title}} by {{book.author}}"
  data:
    book: { endpoint: public-book, with: { bookId: path.bookId } }
  body:
    - heading: { text: "{{book.title}}", level: 1 }
    - facts: { from: book, fields: [author, year] }
```

`title` becomes the page's title and the preview's title, and `description` the preview's text. Prove it with a check that fetches the page as no one and reads the raw HTML, after an earlier request saved a book's id as `book` and its title as `title`:

```json
{
  "as": "-",
  "GET": "/p/books/{{book}}",
  "expect": { "status": 200, "contains": "{{title}}" }
}
```

## Native apps and your own frontend

The UI is one more client of the endpoints. A native app, or a web app of your own on your own domain, keeps calling the same endpoints with its own sign-in (`kipory-expose`'s `references/sign-in.md`). A project can have both.
