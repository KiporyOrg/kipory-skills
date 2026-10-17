<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Platform status

Whether the platform's own vendor and model-provider accounts are answering calls. An action that fails with the `platform-fault` phase ran on one that is not; this read says which, and since when, without another failed run.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/platform-status`](#get-v1-platform-status) |  |

### `GET /v1/platform-status`

Whether each of the platform's own vendor and model-provider accounts is answering calls right now — `ok`, `refusing` or `unknown`, and since when — and, under `rules`, which diagnostic codes this build added, raised, reworded, lowered or removed against the build served before it, or the build `since` names (422 for a sha this deployment never served). An action that runs on the platform's key for a `refusing` account fails with the `platform-fault` phase (an endpoint answers 503 `PLATFORM_DEPENDENCY_UNAVAILABLE`) and is not charged; nothing in the project can fix it, and it clears when the platform's account is topped up. An action that spends a key stored on the project is not affected. The same answer for one task's model is `serving` on `GET /v1/nodes/{nodeId}/task-models`. Also names the project document format this server reads (`documentFormat`); a document in any other format is refused, so compare it with the format your own tools write. Any signed-in caller.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `since` | `string` | no | A build's full sha, as `GET /health` named it: compare the rules with that build instead of the one served just before this one — the build you last checked against. A sha this deployment never served is refused (422). |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `evaluatedAt` | `string \| null` | yes | When the platform last finished checking its accounts, ISO-8601; null if it never has. The checks run every few minutes. |
| `documentFormat` | `object` | yes | The project document format this server reads; a document in any other format is refused with `DOCUMENT_VERSION_UNSUPPORTED`. Compare it with the format your own tools write before exporting or applying a document. |
| `accounts` | `object[]` | yes | Every vendor and model provider the platform can call on its own key, in a fixed order. This is about the PLATFORM's accounts only: an action that spends a key stored on the project or an organisation above it is not affected by a `refusing` row here. |
| `rules` | `object` | yes | What this build changed in the diagnostic codes a save and a flow's health are judged by, read off the platform's own registry. A rule that fires in more places under an unchanged code and unchanged words is not listed: each project hears of that through `platform/flow-health.failing` on the flows it reaches. After a change of `sha` on `GET /health`, read `GET /v1/flows?project=…&expand=health` too. |

Each item of `accounts`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `state` | `"ok" \| "refusing" \| "unknown"` | yes | `refusing`: calls on the platform's key for this account are being refused — the account is out of credit, or its key was refused in the last 15 minutes. An action that needs it fails with the `platform-fault` phase and is not charged; nothing in the project can fix it. `ok`: nothing is known to be refusing — not a promise, an account nobody has called since it ran dry reads `ok` until its first refusal. `unknown`: the platform's own checks have not run recently, so neither can be said. |
| `since` | `string \| null` | yes | When this refusal began, ISO-8601. Null unless `state` is `refusing` — and null then too when it is known only from a refused call, which records no beginning. |
| `provider` | `string` | yes | The account's id — the `provider` a function's reference page, a price row and a stored `api_key` secret's purpose name. |
| `name` | `string` | yes | The account as a person reads it. |
