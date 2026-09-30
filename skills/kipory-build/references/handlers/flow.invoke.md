<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.invoke` — Run another flow

Run another flow, passing values in and taking results back.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `slot map` → `nothing`
- **Reads:** Reads the parent slots its `inputs` rows name. A step save fills `inputStreams` from them; a project document lists the same names itself. _(shape hint: `slot map`)_
- **Emits:** Output is determined by the sub-flow's output-slot map — the invoke skill itself writes no primary slot.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | any[] | no | `[]` | Which parent slots to pass into the sub-flow, and where each one lands. Only these cross the boundary. |
| `outputs` | object[] | no | `[]` | Which sub-flow outputs to copy back, and into which parent slots. Leave it empty for side effects only. ⚠️ Each row also carries `derivedShape`, the sub-flow output's type. A step save fills it in; a project document does not, so state it there or the step is refused as stale. |
| `targetFlowId` | string | yes | — | The saved flow this step runs, never its own flow. A project document names it `target`, by key. |

### `outputs` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `subFlowSlot` | string | yes | — |  |
| `parentSlot` | string | yes | — |  |
| `derivedShape` | union | no | — |  |

## Worked example

Runs another saved flow inline. Only the mapped slots cross in, and only the mapped outputs come back.

Reads: rename + bootstrap. Emits: rename + project.

#### In and out

Reads `Article scrape & summarize` → emits `mapped slots` · 2→2 slots mapped

Input:

- {"index":0,"value":"currentUrl → entryUrl","detail":"into the sub-flow"}
- {"index":1,"value":"dateRange → window","detail":"into the sub-flow"}

Back to the parent:

- {"index":0,"value":"summary → articleSummary"}
- {"index":1,"value":"qualityScore → articleScore"}

#### Pass in only

Reads `Embed & store in vector DB` → emits `nothing` · 2→0 slots mapped

Input:

- {"index":0,"value":"currentChunk → text","detail":"into the sub-flow"}
- {"index":1,"value":"collectionId → namespace","detail":"into the sub-flow"}

Back to the parent:

- {"index":0,"value":"nothing comes back — side effects only"}

#### Get back only

Reads `List active users this week` → emits `mapped slots` · 0→2 slots mapped

Input:

- {"index":0,"value":"nothing goes in — the sub-flow starts from its own state"}

Back to the parent:

- {"index":0,"value":"users → activeUsers"}
- {"index":1,"value":"count → activeUserCount"}
