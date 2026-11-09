# Views: a read declared once

<!-- field-ok: authorId — one project's example field name, not a platform field -->
<!-- field-ok: genre — one project's example field name, not a platform field -->
<!-- field-ok: publishedOn — one project's example field name, not a platform field -->
<!-- field-ok: myShelf — one project's example view key, not a platform field -->
<!-- field-ok: followedAuthors — one project's example view key, not a platform field -->

§11 of the flow and record shapes (`patterns.md` has the map of every section); `view-endpoints.md` continues it with `record.view` in a flow and the view endpoint.

## 11. A read is a view; a flow only when it computes

A read the project asks more than once — "my shelf", "the authors I follow", "one book" — is declared once under the document's `views` and read by name: by one `record.view` step in a flow, by another view as a set or a base, and by a `GET` endpoint that declares nothing but its path. Write an inline `record.list` or `record.query` only when the read needs a value another step computes, or something a view cannot say (the end of this section). A plan steers you: an inline read equal to a declared view warns `READ_REPEATS_VIEW`, and a `GET` whose flow is one inline read answered as is warns `ENDPOINT_IS_A_VIEW`. Neither refuses.

### The worked model, as one document

A reading circle: `author` and `book` are the project's, `follow` and `hide` are each member's own (`ownerScope: "user"`). The endpoint `shelf` (a `GET` on the project's own path `/v1/shelf`) answers the books of the authors the caller follows, newest first, never an author the caller hid, optionally narrowed by `?genre=`; `book` (`/v1/books/{id}`) answers one book. Every field a clause names carries a `filter` use, as for `record.query` ([record-query.md](record-query.md), §9).

```json kipory:request=project-document
{
  "kipory": 11,
  "types": {
    "Author": {
      "description": null,
      "definition": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "country": { "type": "string" }
        }
      }
    },
    "Book": {
      "description": null,
      "definition": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "authorId": { "type": "string", "maxLength": 200 },
          "publishedOn": { "type": "string", "format": "date-time" },
          "genre": { "type": "string", "maxLength": 200 }
        }
      }
    },
    "Follow": {
      "description": null,
      "definition": {
        "type": "object",
        "properties": { "authorId": { "type": "string", "maxLength": 200 } }
      }
    },
    "Hide": {
      "description": null,
      "definition": {
        "type": "object",
        "properties": { "authorId": { "type": "string", "maxLength": 200 } }
      }
    }
  },
  "tables": {
    "author": {
      "description": null,
      "ownerScope": "project",
      "type": "Author",
      "uses": { "fields": [] }
    },
    "book": {
      "description": null,
      "ownerScope": "project",
      "type": "Book",
      "uses": {
        "fields": [
          {
            "source": { "family": "submission", "field": "publishedOn" },
            "uses": ["filter"]
          },
          {
            "source": { "family": "submission", "field": "genre" },
            "uses": ["filter"]
          },
          {
            "source": { "family": "submission", "field": "authorId" },
            "uses": ["filter", { "kind": "link", "relation": "written-by" }]
          }
        ]
      }
    },
    "follow": {
      "description": null,
      "ownerScope": "user",
      "type": "Follow",
      "uses": {
        "fields": [
          {
            "source": { "family": "submission", "field": "authorId" },
            "uses": ["filter"]
          }
        ]
      }
    },
    "hide": {
      "description": null,
      "ownerScope": "user",
      "type": "Hide",
      "uses": {
        "fields": [
          {
            "source": { "family": "submission", "field": "authorId" },
            "uses": ["filter"]
          }
        ]
      }
    }
  },
  "relations": {
    "written-by": {
      "label": "Written by",
      "description": "book → author",
      "minConfidence": null,
      "direction": "directed",
      "producer": "field",
      "cardinality": "many-to-one",
      "sortOrder": 0,
      "pairings": [{ "fromTableKey": "book", "toTableKey": "author" }]
    }
  },
  "shapes": {
    "authorChip": {
      "table": "author",
      "properties": { "name": "name", "country": "country" }
    },
    "bookCard": {
      "table": "book",
      "properties": {
        "title": "title",
        "publishedOn": "publishedOn",
        "genre": "genre"
      },
      "linked": {
        "author": { "relation": "written-by", "shape": "authorChip" }
      }
    }
  },
  "views": {
    "followedAuthors": {
      "description": "The authors the signed-in member follows.",
      "table": "follow",
      "fields": ["authorId"]
    },
    "hiddenAuthors": { "table": "hide", "fields": ["authorId"] },
    "visibleBooks": {
      "table": "book",
      "where": [
        {
          "kind": "field",
          "field": "authorId",
          "op": "not-in",
          "set": { "view": "hiddenAuthors", "field": "authorId" }
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
          "set": { "view": "followedAuthors", "field": "authorId" }
        },
        { "kind": "field", "field": "genre", "op": "eq", "param": "genre" }
      ],
      "order": { "by": "field", "field": "publishedOn", "direction": "desc" },
      "pageSize": { "default": 20, "max": 50 },
      "shape": "bookCard"
    },
    "book": {
      "table": "book",
      "scope": "project",
      "one": true,
      "params": { "id": { "type": "string" } },
      "where": [{ "kind": "field", "field": "id", "op": "eq", "param": "id" }],
      "shape": "bookCard"
    }
  },
  "flows": {
    "get-shelf": {
      "label": "Get shelf",
      "inputs": {
        "genre": { "typeName": "string", "optional": true },
        "readAfter": { "typeName": "string", "optional": true },
        "readBefore": { "typeName": "string", "optional": true },
        "readLimit": { "typeName": "number", "optional": true }
      },
      "outputs": { "shelf": { "typeName": "object" } },
      "steps": [
        {
          "key": "read",
          "function": "record.view",
          "with": { "view": "myShelf" }
        },
        { "key": "done", "return": { "shelf": "read" } }
      ]
    },
    "get-book": {
      "label": "Get book",
      "inputs": { "id": { "typeName": "string" } },
      "outputs": { "book": { "typeName": "object" } },
      "steps": [
        {
          "key": "found",
          "function": "record.view",
          "with": { "view": "book" }
        },
        { "key": "done", "return": { "book": "found" } }
      ]
    }
  },
  "surfaces": {
    "endpoints": {
      "shelf": {
        "contractConfig": {
          "method": "GET",
          "path": "/v1/shelf",
          "params": {},
          "successStatus": 200,
          "auth": "required"
        },
        "targetConfig": {
          "kind": "flow.invoke",
          "execution": "sync",
          "flow": "get-shelf",
          "inputs": {}
        }
      },
      "book": {
        "contractConfig": {
          "method": "GET",
          "path": "/v1/books/{id}",
          "params": {
            "id": { "in": "path", "type": "string", "required": true }
          },
          "successStatus": 200,
          "auth": "required"
        },
        "targetConfig": {
          "kind": "flow.invoke",
          "execution": "sync",
          "flow": "get-book",
          "inputs": {}
        }
      }
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

Map keys may come in any order: a view may be listed before the set, base or shape it names, and a document may delete a view together with the table it reads.

### A view

| Field         | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table`       | the table it reads. Not beside `extends`, which takes the base's                                                                                                                                                                                                                                                                                                                                                                             |
| `scope`       | `"caller"` (the default): a person-owned table — its own, a set's, the base's or a linked one — answers only the signed-in person's rows. `"project"`: the project's rows; refused on a view reaching a person-owned table (`VIEW_SCOPE_PROJECT_READS_PEOPLE`)                                                                                                                                                                               |
| `extends`     | a base view: its `table`, `scope` and `where` are taken, and this view's `where` is added to them. One level only (`VIEW_EXTENDS_DEPTH`)                                                                                                                                                                                                                                                                                                     |
| `params`      | the values a reader gives, by name — at most 16                                                                                                                                                                                                                                                                                                                                                                                              |
| `where`       | conditions every row meets, all of them (at most 16, the base's counted in). Absent reads every row the scope allows                                                                                                                                                                                                                                                                                                                         |
| `order`       | `{ "by": "created" }`, `{ "by": "field", "field", "direction" }` (above), or `{ "by": "meaning" }` beside `semantic`                                                                                                                                                                                                                                                                                                                         |
| `pageSize`    | `{ "default", "max" }`, each 1 to 100. Absent: 50 a page (or `max`, if lower), up to 100                                                                                                                                                                                                                                                                                                                                                     |
| `pages`       | read every page in one read, as on `record.list` (`kipory-data`)                                                                                                                                                                                                                                                                                                                                                                             |
| `shape`       | the shape each row takes. Or `fields` (which fields each row carries) and `linked` (linked records, as on `record.query`; a linked read may say `when`: `true`, `false` or `{param}` naming a boolean param), not both. Without a shape a row carries its links under `linked.<name>` (and `linkedMore.<name>`), as `record.list` does; with a shape each linked property sits at the top level of the row (and `<name>More: true` when cut) |
| `one`         | `true`: at most one record. The view must filter `id` by `eq` (`VIEW_ONE_NOT_UNIQUE` otherwise)                                                                                                                                                                                                                                                                                                                                              |
| `description` | a sentence saying what it answers                                                                                                                                                                                                                                                                                                                                                                                                            |

**`where` is `record.query`'s clause grammar ([record-query.md](record-query.md), §9), with fixed values only.** A view reads no value from a run, so where a step's bare string would be a path, a view's fixed text is written `{ "literal": … }`: `{ "kind": "field", "field": "genre", "op": "eq", "value": { "literal": "poetry" } }`. A bare number or `true`/`false` stays as it is. A bare text is refused, and so is an `{ "expr": … }`; a value the reader gives is a `param`. The same form holds at every operand of a clause: a `term`'s `slug`, a `semantic` `text` or `likeRecordId`, a `link` or `stream` `where` entry's `value`, a stream `window`'s `from` / `to`, a `peer` field clause's `value`. A `field` clause carries exactly one of three operands:

- `value` — a fixed value, `{ "literal": … }` (a list for `in` and `not-in`: `{ "literal": ["novel", "poetry"] }`), or a bare number or `true`/`false`;
- `param` — one of the view's `params`;
- `set` — `{ "view": <key>, "field": <field> }`: the values of `field` across that view's rows (`field` defaults to `id`), compared with `in` or `not-in`.

`not-in` is the exclusion: it keeps a record holding none of the values, and keeps a record with no value in the field at all — an exclusion removes only what it names. `field: "id"` compares the record's own id (`eq`, `in`, `not-in`) and needs no use.

`contains`, `any`, field order: kipory-data `in-flow-record-functions.md`.

### Sets: the caller's own rows as an operand

A set is read in the same statement as the outer view, as the same caller, with no cap on its size: `followedAuthors` holding 2,500 authors costs one statement, not a list in a value (an inline `in` stops at 1,000). Because the exclusion runs before the page is cut, a page is full whenever enough rows match.

- A set view holds only `field` clauses and sets of its own, two levels deep at most (`VIEW_SET_DEPTH`). A `link`, `term`, `stream` or `semantic` clause in a set, or `one` or `linked` on it, is refused `VIEW_SET_CLAUSE_KIND`; a view with a `semantic` clause uses no set (`VIEW_SET_WITH_SEMANTIC`).
- The set's `field` is a field of the set's table with a `filter` use, or `id` (`VIEW_SET_FIELD_UNKNOWN`), and of the same kind as the field it is compared to — text to text, number to number (`VIEW_SET_FIELD_TYPE`).
- `pageSize` and `pages` of a set view are ignored.
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
- **Absent, a param takes its `default`.** With `optional: true` instead, every clause naming it is left out — and only those clauses. With neither it is required: a read without it fails `VIEW_PARAM_MISSING` before reading anything. A value of the wrong type or out of bounds fails `VIEW_PARAM_INVALID`. A param has a `default` or `optional`, not both.
- A param is never named `after`, `before` or `limit`: those are the names a request pages by.
- **A param of a set or a base needs a `default`** (`VIEW_SET_PARAMS`, `VIEW_BASE_PARAMS`): its reader cannot pass it a value. A view does not redeclare its base's param (`VIEW_PARAM_SHADOWS_BASE`).

This replaces the two-branch recipe for an optional filter: `?genre=` absent reads the whole shelf, present narrows it, in one step.

### Shapes: the answer's type, named once

A shape maps answer properties to one table's fields (renaming as it likes), and its `linked` properties carry the records a relation brings, each in a shape of the other table: `relation`, and optionally `direction`, `peerTable` (the other table, when the relation reaches several), `limit`, `onMore`, as a linked read on `record.query`. A row in a shape carries `id` and exactly the properties named, nothing else; a linked one-record property is absent when there is no linked record, and a list stays a list. Two levels of linked at most (`SHAPE_LINKED_DEPTH`). No expressions, no vocabularies: compute in a flow step. A field the table does not have is `SHAPE_UNKNOWN_FIELD`, a linked shape of another table than the relation reaches `SHAPE_TABLE_MISMATCH`. The step value the view answers into, the endpoint's answer and its schema in the project's OpenAPI document (a component per shape, `BookCard` and `AuthorChip` here) all take their type from the shape; a view with no shape answers the table's typed rows.
