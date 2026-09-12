<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `value.first-non-empty` — Pick the first non-empty value

Choose the first populated value from a priority list.

- **Group:** Utility · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `any+` → `nothing`
- **Reads:** Reads any number of root slots — useful for mixed display fallbacks such as URL string first, FileRef second. _(shape hint: `any+`)_
- **Emits:** The first populated value from a priority-ordered list of slot paths, preserving the selected value's runtime shape.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | string[] | yes | — | The slots to try, in the order you want them tried. Each is a slot name or a path into an object slot. |
| `mimePrefixes` | string[] | no | `[]` | Only used when valueKind is `file`. Optional MIME prefixes to accept, for example `image/`. Empty means every non-empty FileRef is eligible. |
| `valueKind` | `any` \| `string` \| `file` | no | `"any"` | `any` preserves the first populated runtime value. `string` only accepts non-empty strings. `file` only accepts non-empty FileRefs or FileRef list members. |

## Worked example

Walk ordered candidates and return the first populated value while preserving its shape.

Reads: walk values · in order. Emits: first populated.

#### URL wins

Reads `mixed` → emits `string` · 1 in → 1 out

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

#### file fallback

Reads `mixed` → emits `file` · 1 in → 1 out

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
