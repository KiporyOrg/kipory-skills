<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `file.stats` — Extract file details

Read a file's size, fingerprint, and last change date.

Reads three facts every file has, whatever its type: its size in bytes, a SHA-256 hash of its contents and when it was last changed. Run it once before a flow branches by file type, so every branch reads the same slot.

- **Group:** files · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `file` → `FileStats`
- **Reads:** One file, of any kind. The bytes are read to hash them, so a large file costs time even though nothing is stored. _(shape hint: `file`)_
- **Emits:** A `FileStats` — the byte size, a content hash, and a last-modified time when the store reports one. An empty object when there was no file.
- **Suggested input streams:** `currentFile`
- **External dependency:** S3 / MinIO — Heads and downloads the object to size and hash it. S3-compatible rather than S3: the deployment runs MinIO on its own box.
- **Queue:** 1 attempt, no backoff; waits up to 1 min; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

_No operator-tunable config._

## Worked example

The file is read once for its size and hash. It runs before any per-type branching, so every branch sees the same numbers.

#### A photo

All three facts present. The hash is computed from the bytes; the modified time comes from the store.

Reads `file` → emits `FileStats` · 1 in → 1 out

Input:

```
photos/IMG_4231.jpg (image/jpeg)
```

Output:

```
{
  "byteSize": 2843921,
  "sha256ContentHash": "8b1a9953c4611296a827abf8c47804d7a5d4d4f8c4f43eaf5b6c1a9e2d3f7b21",
  "lastModifiedAt": "2026-04-12T18:01:22.000Z"
}
```

#### No change date

Storage backend (or unhappy path) doesn't expose `LastModified`. Function logs at `info` and emits just `byteSize` + `sha256ContentHash`.

Reads `file` → emits `FileStats` · 1 in → 1 out

Input:

```
docs/manual.pdf (application/pdf)
```

Output:

```
{
  "byteSize": 184320,
  "sha256ContentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

#### No file

No file wired in, so nothing is read and the result is empty.

Reads `file` → emits `FileStats` · 1 in → 1 out

Input:

```
(empty) ()
```

Output:

```
{}
```
