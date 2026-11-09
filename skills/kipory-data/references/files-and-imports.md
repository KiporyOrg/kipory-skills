# Getting a file in, and importing in bulk

Read this before uploading a file, attaching one to a record, handing an upload to a flow, or importing many records: the upload handshake, attach, the rest of the file surface, and which import to choose.

**Get a file in.** Three calls, and the bytes never pass through the API:

```
POST /v1/files/upload-url      { project, fileName, contentType, size } → { fileId, uploadUrl, key, expiresAt }
PUT  <uploadUrl>                the bytes, within 15 minutes, with `Content-Type: <contentType>`
POST /v1/files/{id}/confirm → { fileId, status: "uploaded", uploadConfirmedAt }
```

The signed URL does not pin `Content-Type`, so another value or none does not fail the PUT. Send the `contentType` you declared anyway: on `confirm` the file's type is taken from what storage recorded, and functions gate on it — `pdf.parse` refuses anything but `application/pdf`.

Then **attach it**. A file uploaded with `project` is a **project** file, so a key's upload attaches to a record of a project-scoped table. Two ways:

```
POST /v1/files/{id}/attach   { record }    by hand: hang a confirmed project file on an existing record (EDITOR) → { id, record }
record.create  fileIds                     in a flow: attach the ids in the same transaction as the record write
```

- **The attach route runs nothing.** Follow it with `POST /v1/records/{id}/reprocess` when the table's processing flow should read the file. It answers 409 for a file a flow produced, an upload not confirmed yet, a file another record already carries, a person's own upload on a record that is not theirs, and a record that already holds the same content.
- **`POST /v1/records` takes no file field.** Create the record, then attach.
- **The rest of the file surface:** `GET /v1/files?project=<node>` lists the project's files. `POST /v1/files/{id}/detach` releases a file from its record and keeps its bytes. `DELETE /v1/files/{id}` (ADMIN on the file's project) removes the file, and its bytes once no other file row still names them → `{ id, deleted: true }`. Detach and delete both refuse (409) a file a flow produced for a record; a file an endpoint, schedule or trigger run produced and kept because a link was made to it hangs on no record, and delete removes it. `GET /v1/files/{id}/download-url` answers a signed `downloadUrl` for the bytes — valid for 15 minutes on a project's file — and refuses (409) an upload not confirmed yet.

**Two ways to hand an upload to a flow, and they take different values.** `fileIds` takes a **list** of `fileId`s from `upload-url`; a single id string attaches nothing and nothing says so, so give one id as a one-item list: `fileIds: { expr: "[fileId]" }`. A flow input declared with the builtin `file` type takes a file reference `{ "key": "<upload-url's key>", "name": "products.csv", "mime": "text/csv" }` — all three required; a bare `fileId` string is a `422 Expected object`.

**A bulk import from your key, processed on ingest.** Choose by what the file becomes:

- _One file, one record_ (a document to search): three calls and no flow of your own — `POST /v1/records` creates the record, `POST /v1/files/{id}/attach` hangs the upload on it, `POST /v1/records/{id}/reprocess` runs the table's processing flow, which reads the attached file from its `files` input and produces the searchable fields. The create queues a first run of its own, so wait for the record to settle (`ready` or `failed`) before the reprocess — while a run is queued or under way it answers `409 RECORD_NOT_RERUNNABLE`. That first run sees no file, so expect it to fail or produce an empty body; the reprocess is the run that counts. For your product's users, the same thing is an endpoint flow (`kipory-expose`): it takes the `fileId`, wraps it in a one-item list, runs `record.create` with that list in `fileIds`, then `record.enqueue-process`.
- _One file, many records_ (a CSV): upload, then call an endpoint whose flow takes a `file` input, reads it (`file.read-text`), parses rows in a `value.transform` (`references/csv-import.md` has a worked expression), and writes each row inside an `each`. A file with no valid rows gives the `each` `[]`, and the flow still answers. Re-importing converges on the same records when the rows are unchanged (below).
- _Rows you already hold as data_ (no file needed): one `POST /v1/records/bulk` of up to 500 creates, each `{ tableKey, data, onKeyTaken: "update" }` — a row whose natural key a record already holds updates that record instead of being refused, so re-running the import is safe.
