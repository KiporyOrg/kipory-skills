<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `file.download-url` — Create a download link

Create a signed URL a client can use to download a file.

- **Group:** Files · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `file` → `string`
- **Reads:** One file. Any kind — nothing is opened, inspected or transformed; only a link to it is signed. _(shape hint: `file`)_
- **Emits:** A signed link, non-expiring by default. Bind its lifetime with the fields below. An empty string when there is no file.
- **Suggested input streams:** `currentFile`
- **External dependency:** S3 / MinIO — Nothing is called — the link is signed locally and grants read access to the object's bytes for as long as it lives. S3-compatible rather than S3: the deployment runs MinIO on its own box.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `neverExpires` | boolean | no | `true` | When on (default), the URL never expires — possession alone grants read access indefinitely. Turn off to bound the lifetime via ttlSeconds. |
| `ttlSeconds` | integer | no | `300` | Lifetime of the signed capability URL in seconds when neverExpires is off. Default 5 min; capped at 7 days. Ignored while neverExpires is on. |

## Worked example

A link is signed locally — nothing is fetched. The variants show different file types; the step never looks at the bytes.

Reads: FileRef. Emits: presign (HMAC).

#### PDF

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

#### Image

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
