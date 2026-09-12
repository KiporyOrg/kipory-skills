<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `flow.invoke` — Invoke a sub-flow

Run another saved flow and map selected inputs and outputs.

- **Group:** Flow · **Phase:** `control` · **Effect class:** `read`
- **I/O:** `slot map` → `nothing`
- **Reads:** Reads 0 direct streams — the parent → sub-flow input mapping is configured via the inputSlotMap editor. _(shape hint: `slot map`)_
- **Emits:** Output is determined by the sub-flow's output-slot map — the invoke skill itself writes no primary slot.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | any[] | no | `[]` | Which parent slots to pass into the sub-flow, and where each one lands. Only these cross the boundary. |
| `outputs` | object[] | no | `[]` | Which sub-flow outputs to copy back, and into which parent slots. Leave it empty for side effects only. |
| `targetFlowId` | string | yes | — | The ID of the flow this invoke should execute. Must be a saved Flow in the library other than the one currently being edited. |

## Worked example

Runs another saved flow inline. Only the mapped slots cross in, and only the mapped outputs come back.

Reads: rename + bootstrap. Emits: rename + project.

#### bidirectional

Reads `Article scrape & summarize` → emits `mapped slots` · 2→2 slots mapped

Input:

- {"index":0,"value":"currentUrl → entryUrl","detail":"into the sub-flow"}
- {"index":1,"value":"dateRange → window","detail":"into the sub-flow"}

Back to the parent:

- {"index":0,"value":"summary → articleSummary"}
- {"index":1,"value":"qualityScore → articleScore"}

#### side-effects only

Reads `Embed & store in vector DB` → emits `nothing` · 2→0 slots mapped

Input:

- {"index":0,"value":"currentChunk → text","detail":"into the sub-flow"}
- {"index":1,"value":"collectionId → namespace","detail":"into the sub-flow"}

Back to the parent:

- {"index":0,"value":"nothing comes back — side effects only"}

#### fetcher only

Reads `List active users this week` → emits `mapped slots` · 0→2 slots mapped

Input:

- {"index":0,"value":"nothing goes in — the sub-flow starts from its own state"}

Back to the parent:

- {"index":0,"value":"users → activeUsers"}
- {"index":1,"value":"count → activeUserCount"}
