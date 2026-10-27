# Format 8 → 9: every renamed setting

Every function setting that changed name or shape from document format 8 to format 9, and the ones
that kept their name. `scripts/upgrade-document.mjs` makes these changes for you; read this page when
you convert by hand, when the converter refuses a pair, or when a script or a prompt of yours names an
old setting. A format-9 document that still holds an old name is refused with `DOCUMENT_KEY_RENAMED`,
naming the new one.

In format 9 every setting below holds an argument: a slot path (`"book.title"`), a fixed value
(`{"literal": …}`; a bare number, `true` or `false` is fixed too) or an expression (`{"expr": "…"}`).
A bare string is always a path, so a fixed text, list, object or `null` is written `{"literal": …}`.

## Renamed: the `Slot` suffix goes

The value moves to the new name unchanged.

| Function                                     | Format 8                                                                                                          | Format 9                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `email.send`                                 | `toSlot`, `subjectSlot`, `textSlot`, `htmlSlot`                                                                   | `to`, `subject`, `text`, `html`                                                           |
| `event.emit`                                 | `payloadSlot`                                                                                                     | `payload`                                                                                 |
| `place.search`                               | `locationSlot`                                                                                                    | `location`                                                                                |
| `push.send`                                  | `titleSlot`, `bodySlot`, `dataSlot`                                                                               | `title`, `body`, `data`                                                                   |
| `push.send`                                  | `recipient.userIdSlot`, `recipient.userIdsSlot`                                                                   | `recipient.userId`, `recipient.userIds`                                                   |
| `record.append`                              | `recordIdSlot`, `eventSlot`, `eventIdSlot`, `userIdSlot`                                                          | `recordId`, `event`, `eventId`, `userId`                                                  |
| `record.create`                              | `dataSlot`, `fileIdsSlot`, `userIdSlot`                                                                           | `data`, `fileIds`, `userId`                                                               |
| `record.update`                              | `recordIdSlot`, `dataSlot`, `derivedSlot`, `fileIdsSlot`, `userIdSlot`                                            | `recordId`, `data`, `derived`, `fileIds`, `userId`                                        |
| `record.delete`, `record.read`               | `idsSlot`, `userIdSlot`                                                                                           | `ids`, `userId`                                                                           |
| `record.enqueue-process`, `record.teardown`  | `recordIdSlot`, `userIdSlot`                                                                                      | `recordId`, `userId`                                                                      |
| `record.link-assert`, `record.link-retract`  | `userIdSlot`                                                                                                      | `userId`                                                                                  |
| `record.link-counts`                         | `recordIdsSlot`                                                                                                   | `recordIds`                                                                               |
| `record.list`                                | `userIdSlot`, `cursorSlot`, `dataEqualsSlot`, `dataContainsSlot`                                                  | `userId`, `cursor`, `dataEquals`, `dataContains`                                          |
| `record.list`, `record.count`                | `linkFilters[].peerRecordIdSlot`                                                                                  | `linkFilters[].peerRecordId`                                                              |
| `record.count`                               | `userIdSlot`                                                                                                      | `userId`                                                                                  |
| `record.query`                               | `userIdSlot`, `cursorSlot`                                                                                        | `userId`, `cursor`                                                                        |
| `source.watch`, `source.unwatch`             | `holderSlot`, `channelSlot`, `userIdSlot`                                                                         | `holder`, `channel`, `userId`                                                             |
| `term.search`                                | `textSlot`, `parentTermIdSlot`, `vocabularySlot`                                                                  | `text`, `parentTermId`, `vocabulary`                                                      |
| `term.threshold-gate`                        | `vocabularySlot`, `candidatesSlot`, `parentTermIdSlot`, `proposalLabelSlot`, `proposalSlugSlot`, `thresholdsSlot` | `vocabulary`, `candidates`, `parentTermId`, `proposalLabel`, `proposalSlug`, `thresholds` |
| `term.upsert`                                | `resolutionsSlot`                                                                                                 | `resolutions`                                                                             |
| `text.generate`                              | `modelSlot`                                                                                                       | `model`                                                                                   |
| `text.rerank`                                | `documentItemsSlot`                                                                                               | `documentItems`                                                                           |
| `text.sanitize`                              | `itemsSlot`, `nonceSlot`                                                                                          | `items`, `nonce`                                                                          |
| `url.fetch`, `url.fetch-as-file`, `url.send` | `bodySlot`                                                                                                        | `body`                                                                                    |
| `url.send`                                   | `idempotencyKeySlot`                                                                                              | `idempotencyKey`                                                                          |
| `vocabulary.aggregate`                       | `userIdSlot`                                                                                                      | `userId`                                                                                  |
| `vocabulary.resolve`                         | `contextSlots`, `deterministicSlots`, `extractedVocabulariesSlots`                                                | `context`, `deterministic`, `extractedVocabularies`                                       |
| `flow.start-per-person`                      | `people.recordIdSlot`, `people.userIdsSlot`                                                                       | `people.recordId`, `people.userIds`                                                       |

`vocabularyKey` on `term.search` and `term.threshold-gate` keeps its name: it is a fixed reference to
a vocabulary, beside the renamed `vocabulary`.

## Merged: a fixed field and its slot twin are one field

For a single value (`limit`, `maxResults`, a `record.query` clause's fields), where both were set the
converter keeps the slot, as the action did when it ran. For a map (`headers`, `query`), it joins the
two maps, and REFUSES a name stated in both: keep one and run it again. A fixed value is kept, written
`{"literal": …}` unless it is a number or `true`/`false`. The platform's own move of stored flows kept
the slot in every case.

| Function                                     | Format 8 (fixed + slot)                                                                              | Format 9                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `record.list`                                | `limit` + `limitSlot`                                                                                | `limit`                                       |
| `web.search`                                 | `maxResults` + `maxResultsSlot`                                                                      | `maxResults`                                  |
| `url.fetch`, `url.fetch-as-file`, `url.send` | `headers` + `headerSlots`                                                                            | `headers`, one map; a header in both: refused |
| `url.fetch`, `url.fetch-as-file`, `url.send` | `query` + `querySlots`                                                                               | `query`, one map; a name in both: refused     |
| `record.query`, each clause                  | `value` + `valueSlot`, `slug` + `slugSlot`, `text` + `textSlot`, `likeRecordId` + `likeRecordIdSlot` | `value`, `slug`, `text`, `likeRecordId`       |
| `record.query`, each clause's `window`       | `from` + `fromSlot`, `to` + `toSlot`                                                                 | `window.from`, `window.to`                    |
| `record.query`, `where[]` and `peer[]` items | `value` + `valueSlot` (and a peer's `slug`, `text`, `likeRecordId` pairs)                            | `value` (and `slug`, `text`, `likeRecordId`)  |
| `record.list`, `record.count`                | `fieldFilters` + `fieldFilterSlots` (`{field: path}`)                                                | `fieldFilters`, a list                        |

`fieldFilterSlots` entries join `fieldFilters`: each `{"<field>": "<path>"}` becomes
`{"field": "<field>", "op": "eq", "value": "<path>"}`, after the fixed filters. `eq` with a list
arriving at run time matches any of its members, as the slot filter did.

## Restructured: rows become one map

- **`flow.invoke` and `flow.start-per-person` `inputs`.** The list of rows becomes one map from the
  sub-flow's input to an argument: `{"<subFlowInput>": <argument>}`. A slot row
  (`{"kind": "slot", "parentSlot": "book", "path": …, "subFlowSlot": "item"}`) becomes its slot and
  path written as one dotted path (`"item": "book.title"`); a fixed row
  (`{"kind": "literal", "value": v, "subFlowSlot": "mode"}`) becomes `"mode": {"literal": v}`, or
  `"mode": v` when `v` is a number or `true`/`false`, which stand as fixed values. Two rows
  filling one input, or a path key holding `.`, `[` or `]`, cannot convert: keep one row, or rename the
  key, by hand.
- **`flow.loop` `seed`.** `seedLiteral` (each value a fixed text) and `seedFrom` (each value a slot)
  become one `seed` map of arguments. The converter refuses a key stated in both: keep one and run
  it again (the platform's own move of stored flows kept the slot).

## Named views: a fixed text is `{"literal": …}`

A view's `where` reads no slot, so it writes a fixed text or list as `{"literal": …}` too:
`"value": "open"` becomes `"value": {"literal": "open"}`, at any depth of a clause (`value`, `slug`,
`text`, `likeRecordId`, `window.from`, `window.to`, a link's `where[].value` and `peer[]`). A bare
number or `true`/`false` stays fixed, and `param` and `set` are unchanged; `shapes` carry over as they
are. The converter lists each view it changed; on YAML it refuses a view that needs a wrap.

## New in format 9, no old name

- **Record writers' `fields`.** `record.create` and `record.update` take `fields`, a map from a table
  field to an argument (`"fields": {"title": "book.title"}`), beside `data`. Nothing converts into it:
  a format-8 `dataSlot` becomes `data`.
- **`value.build`** builds a typed value field by field, each field an expression.
- **An expression condition**, `{"op": "expr", "expr": "…"}`, in an action's condition or a loop's
  `until`.

## Not renamed

These name a slot that is WRITTEN, or a slot by its own name, so they keep their names and their
plain-string values:

- An action's `outputSlot` and `failureSlot`.
- `flow.dispatch` `rules[].outputSlot` and `default.outputSlot`.
- `flow.merge` `lanes[].outputSlot`, `failuresSlot` and `lanes[].sourceSlots`.
- `flow.loop-end` `outputSlot` and `escapeSlots`.
- `flow.invoke` `outputs[].parentSlot` and `outputs[].subFlowSlot`.
- `text.generate` and `text.decide` `outputs[].slot`.

<!-- field-ok: toSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: subjectSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: textSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: htmlSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: payloadSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: locationSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: titleSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: bodySlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: dataSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: recordIdSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: eventSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: eventIdSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: userIdSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: fileIdsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: derivedSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: idsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: recordIdsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: cursorSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: dataEqualsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: dataContainsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: holderSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: channelSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: parentTermIdSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: vocabularySlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: candidatesSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: proposalLabelSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: proposalSlugSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: thresholdsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: resolutionsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: modelSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: documentItemsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: itemsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: nonceSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: idempotencyKeySlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: contextSlots — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: deterministicSlots — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: extractedVocabulariesSlots — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: limitSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: maxResultsSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: headerSlots — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: querySlots — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: valueSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: slugSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: likeRecordIdSlot — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: fieldFilterSlots — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: seedLiteral — a format-8 setting this page maps to its format-9 name -->
<!-- field-ok: seedFrom — a format-8 setting this page maps to its format-9 name -->
