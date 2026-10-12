<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `push.send` — Send a push notification

Notify people on their phones.

Sends a notification to every device the people registered: the run's own person, one named person, or a list. It leaves once the run saves, so a failed run notifies nobody. Each device delivery costs credits. Previews never send.

- **Group:** outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own push, so a new run of the same input notifies again.
- **I/O:** `people and text` → `PushSendResult`
- **Reads:** The people, from `recipient`, and the title, body and data, from their slots. A payload over the services' size limit fails the action. _(shape hint: `people and text`)_
- **Emits:** A `PushSendResult` — how many people and devices the push addressed. A preview sends nothing and says what it would have.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `badge` | integer, at least 0 | no | — | The number to show on the app's icon. |
| `bodySlot` | string | no | — | Slot PATH to the body text. Required for an alert. |
| `collapseKey` | string | no | — | Pushes with the same key replace each other on the device. At most 64 bytes. |
| `dataSlot` | string | no | — | Slot PATH to an object of strings the app receives with the push. |
| `expiresIn` | integer, 0 to 2419200 | no | `86400` | Seconds the service keeps trying a device that is offline. 0 tries once. |
| `kind` | `alert` \| `background` | no | `"alert"` | `alert` shows a title and body; `background` wakes the app silently with only data. |
| `recipient` | union | no | `{"kind":"self"}` | Whom to notify. The run's own person unless you name others. ⚠️ A device receives pushes only once the person's app registered it, and only through a push key the project stored for that app. |
| `sound` | `default` \| `none` | no | `"default"` | Whether an alert plays the device's sound. |
| `threadId` | string | no | — | Groups the alert with others of the same thread on the device. |
| `titleSlot` | string | no | — | Slot PATH to the title. Required for an alert. |
| `urgency` | `normal` \| `high` | no | `"normal"` | `high` delivers at once even when the device saves power; use it sparingly. |

### `recipient` — one of

**`kind: self`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `self` | yes | — | The person this run acts for. Not in a run that acts for nobody. |

**`kind: person`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `person` | yes | — | One person an earlier action names. |
| `userIdSlot` | string | yes | — | Slot PATH to the person's id. |

**`kind: people`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `people` | yes | — | A list of people an earlier action names. |
| `userIdsSlot` | string | yes | — | Slot PATH to a list of person ids. Ids not in the project are skipped. |

## Worked example

When a new item lands in a feed a person follows, their phone shows it.

#### The run's own person

One person, three devices — two phones and a tablet.

Reads `object` → emits `PushSendResult` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recipient": {
    "kind": "self"
  },
  "kind": "alert",
  "titleSlot": "item.feed",
  "bodySlot": "item.title",
  "sound": "default",
  "urgency": "normal",
  "expiresIn": 86400
}
```

Input:

```
{
  "title": "High water at 06:12",
  "feed": "Harbour daily"
}
```

Output:

```
{
  "people": 1,
  "skipped": 0,
  "devices": 3
}
```
