<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 5accba538b04 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Files

Bytes attached to records. Upload is a two-step handshake — ask for an upload URL, put the bytes there, confirm — and download is a signed URL, never the bytes through the API.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/files/raw/{token}`](#get-v1-files-raw-token) |  |
| `GET` | [`/v1/projects/{nodeId}/files`](#get-v1-projects-nodeid-files) |  |
| `DELETE` | [`/v1/projects/{nodeId}/files/{fileId}`](#delete-v1-projects-nodeid-files-fileid) |  |
| `POST` | [`/v1/projects/{nodeId}/files/{fileId}/confirm`](#post-v1-projects-nodeid-files-fileid-confirm) |  |
| `POST` | [`/v1/projects/{nodeId}/files/{fileId}/detach`](#post-v1-projects-nodeid-files-fileid-detach) |  |
| `GET` | [`/v1/projects/{nodeId}/files/{fileId}/download-url`](#get-v1-projects-nodeid-files-fileid-download-url) |  |
| `POST` | [`/v1/projects/{nodeId}/files/upload-url`](#post-v1-projects-nodeid-files-upload-url) |  |

### `GET /v1/files/raw/{token}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `token` | `string` | yes | The signed token from a download URL. It carries its own authority, so treat it as a credential rather than an id. |

### `GET /v1/projects/{nodeId}/files`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `scope` | `"sent-in" \| "produced" \| "all"` | no | Which files to list. `sent-in` is what arrived from outside (uploads, channel media, imports); `produced` is what a flow made. Defaults to `sent-in`, because handler output outnumbers it in a busy project and buries the handful of things a person actually sent. |
| `owner` | `string` | no | Narrow to the files ONE person HOLDS, by their user id — the ones stored under their own owner prefix, which is the population account deletion erases. ⚠️ THREE different people can be called a file's owner: whoever holds it, whoever uploaded the bytes (`uploadedByUserId`, written only by the presign route and null on every handler-produced file), and whoever owns the record it landed on. `source` on the row below reports the latter two because they come apart routinely; this filter is the first, and it is the one the Members roster counts. |
| `kind` | `"image" \| "pdf" \| "audio" \| "video" \| "text" \| "other"` | no | Narrow to one content class. Omit for all of them. Like `q`, this is a scan within the project — `fileMimeType` carries no index — so it costs what the scope filter beside it already costs, and no more. |
| `q` | `string` | no | Match against the file NAME only, case-insensitively. Deliberately narrow: the name column is not indexed, so this is a scan over one project's files and must not be widened into a content search. |
| `after` | `string` | no | The page OLDER than this row — pass back the `nextCursor` you were given. Omit for the newest page. |
| `before` | `string` | no | The page NEWER than this row — pass back the `prevCursor` you were given. Refused together with `after`: they name opposite directions from one row, so a request carrying both has not said which it wants. |
| `page` | `integer` | no | Jump to this page, 1-based. Resolved as an OFFSET and therefore approximate while files are arriving — walking with `after`/`before` is exact and is what the response's cursors are for. Past the last page it CLAMPS to the last one rather than answering empty: an out-of-range page is a URL somebody typed, and an empty list reads as an empty library. Refused together with `after` or `before`. |
| `limit` | `integer` | no | How many files per page, up to 100. Defaults to 50. |
| `totals` | `"full" \| "none"` | no | `none` omits `totals` and answers `fileCount` alone. The totals need an aggregate over columns no index covers, so its cost tracks the project's file count; `fileCount` is an index-only scan. Ask for `none` when you want the number and not the breakdown. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `files` | `object[]` | yes | This page of files, newest first. |
| `fileCount` | `integer` | yes | Every file the project holds, ignoring `scope` and `q` alike — what a menu row means by a number. An index-only count, so it is cheap enough to ask for on a navigation. |
| `totals` | `object \| null` | yes | Figures over THIS QUERY — the same predicate the list uses, including the search. NULL when `totals=none` was asked for, which is a statement about the request rather than about the project. |
| `paging` | `object` | yes | Where this page sits in the whole result — the questions a cursor cannot answer. Always present on this route: it is an index-only count, unlike `totals`. Its `total` counts THIS query, search and scope included, which `fileCount` deliberately does not. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the page OLDER than this one. NULL means there is nothing older — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page NEWER than this one. NULL means this is the newest page, which is the only honest way for a client to know it is at the top: it cannot infer that from a full page. |

### `DELETE /v1/projects/{nodeId}/files/{fileId}`

Delete one of the project's files: the row, and its bytes when no other file row still names them. Refuses (409) a file a flow produced.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |
| `fileId` | `string` | yes | The `RecordFile` row id. |

**Response `204`**

_No fields._

### `POST /v1/projects/{nodeId}/files/{fileId}/confirm`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |
| `fileId` | `string` | yes | The `RecordFile` row id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fileId` | `string` | yes | The file that was confirmed. |
| `status` | `"PENDING_UPLOAD" \| "UPLOADED"` | yes | Whether the bytes have actually arrived. A row is `PENDING_UPLOAD` from the moment the upload URL is issued, so its existence is not evidence that anything was uploaded. |
| `uploadConfirmedAt` | `string \| null` | yes | When the upload was confirmed. Confirming twice is safe — the second call returns the first one's answer rather than failing. |

### `POST /v1/projects/{nodeId}/files/{fileId}/detach`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |
| `fileId` | `string` | yes | The `RecordFile` row id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file that was released. |
| `record` | `"null"` | yes | Always null after a detach — echoed so a client can update its row in place. The BYTES are untouched and the file stays in the library. To remove it entirely, DELETE the file itself. |

### `GET /v1/projects/{nodeId}/files/{fileId}/download-url`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |
| `fileId` | `string` | yes | The `RecordFile` row id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `downloadUrl` | `string` | yes | A signed URL for the file. ⚠️ It carries its own authority and does NOT expire on a timer — anyone holding it can read the file until the file is deleted or the signing key is rotated. Treat it as a credential. |

### `POST /v1/projects/{nodeId}/files/upload-url`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fileName` | `string` | yes | The file's name, kept for display. |
| `contentType` | `string` | yes | The file's MIME type. It is recorded and served back on download, so getting it wrong makes the file arrive as the wrong kind. |
| `size` | `integer` | yes | The file's size in bytes, as the client believes it. A CLAIM, not a measurement — the confirm step replaces it with what the store reports, and refuses the object if that is over the maximum. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fileId` | `string` | yes | The file's id. It exists ALREADY, before you upload anything — it is just not usable until you confirm. |
| `uploadUrl` | `string` | yes | PUT the bytes here directly. Do not send them through this API — this URL points at storage. |
| `key` | `string` | yes | Where the object lives in storage. |
| `expiresAt` | `string` | yes | When this upload URL stops working. Ask for a new one rather than retrying an expired URL. |
