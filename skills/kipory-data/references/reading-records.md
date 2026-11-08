# Reading records: projections, filters, linked records and streams

Read this before a list or query read that names fields, filters by a field or term, brings linked records, or reads a stream: what each part of "Look at what is there" in `SKILL.md` takes and refuses.

A row's `fields` holds only the table's queryable columns, not its `data`. To read some fields of many records, name them with `fields=` (up to 32, `tableKey` required) on the page you already read, or beside `id=` for records you hold ids of — one request a page, never one `GET /v1/records/{id}` a record. A name is a top-level field the table declares, submitted or produced by its flow; a value comes whole, and a field the record has no value for is left out of `values`; an unknown or dotted name, or a stream field, is 422 `RECORD_PROJECTION_UNKNOWN_FIELD` listing the table's fields.

Narrow the list with repeated `field=name:operator:value` and `term=vocabulary:key` (up to 32 of each, AND-composed), `owner`, `status`, `createdAfter`, `createdBefore`. Page with `after` / `before` cursors; `limit` is at most 100. A `term=` condition matches **active** terms only: a record filed under a candidate term is not found by it until the term is admitted (`kipory-model`).

The query body asks what the address cannot spell — a link to another record, a stream window, `in` — and it is the one route that brings each record's **linked records** with it. Leave `clauses` out and it lists the table's records, newest first, paged by `after` like the list; add `linked` and every row carries `linked.<name>`:

```
POST /v1/records/query  { "project": "<node>", "tableKey": "book",
                          "linked": { "author": { "relation": "written-by", "fields": ["name"] },
                                      "reviews": { "relation": "about", "direction": "incoming", "limit": 20 } } }
```

`author` is one record (outgoing on a relation declared many-to-one), `reviews` a list of at most 20 per book — `limit` is per record, not a total; more than 20 is 422 `VALIDATION_FAILED` with `details.reason` `RECORD_LINKED_HAS_MORE` unless the linked read says `"onMore": "stop"`, which keeps 20 and sets `linkedMore.reviews`. A linked read may carry one more level of `linked`. Each linked record is this route's own row shape. `GET /v1/records` takes no `linked` (an unknown member, 422): send `linked` to this POST. The rules and every refusal are in `kipory-model`'s `references/packs/tables-and-types.md`, "One question across the stores". Its clause grammar, `bounded` and `explanation` are in `kipory-model`'s `references/packs/tables-and-types.md`, "One question across the stores". Read `bounded` before `records`: it says whether every matching record was in reach.

A stream field's events are not in the record's `data`. `GET /v1/records/{id}/stream/{field}` pages them newest first, inside the window the field's retention keeps; only a flow's `record.append` action writes them.

The `field=` operators are the platform's one comparison vocabulary — the same words `POST /v1/records/query`, `record.query` and link `where` clauses use: text, reference and boolean take `eq`; number takes `eq`, `gt`, `gte`, `lt`, `lte`; date takes `gt`, `gte`, `lt`, `lte` (a range is two conditions). So `field=cuisine:eq:Italian`, `field=price:lte:20`. A word the field's family does not take is a 422 naming the ones it does. The query body adds `in` (a list), which the address cannot carry. Only fields with a `filter` use can be conditions; `contract.undeclaredFields` lists the rest — a `search`-only field such as an extracted `body` appears there, which is normal, not a misconfiguration.

`key=` matches the stored natural key exactly, case and all. Both sides are **trimmed** of surrounding whitespace: the stored key when the record is written, the lookup when it arrives.
