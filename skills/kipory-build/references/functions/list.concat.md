<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `list.concat` — Join into one list

Join several values or lists into one list.

Joins any number of slot values into one flat list. A single value becomes one item, and a list adds each of its items. Use it to collect what several independent actions produced when there is no fan-out to merge.

- **Group:** utility · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `list+` → `a list of the first input's element type`
- **Reads:** Reads any number of root slots — useful for collecting parallel-source contributions (tag-source merges, classification-resolution collection) without requiring a fan-out/merge pair. _(shape hint: `list+`)_
- **Emits:** One flat list aggregated from N sibling slots, with scalar inputs lifted to length-1 list elements and list inputs flattened in declared order.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | string[], at least 1 item | yes | — | The slots to join, in order. Each is a slot name or a path into an object slot. Lists are flattened in. |
| `strategy` | `concat` \| `dedup-concat` | no | `"concat"` | `concat` keeps everything in the order given. `dedup-concat` drops repeats, keeping the first time each value appeared. |

## Worked example

Flatten N sibling list slots into one list, optionally deduping. Scalar contributions become length-1 list elements.

#### Keep repeats

Reads `mixed` → emits `string[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "inputs": [
    "tagsFromSourceMeta",
    "tagsFromFileMeta",
    "tagsFromLlm"
  ],
  "strategy": "concat"
}
```

Input:

```
{
  "tagsFromSourceMeta": ["video", "youtube"],
  "tagsFromFileMeta": ["mp4", "video"],
  "tagsFromLlm": ["tutorial", "screencast"]
}
```

Output:

```
["video", "youtube", "mp4", "video", "tutorial", "screencast"]
```

#### Drop repeats

Reads `mixed` → emits `string[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "inputs": [
    "tagsFromSourceMeta",
    "tagsFromFileMeta",
    "tagsFromLlm"
  ],
  "strategy": "dedup-concat"
}
```

Input:

```
{
  "tagsFromSourceMeta": ["video", "youtube"],
  "tagsFromFileMeta": ["mp4", "video"],
  "tagsFromLlm": ["tutorial", "screencast"]
}
```

Output:

```
["video", "youtube", "mp4", "tutorial", "screencast"]
```

#### Single values

Reads `mixed` → emits `object[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "inputs": [
    "categoryResolution",
    "typeResolution",
    "tagResolutions"
  ]
}
```

Input:

```
{
  "categoryResolution": { "outcome": "match", "vocabularyKey": "category", "termId": "t_cat_video" },
  "typeResolution":     { "outcome": "match", "vocabularyKey": "type",     "termId": "t_type_tutorial" },
  "tagResolutions": [
    { "outcome": "match", "vocabularyKey": "tag", "termId": "t_tag_react" },
    { "outcome": "match", "vocabularyKey": "tag", "termId": "t_tag_hooks" }
  ]
}
```

Output:

```
[
  { "outcome": "match", "vocabularyKey": "category", "termId": "t_cat_video" },
  { "outcome": "match", "vocabularyKey": "type",     "termId": "t_type_tutorial" },
  { "outcome": "match", "vocabularyKey": "tag",      "termId": "t_tag_react" },
  { "outcome": "match", "vocabularyKey": "tag",      "termId": "t_tag_hooks" }
]
```
