<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `file.download-url` — Create a download link

Make a link anyone can use to download a file.

Makes a signed link to a file that anything can read from: a browser, a model's tool call, an action with no storage access. It never expires unless you turn that off and set a lifetime. Nothing is fetched; the link is signed locally.

- **Group:** files · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `file` → `string`
- **Reads:** One file. Any kind — nothing is opened, inspected or transformed; only a link to it is signed. _(shape hint: `file`)_
- **Emits:** A signed link, non-expiring by default; it works for as long as the file exists. Bind its lifetime with the fields below. An empty string when there is no file.
- **Suggested input streams:** `currentFile`
- **External dependency:** S3 / MinIO — Nothing is called — the link is signed locally and grants read access to the object's bytes for as long as it lives. S3-compatible rather than S3: the deployment runs MinIO on its own box.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `neverExpires` | boolean | no | `true` | When on (default), the URL never expires — possession alone grants read access indefinitely. Turn off to bound the lifetime via ttlSeconds. ⚠️ A link works only while its file exists. A file produced in an endpoint, schedule or trigger run is removed at least 7 days after it was produced; give that link 7 days or less. |
| `ttlSeconds` | integer, more than 0, at most 604800 | no | `300` | Lifetime of the signed capability URL in seconds when neverExpires is off. Default 5 min; capped at 7 days. Ignored while neverExpires is on. |

## Worked example

A link is signed locally — nothing is fetched. The variants show different file types; the action never looks at the bytes.

#### A PDF

A signed link, non-expiring by default. Safe to hand to a browser tab or a model's tool call.

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
reports/2026-q1.pdf (application/pdf)
```

Output:

```
https://kipory-prod.s3.us-east-1.amazonaws.com/uploads/abc123/reports/2026-q1.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&X-Amz-Signature=…
```

#### An image

Any file type works — nothing is transformed or inspected. Useful for handing an image URL to a model.

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
photos/IMG_4821.heic (image/heic)
```

Output:

```
https://kipory-prod.s3.us-east-1.amazonaws.com/uploads/abc123/photos/IMG_4821.heic?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&X-Amz-Signature=…
```
