<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Files

Bytes attached to records. Upload is a two-step handshake — ask for an upload URL, put the bytes there, confirm — and download is a signed URL, never the bytes through the API.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/files`](#get-v1-files) |  |
| `DELETE` | [`/v1/files/{id}`](#delete-v1-files-id) |  |
| `POST` | [`/v1/files/{id}/attach`](#post-v1-files-id-attach) |  |
| `POST` | [`/v1/files/{id}/confirm`](#post-v1-files-id-confirm) |  |
| `POST` | [`/v1/files/{id}/detach`](#post-v1-files-id-detach) |  |
| `GET` | [`/v1/files/{id}/download-url`](#get-v1-files-id-download-url) |  |
| `GET` | [`/v1/files/raw/{token}`](#get-v1-files-raw-token) |  |
| `POST` | [`/v1/files/upload-url`](#post-v1-files-upload-url) |  |

### `GET /v1/files`

A project's file library — every file it holds, uploaded or produced by a flow, with who sent it, the record it hangs off and totals, cursor-paged; narrowed by scope, kind, owner, record and time. VIEWER on `project`. On the api host only. To sign one, `GET /v1/files/{id}/download-url`; to read one record's files, `GET /v1/records/{id}`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project whose files to list — its node id. |
| `scope` | `"sent-in" \| "produced" \| "all"` | no | Which files to list. `sent-in` is what arrived from outside (uploads, channel media, imports); `produced` is what a flow made. Defaults to `sent-in`, because handler output outnumbers it in a busy project and buries the handful of things a person actually sent. |
| `owner` | `string` | no | Narrow to the files ONE person HOLDS, by their user id — the ones stored under their own owner prefix, which is the population account deletion erases. ⚠️ THREE different people can be called a file's owner: whoever holds it, whoever uploaded the bytes (`uploadedByUserId`, written only by the presign route and null on every handler-produced file), and whoever owns the record it landed on. `source` on the row below reports the latter two because they come apart routinely; this filter is the first, and it is the one the Members roster counts. |
| `kind` | `"image" \| "pdf" \| "audio" \| "video" \| "text" \| "other"` | no | Narrow to one content class. Omit for all of them. Like `q`, this is a scan within the project — `fileMimeType` carries no index — so it costs what the scope filter beside it already costs, and no more. |
| `attached` | `"record" \| "project"` | no | Narrow to files a record carries (`record`) or to files nothing has claimed (`project`). Omit for both. Refused (400) as `project` beside `recordType` or `record`, which name a record by definition. |
| `recordType` | `string` | no | Narrow to files on records of ONE type, by the type's key — the same string a record's `recordType` carries. Implies `attached=record`. A type the project does not declare matches nothing rather than being refused: records can outlive their declaration. |
| `record` | `string` | no | Narrow to the files ONE record carries, by its id. Implies `attached=record`; `recordType` beside it is redundant and ignored, since a record has one type. |
| `q` | `string` | no | Match against the file NAME only, case-insensitively. Deliberately narrow: the name column is not indexed, so this is a scan over one project's files and must not be widened into a content search. |
| `since` | `string` | no | Only files received at or after this instant. |
| `until` | `string` | no | Only files received STRICTLY BEFORE this instant. Refused (400) at or before `since`: that window is empty by construction. |
| `sort` | `"created-at" \| "file-name" \| "file-size"` | no | What the page is ordered by: `created-at` (when the file arrived — the default), `file-name`, or `file-size`. Ties break on the row id. ⚠️ `file-size` orders an awaiting-upload row by the size its uploader DECLARED, which the row reports as null until the bytes are confirmed. |
| `order` | `"asc" \| "desc"` | no | Which way `sort` runs. Defaults to `desc` — newest first under the default sort. |
| `after` | `string` | no | The page AFTER this row in the ordering — pass back the `nextCursor` you were given. Omit for the first page. A cursor carries the `sort` and `order` it was minted under and is refused (400) beside different ones. |
| `before` | `string` | no | The page BEFORE this row in the ordering — pass back the `prevCursor` you were given. Refused together with `after`: they name opposite directions from one row, so a request carrying both has not said which it wants. |
| `page` | `integer` | no | Jump to this page, 1-based. Resolved as an OFFSET and therefore approximate while files are arriving — walking with `after`/`before` is exact and is what the response's cursors are for. Past the last page it CLAMPS to the last one rather than answering empty: an out-of-range page is a URL somebody typed, and an empty list reads as an empty library. Refused together with `after` or `before`. |
| `limit` | `integer` | no | How many files per page, up to 100. Defaults to 50. |
| `totals` | `"full" \| "none"` | no | `none` omits `totals` and answers `fileCount` alone. The totals need an aggregate over columns no index covers, so its cost tracks the project's file count; `fileCount` is an index-only scan. Ask for `none` when you want the number and not the breakdown. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `files` | `object[]` | yes | This page of files, in `sort` / `order` — whichever direction it was reached from. |
| `sort` | `"created-at" \| "file-name" \| "file-size"` | yes | The ordering this page was read in: the `sort` sent, or `created-at`. |
| `order` | `"asc" \| "desc"` | yes | Which way `sort` ran: the `order` sent, or `desc`. |
| `fileCount` | `integer` | yes | Every file the project holds, ignoring every narrowing — `scope`, `q`, the `since`/`until` window — which is what a menu row means by a number. An index-only count, so it is cheap enough to ask for on a navigation. |
| `totals` | `object \| null` | yes | Figures over THIS QUERY — the same predicate the list uses, including the search. NULL when `totals=none` was asked for, which is a statement about the request rather than about the project. |
| `paging` | `object` | yes | Where this page sits in the whole result — the questions a cursor cannot answer. Always present on this route: it is an index-only count, unlike `totals`. Its `total` counts THIS query, search and scope included, which `fileCount` deliberately does not. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |

Each item of `files`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file's id — what the download and detach routes take. |
| `fileName` | `string` | yes | The name the file arrived under. Not unique, and not its address: two files in a project may share one. |
| `fileSize` | `integer \| null` | yes | Bytes, measured — NULL while `state` is `awaiting-upload`, which is not the same as zero. The size a client declares when it asks for an upload URL is a hint; only the confirm reconciles it against the object that actually landed. |
| `fileMimeType` | `string` | yes | What the file says it is. Reconciled against the stored object on confirm, so it is the type a download will actually serve. |
| `kind` | `"image" \| "pdf" \| "audio" \| "video" \| "text" \| "other"` | yes | The coarse class of `fileMimeType`, and the value the `kind` query parameter matches. Rendered where the raw mime would be unreadable. |
| `previewable` | `boolean` | yes | Whether the platform will serve these bytes `inline`, so a client may render them in place. A prediction from the stored type, not a guarantee — see the note on `fileMimeType`. Always false while `state` is `awaiting-upload`: there are no bytes to serve, which is a second reason for false that the type alone does not explain. |
| `state` | `"stored" \| "awaiting-upload"` | yes | `stored` means the bytes exist. `awaiting-upload` means a URL was signed and nothing ever arrived — there is nothing to download, and the platform clears these within a day. |
| `source` | `object` | yes | Where the file came from. Three shapes, because only one of the three is a person: a flow's output names its skill, and channel media names nobody. |
| `record` | `object \| null` | yes | The record carrying this file, or null when nothing has claimed it. Null is ordinary: media can arrive ahead of the record that will claim it. There is no title here — a record's readable name lives in its own `data`, whose shape is the project's, not the platform's. |
| `createdAt` | `string` | yes | When the file was first recorded. The list is ordered by it. |

### `DELETE /v1/files/{id}`

Delete a file: the row, and its bytes when no other file row still names them. Your own file: while it is attached to no project, or from its project's host. A file a project holds: ADMIN on the project, from the api host. Refuses (409) a file a flow produced for a record; one a run with no record produced, kept because a link was made to it, can be deleted. To keep the bytes and only release the file from its record, `POST /v1/files/{id}/detach`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file that was deleted. |
| `deleted` | `true` | yes | Always true: the file is gone. |

### `POST /v1/files/{id}/attach`

Hang a file from the project's library on one of its records (EDITOR, api host). The record's flow is not run again. Refuses (409) a file a flow produced, an upload not confirmed yet, a file another record already carries, a person's own upload on a record that is not theirs, and a record that already holds the same content. To put a file into the library first, `POST /v1/files/upload-url` with `project`; to release it again, `POST /v1/files/{id}/detach`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `record` | `string` | yes | The record to hang the file on, by its id. It must be a record of the project that holds the file. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file that was attached. |
| `record` | `object` | yes | The record that carries the file now — echoed so a client can update its row in place. Nothing ran: to process the record with the file, run its flow again. |

### `POST /v1/files/{id}/confirm`

Confirm that an upload's bytes have landed: the platform reads the object, records its real size and type, and marks the file uploaded. Idempotent. Your own file: while it is attached to no project, or from its project's host. A file a project holds: EDITOR on the project, from the api host.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fileId` | `string` | yes | The file that was confirmed. |
| `status` | `"pending-upload" \| "uploaded"` | yes | Whether the bytes have actually arrived. A row is `pending-upload` from the moment the upload URL is issued, so its existence is not evidence that anything was uploaded. |
| `uploadConfirmedAt` | `string \| null` | yes | When the upload was confirmed. Confirming twice is safe — the second call returns the first one's answer rather than failing. |

### `POST /v1/files/{id}/detach`

Release a file from the record it hangs off, keeping it in the project's library — the reversible half of removing one (EDITOR, api host). Refuses (409) a file a flow produced: the record that generated it owns it. To remove the file and its bytes, `DELETE /v1/files/{id}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file that was released. |
| `record` | `null` | yes | Always null after a detach — echoed so a client can update its row in place. The BYTES are untouched and the file stays in the library. To remove it entirely, DELETE the file itself. |

### `GET /v1/files/{id}/download-url`

A signed URL for one file's bytes. Your own file: a URL that does not expire, for embedding. A file of a project you hold VIEWER on (api host): a URL valid for 15 minutes. Refuses (409) a file whose upload is not confirmed yet.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The file's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `downloadUrl` | `string` | yes | A signed URL for the file. ⚠️ It carries its own authority and does NOT expire on a timer — anyone holding it can read the file until the file is deleted or the signing key is rotated. Treat it as a credential. |

### `GET /v1/files/raw/{token}`

Resolve a signed file URL: a 302 to a short-lived storage URL for the bytes. The token IS the credential — no sign-in, no key — which is what lets a page embed it in `<img src>`. Minted by `GET /v1/files/{id}/download-url` and by flows; 410 once it has expired, 403 when its signature does not verify.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `token` | `string` | yes | The signed token from a download URL. It carries its own authority, so treat it as a credential rather than an id. |

### `POST /v1/files/upload-url`

Ask for somewhere to put a file: answers the file's id and a presigned URL to PUT the bytes to, then `POST /v1/files/{id}/confirm`. Without `project` the file is yours. With `project` (EDITOR, api host only) the project owns it, so it outlives your account and any run of the project can read it — at most 25 MB.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fileName` | `string` | yes | The file's name, kept for display. |
| `contentType` | `string` | yes | The file's MIME type. It is recorded and served back on download, so getting it wrong makes the file arrive as the wrong kind. |
| `size` | `integer` | yes | The file's size in bytes, so quota can be checked up front. With `project`, at most 25000000 — a claim the confirm step measures again. |
| `project` | `string` | no | Put the file into this PROJECT (its node id) rather than into your own files: the stored object belongs to the project, so it outlives your account and any run of the project can read it. Needs EDITOR on the project, and is refused on a project's own host — a project's end users upload their own files. Omitted, the file is yours. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fileId` | `string` | yes | The file's id. It exists ALREADY, before you upload anything — it is just not usable until you confirm. |
| `uploadUrl` | `string` | yes | PUT the bytes here directly. Do not send them through this API — this URL points at storage. |
| `key` | `string` | yes | Where the object lives in storage. |
| `expiresAt` | `string` | yes | When this upload URL stops working. Ask for a new one rather than retrying an expired URL. |
