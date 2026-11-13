<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.csv` — Make CSV text

Turn a list of rows into CSV text, one line per row.

Headings first, then each row; values with commas, quotes or line breaks are quoted.

- **Group:** text · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `list` → `CSV text`
- **Also found as:** csv export, spreadsheet, comma separated values, download rows, export table
- **Reads:** Reads one list of objects; each named field becomes a cell, and a missing one an empty cell. _(shape hint: `list`)_
- **Emits:** One text: a heading line, then one line per row, each line ending in a carriage return and a line feed.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `bom` | boolean | no | `false` | Start with a byte-order mark, for spreadsheets that need it. |
| `columns` | union[], at least 1 item | yes | — | The columns, in order; their headings make the first line. |
| `defuseFormulas` | boolean | no | `true` | Put `'` before text a spreadsheet would run as a formula. |
| `rows` | union | yes | — | The rows to export: a list of objects. |

### `columns` — each item is one of

- `string`

**An object with `field`, `header`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — | The row's field it reads; `a.b` reads inside an object. |
| `header` | string | yes | — | The column's heading in the first line. |

### `rows` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

Export a week's entries for a spreadsheet, the project's name quoted because it holds a comma.

#### Entries

Reads `object[]` → emits `string` · 1 in → 1 out

Step settings (`with`):

```json
{
  "rows": "entries",
  "columns": [
    "id",
    {
      "field": "project.name",
      "header": "projectName"
    },
    "minutes",
    "note"
  ],
  "defuseFormulas": true,
  "bom": false
}
```

Input:

```
[
  { "id": "e1", "project": { "name": "Web, mobile" }, "minutes": 90 },
  { "id": "e2", "project": { "name": "Ops" }, "minutes": 45, "note": "Fixed \"login\"" }
]
```

Output:

```
id,projectName,minutes,note
e1,"Web, mobile",90,
e2,Ops,45,"Fixed ""login"""
```
