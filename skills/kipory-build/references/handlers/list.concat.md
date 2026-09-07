<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `list.concat` — Concatenate lists

Combine several values or lists into one flat list.

- **Group:** Utility · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `list+` → `nothing`
- **Reads:** Reads any number of root slots — useful for collecting parallel-source contributions (tag-source merges, classification-resolution collection) without requiring a fan-out/merge pair. _(shape hint: `list+`)_
- **Emits:** One flat list aggregated from N sibling slots, with scalar inputs lifted to length-1 list elements and list inputs flattened in declared order.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | string[] | yes | — | The slots to join, in order. Each is a slot name or a path into an object slot. Lists are flattened in. |
| `strategy` | `concat` \| `dedup-concat` | no | `"concat"` | `concat` keeps everything in the order given. `dedup-concat` drops repeats, keeping the first time each value appeared. |

## Worked example

Flatten N sibling list slots into one list, optionally deduping. Scalar contributions become length-1 list elements.

Reads: read sibling slots. Emits: flatten + dedup.

#### concat (preserve dups)

Reads `mixed` → emits `string[]` · 1 in → 1 out

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

#### dedup-concat

Reads `mixed` → emits `string[]` · 1 in → 1 out

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

#### scalar inputs lifted

Reads `mixed` → emits `object[]` · 1 in → 1 out

Input:

```
{
  "categoryResolution": { "outcome": "match", "facet": "category", "termId": "t_cat_video" },
  "typeResolution":     { "outcome": "match", "facet": "type",     "termId": "t_type_tutorial" },
  "tagResolutions": [
    { "outcome": "match", "facet": "tag", "termId": "t_tag_react" },
    { "outcome": "match", "facet": "tag", "termId": "t_tag_hooks" }
  ]
}
```

Output:

```
[
  { "outcome": "match", "facet": "category", "termId": "t_cat_video" },
  { "outcome": "match", "facet": "type",     "termId": "t_type_tutorial" },
  { "outcome": "match", "facet": "tag",      "termId": "t_tag_react" },
  { "outcome": "match", "facet": "tag",      "termId": "t_tag_hooks" }
]
```
