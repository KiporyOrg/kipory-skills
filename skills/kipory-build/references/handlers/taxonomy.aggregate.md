<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `taxonomy.aggregate` — Aggregate term catalog

Group a user's records by facet terms and count them, as a flat catalog or a browse tree.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `string` → `TaxonomyAggregate`
- **Reads:** The user id, from the slot `userIdSlot` names. Every count is scoped to that user. Everything else is settings on the step. _(shape hint: `string`)_
- **Emits:** A `TaxonomyAggregate` — the user's terms grouped per facet with counts — or a `TaxonomyTree` when `shape` is `tree`. A user with no terms gets an empty result.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `facets` | string[] | no | — | Which facets to include. Leave it empty for every facet the user has terms in. Any project facet is accepted. ⚠️ Under `shape: tree` this is not a filter but the ordered list of levels, outermost first. |
| `maxEntriesPerFacet` | integer | no | `200` | Most entries per facet group, or per tree level. 200 by default, between 1 and 1000. ⚠️ Entries are sorted by count first, so when a group runs past the cap the highest-count terms are the ones that survive. |
| `shape` | `aggregate` \| `tree` | no | `"aggregate"` | Which shape comes out: `aggregate` (the default) for a flat catalog per facet, or `tree` for a nested browse tree. ⚠️ Under `tree` the per-facet cap becomes a per-level cap — categories, then a category's types, then a type's subtypes. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id. Every count is scoped to that user; another user's records never contribute. ⚠️ This value is mandatory: an empty one fails the step rather than counting across users. |

## Worked example

Groups a user's terms per facet and counts their records, so a step can answer what they have without reading it.

Reads: read userId. Emits: term catalog or tree.

#### every facet the user has

No facet filter, so every facet the user has surfaces, each with its count and the biggest first.

Reads `object` → emits `TaxonomyAggregate` · 1 in → 1 out

Input:

```
{ "userId": "ckwx_user_a", "email": "a@example.com" }
```

Output:

```
{
  "facets": [
    { "facet": "category", "totalTerms": 2, "totalItems": 17, "entries": [
      { "slug": "finance", "label": "Finance", "itemsCount": 12, "parentSlug": null, "parentLabel": null },
      { "slug": "medical", "label": "Medical", "itemsCount": 5,  "parentSlug": null, "parentLabel": null }
    ]},
    { "facet": "type", "totalTerms": 2, "totalItems": 10, "entries": [
      { "slug": "invoice",    "label": "Invoice",    "itemsCount": 7, "parentSlug": "finance", "parentLabel": "Finance" },
      { "slug": "lab-result", "label": "Lab result", "itemsCount": 3, "parentSlug": "medical", "parentLabel": "Medical" }
    ]},
    { "facet": "tag", "totalTerms": 1, "totalItems": 9, "entries": [
      { "slug": "2026", "label": "2026", "itemsCount": 9, "parentSlug": null, "parentLabel": null }
    ]}
  ]
}
```

#### a user with no terms

Nothing has been categorized yet, so the handler stops early and emits an empty catalog.

Reads `object` → emits `TaxonomyAggregate` · 1 in → 1 out

Input:

```
{ "userId": "ckwx_new_user", "email": "new@example.com" }
```

Output:

```
{ "facets": [] }
```

#### the user's browse tree

The same counts, nested instead of flat. Empty branches are pruned unless they lead to a term that survives.

Reads `object` → emits `TaxonomyTree` · 1 in → 1 out

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
