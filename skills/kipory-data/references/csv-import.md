# A CSV file into records: the parse step

The "one file, many records" import in this skill's main page is four steps: `file.read-text` →
`value.transform` (parse) → `flow.fan-out` over the valid rows, with `entity.create` in the branch →
`flow.merge`. The parse is the step with no handler of its own. This page is one worked expression
for it and the four things that go wrong around it.

## The expression

It reads one slot, `text` (the output of `file.read-text`), takes the first non-empty line as the
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

- **Every row is reached through a variable** (`$r.sku`, never a bare `sku`). A bare name at the
  start of a path is read as a slot name, and the save would add `sku` to the step's inputs.
- **`valid` and `rejected` are wrapped in `[ … ]`.** JSONata returns a one-item sequence as the bare
  item; without the brackets a file with exactly one valid row yields an object, and a list-typed
  `outputSchema` fails the step at run time.
- **It nests iteration two deep and no deeper** — the limit an expression is allowed. Adding a loop
  inside `$why`'s `$filter` is refused at save.
- **`$split` on a comma does not understand quoting.** A cell holding a comma inside quotes is cut
  in two. For such files, change the delimiter the export uses, or pre-process the file before
  upload; there is no CSV-aware function.

## Type the result, and the row

Give the parse step an `outputSchema` naming a shape with `total`, `valid` and `rejected`, and make
`valid`'s `items` a reference to a row shape of its own (`kipory-model` has the `$ref` form). The
fan-out reads `valid` through an `inputPaths` `field` segment, and its branch slot is typed as that
row shape only when the items are a named entry — an inline `items` object is the anonymous
`object`, and a `field` path into the branch slot is then refused.

## What goes wrong around it

- **A file with no valid rows.** The fan-out starts no branch, the body does not run, and a step
  that reads only the merged list is skipped. If the flow's required output comes from such a step
  the call is refused `422 FLOW_OUTPUT_MISSING`, though plan and health were clean. Build the answer
  in a step that also reads the parse step's slot, which is always present: a transform returning
  `{ "total": parsed.total, "created": $count(created), "rejected": parsed.rejected }`.
- **A key repeated inside the file.** Two rows carrying the same natural key with different data
  are two creates under one key: the second is `409 RECORD_NATURAL_KEY_TAKEN` and the whole run is
  discarded, the first row with it. Reject the repeat in the parse, as `$why` does.
- **A changed row on re-import.** The same file again converges on the same records. A row whose
  key a record already holds but whose data differs is that same 409. To update on re-import, look
  the key up first and branch (`kipory-build`'s `patterns.md` §8), or send the rows as
  `POST /v1/records/bulk` with `onKeyTaken: "update"`.
- **More rows than the fan-out takes.** `maxItems` defaults to 20 and its ceiling is 100 unless the
  deployment raised it. Rows past it start no branch (a preview names the cut in `fanOutCaps`);
  report `total` beside the count created so a short import shows, and split larger files.
