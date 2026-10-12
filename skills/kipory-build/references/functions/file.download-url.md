<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `file.download-url` — Create a download link

Make a link anyone can use to download a file.

Anything can read the link, such as a browser or a model. It never expires unless you set a lifetime.

- **Group:** files · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `file` → `string`
- **Also found as:** share file, file link, signed url, public link
- **Reads:** One file. Any kind — nothing is opened, inspected or transformed; only a link to it is signed. _(shape hint: `file`)_
- **Emits:** A signed link, non-expiring by default; it works for as long as the file exists. Bind its lifetime with the fields below. An empty string when there is no file.
- **Suggested input streams:** `currentFile`
- **External dependency:** S3 / MinIO — Nothing is called — the link is signed locally and grants read access to the object's bytes for as long as it lives. S3-compatible rather than S3: the deployment runs MinIO on its own box.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `neverExpires` | boolean | no | `true` | When on, the link never expires; turn off to set a lifetime. ⚠️ Files from endpoint, schedule or trigger runs may be removed after 7 days; give their links 7 days or less. |
| `ttlSeconds` | integer, more than 0, at most 604800 | no | `300` | Link lifetime in seconds when it expires; at most 7 days. |

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
