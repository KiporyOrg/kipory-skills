<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `vocabulary.aggregate` — Count records by term

Count a user's records by term, as a list or a browsable tree.

Counts a user's records per term and groups them by vocabulary, rolling merged terms into the one they point at. Comes back as a flat catalog per vocabulary, or as a nested browse tree. Use it to answer what someone has, rather than searching it.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `VocabularyAggregate`
- **Reads:** The user id, from the slot `userIdSlot` names. Every count is scoped to that user. Everything else is settings on the action. _(shape hint: `string`)_
- **Emits:** A `VocabularyAggregate` — the user's terms grouped per vocabulary with counts — or a `VocabularyTree` when `shape` is `tree`. A user with no terms gets an empty result.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxEntriesPerVocabulary` | integer, 1 to 1000 | no | `200` | Most entries per vocabulary group, or per tree level. 200 by default, between 1 and 1000. ⚠️ Entries are sorted by count first, so when a group runs past the cap the highest-count terms are the ones that survive. |
| `shape` | `aggregate` \| `tree` | no | `"aggregate"` | Which shape comes out: `aggregate` (the default) for a flat catalog per vocabulary, or `tree` for a nested browse tree. ⚠️ Under `tree` the per-vocabulary cap becomes a per-level cap — categories, then a category's types, then a type's subtypes. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id. Every count is scoped to that user; another user's records never contribute. ⚠️ This value is mandatory: an empty one fails the action rather than counting across users. |
| `vocabularies` | string[] | no | — | Which vocabularies to include. Leave it empty for every vocabulary the user has terms in. Any project vocabulary is accepted. ⚠️ Under `shape: tree` this is not a filter but the ordered list of levels, outermost first. |

## Worked example

Groups a user's terms per vocabulary and counts their records, so an action can answer what they have without reading it.

#### Every vocabulary

No vocabulary filter, so every vocabulary the user has surfaces, each with its count and the biggest first.

Reads `object` → emits `VocabularyAggregate` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "shape": "aggregate",
  "userIdSlot": "userInfo.userId"
}
```

Input:

```
{ "userId": "ckwx_user_a", "email": "a@example.com" }
```

Output:

```
{
  "vocabularies": [
    { "vocabularyKey": "category", "totalTerms": 2, "totalItems": 17, "entries": [
      { "slug": "finance", "label": "Finance", "itemsCount": 12, "parentSlug": null, "parentLabel": null },
      { "slug": "medical", "label": "Medical", "itemsCount": 5,  "parentSlug": null, "parentLabel": null }
    ]},
    { "vocabularyKey": "type", "totalTerms": 2, "totalItems": 10, "entries": [
      { "slug": "invoice",    "label": "Invoice",    "itemsCount": 7, "parentSlug": "finance", "parentLabel": "Finance" },
      { "slug": "lab-result", "label": "Lab result", "itemsCount": 3, "parentSlug": "medical", "parentLabel": "Medical" }
    ]},
    { "vocabularyKey": "tag", "totalTerms": 1, "totalItems": 9, "entries": [
      { "slug": "2026", "label": "2026", "itemsCount": 9, "parentSlug": null, "parentLabel": null }
    ]}
  ]
}
```

#### No terms yet

Nothing has been categorized yet, so the function stops early and emits an empty catalog.

Reads `object` → emits `VocabularyAggregate` · 1 in → 1 out

Input:

```
{ "userId": "ckwx_new_user", "email": "new@example.com" }
```

Output:

```
{ "vocabularies": [] }
```

#### Browse tree

The same counts, nested instead of flat. Empty branches are pruned unless they lead to a term that survives.

Reads `object` → emits `VocabularyTree` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "shape": "tree",
  "userIdSlot": "userInfo.userId"
}
```

Input:

```
{ "userId": "ckwx_user_a", "email": "a@example.com" }
```

Output:

```
{
  "categories": [
    { "type": "category", "title": "Finance", "slug": "finance", "itemsCount": 12, "categoriesCount": 1, "items": [
      { "type": "type", "title": "Invoice", "slug": "invoice", "itemsCount": 7, "categoriesCount": 1, "items": [
        { "type": "subtype", "title": "Paid", "slug": "paid", "itemsCount": 4 }
      ]}
    ]},
    { "type": "category", "title": "Medical", "slug": "medical", "itemsCount": 5, "categoriesCount": 1, "items": [
      { "type": "type", "title": "Lab result", "slug": "lab-result", "itemsCount": 3, "categoriesCount": 0, "items": [] }
    ]}
  ]
}
```
