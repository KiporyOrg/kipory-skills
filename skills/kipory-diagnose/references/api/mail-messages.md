<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Messages a run sent

What happened to each message a run's `email.send` actions sent, from the instant the run commits. A run succeeds when it stages its mail; delivery happens afterwards and never changes how the run closed, so this is where a message that was refused, failed or bounced shows. `sent` means accepted by the relay, not proof it reached an inbox. Each record says who the message was for, why it failed and whose failure it was; no subject or body is kept.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/mail-messages`](#get-v1-mail-messages) |  |
| `GET` | [`/v1/mail-messages/{id}`](#get-v1-mail-messages-id) |  |

### `GET /v1/mail-messages`

List the messages one project's runs sent (`?project=<nodeId>`), newest first by when the run committed. Each row says who the message was for, where it stands and, when it failed or is being retried, why and whose failure it is; no subject or body is kept. A message is listed from the instant its run commits, as `queued`; a run that failed left none. `sent` means accepted by the relay, which is not proof it reached an inbox. Filter by `run` (the id from `GET /v1/runs/{runId}`, whose `messages` counts these rows), by `status`, and by when the run committed (`from` inclusive, `to` exclusive). Read one message at `GET /v1/mail-messages/{id}`. Walk with `after`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose messages to list. Required. |
| `run` | `string` | no | Only the messages this run sent: a run id. |
| `status` | `"queued" \| "retrying" \| "sent" \| "refused" \| "failed" \| "bounced"` | no | Only messages in this status. `sent` is accepted by the relay. |
| `from` | `string` | no | Only messages whose run committed at or after this. An instant, RFC 3339. |
| `to` | `string` | no | Only messages whose run committed BEFORE this: the bound is exclusive. An instant, RFC 3339. |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 200. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `messages` | `object[]` | yes | Messages, newest first by `createdAt`, then id. |
| `paging` | `null` | yes | Always null: no page count is given. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |

Each item of `messages`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The message's id: the one the `email.send` action answered. Read it at `GET /v1/mail-messages/{id}`. |
| `runId` | `string` | yes | The run that sent it. Read it at `GET /v1/runs/{runId}`. |
| `attempt` | `integer` | yes | Which attempt of that run committed the message, from 1. |
| `actionId` | `string` | yes | The action of the flow that sent it. |
| `address` | `string` | yes | The address it was sent from. |
| `recipient` | `string` | yes | Who it was for. The only part of the message the record keeps: no subject, body or reply-to is stored. |
| `status` | `"queued" \| "retrying" \| "sent" \| "refused" \| "failed" \| "bounced"` | yes | Where the message stands. `queued`: its run committed and it has not been tried yet. `retrying`: a try failed and another will follow. `sent`: accepted by the relay — the mail server took it, which is not proof it reached an inbox. `refused`: the platform will not send it. `failed`: every try failed, or it never reached the queue. `bounced`: the recipient's server returned it. `refused`, `failed` and `bounced` are final; `sent` changes only to `bounced`. |
| `reason` | `string \| null` | yes | Why it failed or is being retried, as a token: `transport-not-configured`, `credential-missing`, `sender-not-provisioned`, `transport-rejected`, `transport-error`, `relay-busy`, `not-enqueued`, `delivery-interrupted`, `address-not-available`, `domain-not-sendable`, `recipient-not-an-address`, `more-than-one-recipient`, `recipient-is-a-test-user` or `bounced`. Null while `queued` and once `sent`. |
| `fault` | `"platform" \| "sender" \| "recipient" \| null` | yes | Whose failure the reason is: `platform`, `sender` or `recipient`. Given whenever `reason` is, so a message still `retrying` already says whose failure it is so far. Null when `reason` is. |
| `message` | `string \| null` | yes | The reason in a sentence, written by the platform. Null when `reason` is. |
| `replyCode` | `string \| null` | yes | The mail relay's reply code when it answered with one, such as `421 4.7.0` or `550`. The code only, never the relay's words. |
| `attempts` | `integer` | yes | Delivery tries so far. 0 while `queued`. |
| `createdAt` | `string` | yes | When the run that sent it committed, RFC 3339. |
| `lastAttemptAt` | `string \| null` | yes | When it was last tried, RFC 3339. Null before the first try. |
| `sentAt` | `string \| null` | yes | When the relay accepted it, RFC 3339. Null unless it was accepted. |
| `bouncedAt` | `string \| null` | yes | When the recipient's server returned it, RFC 3339. Null unless `bounced`. |
| `bounce` | `object \| null` | yes | What the recipient's server said. Null unless `bounced`. |
| `delay` | `object \| null` | yes | A delay the recipient's server reported for a message the relay accepted: it is still trying. The status stays `sent`. Null when none was reported. |

### `GET /v1/mail-messages/{id}`

One message a run sent, by the id its `email.send` action answered: who it was for, where it stands and, when it failed or is being retried, why and whose failure it is. No subject or body is kept. `sent` means accepted by the relay, which is not proof it reached an inbox. The id of a message whose run failed was never committed and is a 404. List a project's or a run's messages at `GET /v1/mail-messages`. 404 for an id you cannot see.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The message to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `message` | `object` | yes | The message's record. |
