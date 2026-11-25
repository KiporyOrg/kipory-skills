# Queries: a read declared once

<!-- field-ok: authorId — one project's example field name, not a platform field -->
<!-- field-ok: genre — one project's example field name, not a platform field -->
<!-- field-ok: publishedOn — one project's example field name, not a platform field -->
<!-- field-ok: myShelf — one project's example query key, not a platform field -->
<!-- field-ok: followedAuthors — one project's example query key, not a platform field -->

§11 of the flow and record shapes (`patterns.md` has the map of every section); `query-endpoints.md` continues it with a named query read in a flow and the query endpoint.

## 11. A read is a query; a flow only when it computes

A read the project asks more than once — "my shelf", "the authors I follow", "one book" — is declared once as a **query** under its table's `queries` and read by name: by one `record.query` step naming it (`with: { query: book.myShelf }`) in a flow, by another query as a set or a base, and by a `GET` endpoint that declares nothing but its path. Write an inline `record.query` with clauses only when the read needs a value another step computes, or something a query cannot say (the end of this section). A plan steers you: an inline read equal to a declared query warns `READ_REPEATS_QUERY`, and a `GET` whose flow is one inline read answered as is warns `ENDPOINT_IS_A_QUERY`. Neither refuses.

### The worked model, as one document

A reading circle: `author` and `book` are the project's, `follow` and `hide` are each member's own (`owner: "user"`). The endpoint `shelf` (a `GET` on the project's own path `/v1/shelf`) answers the books of the authors the caller follows, newest first, never an author the caller hid, optionally narrowed by `?genre=`; `book` (`/v1/books/{id}`) answers one book. Every field a clause names carries a `filter` use, as for `record.query` ([record-query.md](record-query.md), §9). A query or selection is named by its bare key inside its own table, and `<table>.<key>` anywhere else — another table's query, a flow step.

```json kipory:request=project-document
{
  "kipory": 13,
  "types": {
    "Author": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "country": { "type": "string" }
      }
    },
    "Book": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "authorId": { "type": "string", "maxLength": 200 },
        "publishedOn": { "type": "string", "format": "date-time" },
        "genre": { "type": "string", "maxLength": 200 }
      }
    },
    "Follow": {
      "type": "object",
      "properties": { "authorId": { "type": "string", "maxLength": 200 } }
    },
    "Hide": {
      "type": "object",
      "properties": { "authorId": { "type": "string", "maxLength": 200 } }
    }
  },
  "tables": {
    "author": {
      "owner": "project",
      "type": "Author",
      "selections": {
        "authorChip": { "properties": { "name": "name", "country": "country" } }
      }
    },
    "book": {
      "owner": "project",
      "type": "Book",
      "uses": { "filter": ["publishedOn", "genre", "authorId"] },
      "selections": {
        "bookCard": {
          "properties": {
            "title": "title",
            "publishedOn": "publishedOn",
            "genre": "genre"
          },
          "linked": {
            "author": {
              "relation": "written-by",
              "select": "author.authorChip"
            }
          }
        }
      },
      "queries": {
        "visibleBooks": {
          "where": [
            {
              "kind": "field",
              "field": "authorId",
              "op": "not-in",
              "set": { "query": "hide.hiddenAuthors", "field": "authorId" }
            }
          ]
        },
        "myShelf": {
          "description": "New books by the authors I follow, newest first.",
          "extends": "visibleBooks",
          "params": { "genre": { "type": "string", "optional": true } },
          "where": [
            {
              "kind": "field",
              "field": "authorId",
              "op": "in",
              "set": { "query": "follow.followedAuthors", "field": "authorId" }
            },
            { "kind": "field", "field": "genre", "op": "eq", "param": "genre" }
          ],
          "order": {
            "by": "field",
            "field": "publishedOn",
            "direction": "desc"
          },
          "pageSize": { "default": 20, "max": 50 },
          "select": "bookCard"
        },
        "book": {
          "scope": "project",
          "one": true,
          "params": { "id": { "type": "string" } },
          "where": [
            { "kind": "field", "field": "id", "op": "eq", "param": "id" }
          ],
          "select": "bookCard"
        }
      }
    },
    "follow": {
      "owner": "user",
      "type": "Follow",
      "uses": { "filter": ["authorId"] },
      "queries": {
        "followedAuthors": {
          "description": "The authors the signed-in member follows.",
          "fields": ["authorId"]
        }
      }
    },
    "hide": {
      "owner": "user",
      "type": "Hide",
      "uses": { "filter": ["authorId"] },
      "queries": { "hiddenAuthors": { "fields": ["authorId"] } }
    }
  },
  "relations": {
    "written-by": {
      "label": "Written by",
      "description": "book → author",
      "from": "book.authorId",
      "to": "author",
      "cardinality": "many-to-one"
    }
  },
  "flows": {
    "get-shelf": {
      "label": "Get shelf",
      "inputs": {
        "genre": "string?",
        "readAfter": "string?",
        "readBefore": "string?",
        "readLimit": "number?"
      },
      "outputs": { "shelf": "object" },
      "steps": [
        {
          "key": "read",
          "function": "record.query",
          "with": { "query": "book.myShelf" }
        },
        { "key": "done", "return": { "shelf": "read" } }
      ]
    },
    "get-book": {
      "label": "Get book",
      "inputs": { "id": "string" },
      "outputs": { "book": "object" },
      "steps": [
        {
          "key": "found",
          "function": "record.query",
          "with": { "query": "book.book" }
        },
        { "key": "done", "return": { "book": "found" } }
      ]
    }
  },
  "endpoints": {
    "shelf": { "GET": "/v1/shelf", "flow": "get-shelf" },
    "book": {
      "GET": "/v1/books/{id}",
      "params": { "id": { "in": "path", "type": "string", "required": true } },
      "flow": "get-book"
    }
  }
}
```

A member's `GET` of `/v1/shelf?genre=poetry&limit=5` answers:

```json
{
  "items": [
    {
      "id": "ckbk01",
      "title": "Salt Lines",
      "publishedOn": "2026-06-15T00:00:00.000Z",
      "genre": "poetry",
      "author": { "id": "ckau07", "name": "Ines Amaro", "country": "PT" }
    }
  ],
  "nextCursor": "eyJ2Ijo…",
  "prevCursor": null,
  "paging": null
}
```

Map keys may come in any order: a query may be listed before the set, base or selection it names. Deleting a table deletes its queries and selections; the delete is refused while another table's query or selection, a step or an endpoint still names one of them.

### A query

| Field         | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope`       | `"caller"` (the default): a person-owned table — its own, a set's, the base's or a linked one — answers only the signed-in person's rows. `"project"`: the project's rows and every person's rows of a person-owned table; the plan warns `PROJECT_QUERY_READS_PEOPLE` when a signed-in endpoint serves it                                                                                                                                                                                                                                                                                                                          |
| `extends`     | a base query of the same table: its `scope` and `where` are taken, and this query's `where` is added to them. One level only (`QUERY_EXTENDS_DEPTH`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `params`      | the values a reader gives, by name — at most 16                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `where`       | conditions every row meets, all of them (at most 16, the base's counted in). Absent reads every row the scope allows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `order`       | `{ "by": "created" }` (newest first; `"direction": "asc"` for oldest first), `{ "by": "field", "field", "direction" }` (above), or `{ "by": "meaning" }` beside `semantic`                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `pageSize`    | `{ "default", "max" }`, each 1 to 100. Absent: 50 a page (or `max`, if lower), up to 100                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pages`       | read every page in one read, as on an inline `record.query` (`kipory-data`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `select`      | the selection each row takes: one of the table's `selections` by key (another table's is refused — a selection reads its own table), or one written in place, `{ "properties": {…}, "linked": {…} }`. Or `fields` (which fields each row carries) and `linked` (linked records, as on `record.query`; a linked read may say `when`: `true`, `false` or `{param}` naming a boolean param), not both. Without a selection a row carries its links under `linked.<name>` (and `linkedMore.<name>`), as an inline `record.query` does; with one each linked property sits at the top level of the row (and `<name>More: true` when cut) |
| `one`         | `true`: at most one record. The query must filter `id` by `eq` (`QUERY_ONE_NOT_UNIQUE` otherwise)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `description` | a sentence saying what it answers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

**`where` is `record.query`'s clause grammar ([record-query.md](record-query.md), §9), with fixed values only.** A query reads no value from a run, so where a step's bare string would be a path, a query's fixed text is written `{ "literal": … }`: `{ "kind": "field", "field": "genre", "op": "eq", "value": { "literal": "poetry" } }`. A bare number or `true`/`false` stays as it is. A bare text is refused, and so is an `{ "expr": … }`; a value the reader gives is a `param`. The same form holds at every operand of a clause: a `term`'s `slug`, a `semantic` `text` or `likeRecordId`, a `link` or `stream` `where` entry's `value`, a stream `window`'s `from` / `to`, a `peer` field clause's `value`. A `field` clause carries exactly one of three operands:

- `value` — a fixed value, `{ "literal": … }` (a list for `in` and `not-in`: `{ "literal": ["novel", "poetry"] }`), or a bare number or `true`/`false`;
- `param` — one of the query's `params`;
- `set` — `{ "query": <key>, "field": <field> }`: the values of `field` across that query's rows (`<table>.<key>` for another table's query, as `hide.hiddenAuthors` above) (`field` defaults to `id`), compared with `in` or `not-in`.

`not-in` is the exclusion: it keeps a record holding none of the values, and keeps a record with no value in the field at all — an exclusion removes only what it names. `field: "id"` compares the record's own id (`eq`, `in`, `not-in`) and needs no use.

`contains`, `any`, field order: kipory-data `in-flow-record-functions.md`.

### Sets: the caller's own rows as an operand

A set is read in the same statement as the outer query, as the same caller, with no cap on its size: `followedAuthors` holding 2,500 authors costs one statement, not a list in a value (an inline `in` stops at 1,000). Because the exclusion runs before the page is cut, a page is full whenever enough rows match.

- A set query holds only `field` clauses and sets of its own, two levels deep at most (`QUERY_SET_DEPTH`). A `link`, `term`, `stream` or `semantic` clause in a set, or `one`, `linked` or `select` on it, is refused `QUERY_SET_CLAUSE_KIND`; a query with a `semantic` clause uses no set (`QUERY_SET_WITH_SEMANTIC`).
- The set's `field` is a field of the set's table with a `filter` use, or `id` (`QUERY_SET_FIELD_UNKNOWN`), and of the same kind as the field it is compared to — text to text, number to number (`QUERY_SET_FIELD_TYPE`).
- `pageSize` and `pages` of a set query are ignored.
- An empty set is an answer, not an error: `in` it matches nothing (the caller follows nobody: an empty shelf), `not-in` it matches everything (the caller hid nobody).
- A set or a base reads under the same caller, so one member's follows never reach another's read.
- A set or base is checked from its readers' side too: an edit to `followedAuthors` alone that would break `myShelf` is refused on `myShelf`.

### Params: an absent value never widens the read

```json
"params": {
  "genre": { "type": "string", "optional": true },
  "minStars": { "type": "integer", "min": 1, "max": 5, "default": 1 },
  "ids": { "type": "list", "items": "string", "max": 50 }
}
```

<!-- field-ok: minStars — one project's example param name, not a platform field -->

- **`type`**: `string`, `integer`, `number`, `boolean`, `date-time`, `enum` (with `values`), or `list` (with `items`: `string` or `integer`, for `in` and `not-in`). `min` and `max` bound a number, a text's length or a list's length.
- **Absent, a param takes its `default`.** With `optional: true` instead, every clause naming it is left out — and only those clauses. With neither it is required: a read without it fails `QUERY_PARAM_MISSING` before reading anything. A value of the wrong type or out of bounds fails `QUERY_PARAM_INVALID`. A param has a `default` or `optional`, not both.
- A param is never named `after`, `before` or `limit`: those are the names a request pages by.
- **A param of a set or a base needs a `default`** (`QUERY_SET_PARAMS`, `QUERY_BASE_PARAMS`): its reader cannot pass it a value. A query does not redeclare its base's param (`QUERY_PARAM_SHADOWS_BASE`).

This replaces the two-branch recipe for an optional filter: `?genre=` absent reads the whole shelf, present narrows it, in one step.

### Selections: the answer's type, named once

A selection, under its table's `selections`, maps answer properties to that table's fields (renaming as it likes), and its `linked` properties carry the records a relation brings, each in a selection of the other table named `<table>.<key>` (`author.authorChip` above): `relation`, `select`, and optionally `direction`, `peerTable` (the other table, when the relation reaches several), `limit`, `sortField`, `order`, `onMore`, as a linked read on `record.query`. A row in a selection carries `id` and exactly the properties named, nothing else; a linked one-record property is absent when there is no linked record, and a list stays a list. Two levels of linked at most (`SELECTION_LINKED_DEPTH`). No expressions, no vocabularies: compute in a flow step. A property is a field's name or `{ "field", "values"?, "default"? }`: `values` maps every value of a text `enum` field to the value answered (`{ "field": "state", "values": { "planned": "pending", "packed": "ready" } }`; one left out or one the field cannot hold is `SELECTION_VALUES_INCOMPLETE`, a field that is no enum `SELECTION_VALUES_NOT_ENUM`), and `default` is answered when the record has no value (of the field's type, or one of the map's values: `SELECTION_DEFAULT_TYPE`). A property may be named `status`, `createdAt` or `updatedAt` and filled from any field (`"status": "state"`, `"createdAt": "packedAt"`): the answer carries the field, not the record's own. An endpoint that is no query endpoint answers in a selection too, with `answer` ([endpoint-answers.md](endpoint-answers.md), §8). A field the table does not have is `SELECTION_UNKNOWN_FIELD`, a linked selection of another table than the relation reaches `SELECTION_TABLE_MISMATCH`, a selection no table holds `SELECTION_UNKNOWN`. The step value the query answers into, the endpoint's answer and its schema in the project's OpenAPI document (a component per selection, named by its table and key: `Book_bookCard` and `Author_authorChip` here) all take their type from the selection; a query with no selection answers the table's typed rows.

### One at a time, without a document

A table's queries and selections have their own rows, under the table (`{id}` takes its key or its id):

```
GET    /v1/tables/{id}/queries
POST   /v1/tables/{id}/queries
GET    /v1/tables/{id}/queries/{key}
PATCH  /v1/tables/{id}/queries/{key}
DELETE /v1/tables/{id}/queries/{key}
GET    /v1/tables/{id}/selections
POST   /v1/tables/{id}/selections
GET    /v1/tables/{id}/selections/{key}
PATCH  /v1/tables/{id}/selections/{key}
DELETE /v1/tables/{id}/selections/{key}
```

A document and these rows write the same thing; prefer the document when more than one row changes.
