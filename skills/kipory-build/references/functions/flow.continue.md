<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.continue` — Continue with the next page

Start this flow again from where this run stopped.

The next run starts once this run saves, from the read's cursor. An empty cursor ends the job.

- **Group:** flow · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own next page, so a run started again stages it again; the page's own writes skip what is already there.
- **I/O:** `cursor and inputs` → `ContinueResult`
- **Also found as:** next page, continue, paginate, batch, large job, process in chunks
- **Reads:** The cursor, from `cursor`, and the next run's other inputs, from `inputs`. Past the job's page limit, in a sub-flow, or acting for a person, it fails. _(shape hint: `cursor and inputs`)_
- **Emits:** A `ContinueResult` — whether the next page starts, and which page it is. A preview starts nothing and says which page it would have.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `cursor` | union | yes | — | The read's `nextCursor`, as a slot path; empty ends the job. ⚠️ Read with `pages: {max: …, onMore: "stop"}` so a full page answers its `nextCursor` instead of failing. |
| `cursorInput` | string | yes | — | The flow input the next run reads the cursor from. ⚠️ An optional text input of this flow; the first page runs with it empty. |
| `inputs` | object | no | `{}` | The next run's other inputs: slot paths, values or expressions. ⚠️ Only in a run that acts for nobody, outside any fan-out, loop or sub-flow. |

### `cursor` — one of

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

A nightly job reads 1,000 open tasks a run, reminds each, and continues from the read's cursor until none remain.

#### More tasks remain

The read stopped with a cursor, so page 2 starts once this run is saved.

Reads `object` → emits `ContinueResult` · 1 in → 1 out

Step settings (`with`):

```json
{
  "cursor": "due.nextCursor",
  "cursorInput": "after",
  "inputs": {}
}
```

Input:

```
{
  "records": ["…"],
  "nextCursor": "c_8f1e"
}
```

Output:

```
{
  "continued": true,
  "page": 2
}
```
