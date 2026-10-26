<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.view` — Read a view

Read one page of a view: a read declared once and named by its key.

Takes the view's params from the run's slots, and paging from slots named after the action, like `readAfter`.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the view's params` → `object`
- **Also found as:** named read, saved query, list records, my feed, page of records
- **Reads:** The run's slots named like the view's params, plus the action's own `<action>After` or `<action>Before` and `<action>Limit`. _(shape hint: `the view's params`)_
- **Emits:** An object: the page's `records`, with `nextCursor` and `prevCursor` when there is a page after or before it; a view of one record answers `record`.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `view` | string | yes | — | The view to read, by key. ⚠️ A view over a person's table reads the signed-in person's rows; a run with no person fails. |

## Worked example

Reads the books of the authors the signed-in member follows, newest first.

#### The first page

Reads `string` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "view": "myShelf"
}
```

Input:

```
"poetry"
```

Output:

```
{
  "records": [
    { "id": "ckbk01", "title": "Salt Lines", "genre": "poetry", "createdAt": "2026-06-15T10:01:55.000Z", "updatedAt": "2026-06-15T10:01:55.000Z", "status": "READY" }
  ],
  "nextCursor": "eyJ2IjoibXlTaGVsZiIsImYiOi…"
}
```
