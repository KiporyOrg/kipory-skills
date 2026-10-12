<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `value.first-non-empty` — Take the first filled value

Take the first value that is filled in, from a list you rank.

The chosen value passes on unchanged, so candidates can be of different kinds.

- **Group:** utility · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `the first input's type`
- **Also found as:** first non empty, fallback, default value, coalesce
- **Reads:** Reads any number of root slots — useful for mixed display fallbacks such as URL string first, FileRef second. The action's inputs must list each root `inputs` names. _(shape hint: `any+`)_
- **Emits:** The first populated value from a priority-ordered list of slot paths, preserving the selected value's runtime shape.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | string[], at least 1 item | yes | — | The slots to try, in order. |
| `mimePrefixes` | string[] | no | `[]` | For files, accepted type prefixes such as `image/`; empty accepts all. |
| `valueKind` | `any` \| `string` \| `file` | no | `"any"` | Which values count: any, non-empty text only, or files only. |

## Worked example

Walk ordered candidates and return the first populated value while preserving its shape.

#### Link wins

Reads `mixed` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "inputs": [
    "pickedThumbnailUrl",
    "pickedThumbnailFile"
  ]
}
```

Input:

```
{
  "pickedThumbnailUrl": "https://cdn.example.com/cover.jpg",
  "pickedThumbnailFile": { "key": "files/user/u/photo.jpg", "name": "photo.jpg", "mime": "image/jpeg" }
}
```

Output:

```
https://cdn.example.com/cover.jpg
```

#### File fallback

Reads `mixed` → emits `file` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "inputs": [
    "pickedThumbnailUrl",
    "pickedThumbnailFile"
  ]
}
```

Input:

```
{
  "pickedThumbnailUrl": "",
  "pickedThumbnailFile": { "key": "files/user/u/photo.jpg", "name": "photo.jpg", "mime": "image/jpeg" }
}
```

Output:

```
{ "key": "files/user/u/photo.jpg", "name": "photo.jpg", "mime": "image/jpeg" }
```
