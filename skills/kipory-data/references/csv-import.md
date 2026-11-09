# A CSV file into records: the parse step

The "one file, many records" import in `files-and-imports.md` is four steps: `file.read-text`,
a `value.transform` that parses, an `each` over the valid rows with `record.create` inside, and a
`return`. The parse is the step with no function of its own. This page is one worked expression
for it and the things that go wrong around it.

```yaml
steps:
  - key: text
    function: file.read-text
    with: { file: file }
  - key: parsed
    function: value.transform
    with: { expression: "<the expression below>" }
  - key: imported
    if:
      - test: { has: parsed }
        steps:
          - key: perRow
            each: parsed.valid
            as: row
            steps:
              - key: created
                function: record.create
                with: { tableKey: product, data: row }
            out: { id: created.id }
          - key: answer
            return:
              total: parsed.total
              created: { expr: "$count(perRow)" }
              rejected: parsed.rejected
    else:
      steps:
        - key: unreadable
          fail:
            {
              code: NO_RESULT,
              message: "The file could not be read as CSV.",
              status: 422,
            }
```

## The expression

It reads `text` (the value of the `file.read-text` step), takes the first non-empty line as the
header, and answers a count, the rows fit to write, and the rows it rejected with a reason each.
The columns here are `sku`, `name` and `price`; change the three places that name them.

```
(
  $lines := $split(text, /\r?\n/)[$trim($) != ""];
  $head := $split($lines[0], ",").$trim($);
  $rows := $map($filter($lines, function($l, $i) { $i > 0 }), function($l, $i) {(
    $cells := $split($l, ",");
    $merge([{ "line": $i + 2 }, $map($head, function($h, $j) { { $h: $trim($cells[$j]) } })])
  )});
  $seen := $rows.sku;
  $why := function($r, $i) {
    $r.sku = "" ? "sku is missing"
    : $not($contains($r.price, /^[0-9]+(\.[0-9]+)?$/)) ? "price is not a number"
    : $r.sku in $filter($seen, function($s, $j) { $j < $i }) ? "sku repeats an earlier line"
  };
  $judged := $map($rows, function($r, $i) { $merge([$r, { "reason": $why($r, $i) }]) });
  {
    "total": $count($rows),
    "valid": [$map($filter($judged, function($r) { $not($exists($r.reason)) }), function($r) {
      { "sku": $r.sku, "name": $r.name, "price": $number($r.price) }
    })],
    "rejected": [$map($filter($judged, function($r) { $exists($r.reason) }), function($r) {
      { "line": $r.line, "reason": $r.reason }
    })]
  }
)
```

For `sku,name,price` followed by `A1,Mug,4.5`, `A2,Cup,`, `A1,Dup,3` it answers
`{ "total": 3, "valid": [{ "sku": "A1", "name": "Mug", "price": 4.5 }], "rejected": [{ "line": 3,
"reason": "price is not a number" }, { "line": 4, "reason": "sku repeats an earlier line" }] }`. A
file holding only the header answers `{ "total": 0, "valid": [], "rejected": [] }`.

Why it is written this way:

- **Every row is reached through a variable** (`$r.sku`, never a bare `sku`). A bare name in the
  lambda body is read as a value of the flow named `sku`, which does not exist.
- **`valid` and `rejected` are wrapped in `[ … ]`.** JSONata returns a one-item sequence as the bare
  item; without the brackets a file with exactly one valid row yields an object, and the `each`
  over it fails at run time.
- **It nests iteration two deep and no deeper** — the limit an expression is allowed. A third level —
  a loop inside the per-cell `$map` — is refused at save.
- **`$split` on a comma does not understand quoting.** A cell holding a comma inside quotes is cut
  in two. For such files, change the delimiter the export uses, or pre-process the file before
  upload; there is no CSV-aware function. <!-- absent-function: csv.* -->

## What goes wrong around it

- **A file with no valid rows.** `valid` is `[]`, the `each` runs nothing and gives `[]`, and the
  `return` answers `created: 0` beside the rejected rows.
- **The parse answers nothing.** `value.transform` gives nothing when its expression does (a
  `null`), so the save asks for the `has parsed` test (`STEP_INPUT_MAY_BE_ABSENT`). Its fields
  are untyped, so reading `parsed.valid` warns `STEP_INPUT_FIELD_UNTYPED`; the expression above
  always answers all three.
- **A key repeated inside the file.** Two rows carrying the same natural key with different data
  are two creates under one key: the second is `409 RECORD_NATURAL_KEY_TAKEN` and the whole run is
  discarded, the first row with it. Reject the repeat in the parse, as `$why` does.
- **A changed row on re-import.** The same file again converges on the same records. A row whose
  key a record already holds but whose data differs is that same 409. To update on re-import, look
  the key up first and branch with an `if` (`kipory-build`'s `references/endpoint-answers.md`), or send the rows as
  `POST /v1/records/bulk` with `onKeyTaken: "update"`.
- **More rows than one `each` takes.** A list longer than the project's limit (1,000 by default)
  fails the `each` with `FAN_OUT_OVER_LIMIT`, and one longer than its own `maxItems` fails with
  `EACH_OVER_MAX_ITEMS`: nothing is dropped in silence. Split larger files, or take the first rows
  in the parse with `$slice`.
