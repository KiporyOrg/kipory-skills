<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `file.copy` — Copy a file

Save a copy of a file this project already holds.

Copies a stored file into a new one this run owns. Only files of the run's project, person or preview.

- **Group:** files · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A new run that keeps the record's files saves this copy again under the new attempt's key.
- **Not undone when a run fails:** `file` — The file's bytes are stored while the action runs. A later attempt of the run stores them again under its own key; a file no record keeps is removed by the platform later. Doing it twice is not harmless; a failed run lists it in `closing.unstagedEffects`.
- **I/O:** `file` → `file`
- **Also found as:** copy file, duplicate file, clone file, reuse file
- **Reads:** One stored file of this run's project, person or preview. A file anyone else owns is refused. _(shape hint: `file`)_
- **Emits:** A `FileRef` for the copy, saved to storage. An empty one when the input is empty.
- **Suggested input streams:** `currentFile`
- **Queue:** 2 attempts, exponential from 1 s; waits up to 1 min; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxBytes` | integer, more than 0 | no | `50000000` | The largest file to copy, in bytes; a bigger one fails early. ⚠️ Checked against the stored size before reading, so a huge file fails cheaply. |

## Worked example

The stored file's bytes are read from storage and saved again as a new file, so this record keeps its own copy.

#### A sibling's picture

A picture another record of the project holds, copied so this record has one too.

Reads `file` → emits `file` · 1 in → 1 out

Input:

```
avatar.jpg (image/jpeg)
```

Output:

```
{
  "key": "files/project/proj_ck.../2026/10/avatar-3f8c1a2b.jpg",
  "name": "avatar.jpg",
  "mime": "image/jpeg"
}
```

#### Another project's file

The file belongs to a different project, so the action fails and nothing is copied.

Reads `file` → emits `file` · 1 in → 1 out

Input:

```
report.pdf (application/pdf)
```

Output:

```
Error: FILE_OUT_OF_SCOPE — the file to copy belongs to another
  project or person, so this run cannot read it.
```
