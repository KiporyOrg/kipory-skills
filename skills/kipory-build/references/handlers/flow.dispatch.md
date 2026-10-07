<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.dispatch` — Pick a branch

Send a value down the first branch whose rule it matches.

Sends the input down one of several branches, choosing the first rule that matches. What gets matched is set by `matchOn` — the value, its host, or a named field — while the original input is what travels on.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string | file | object` → `the input, unchanged`
- **Reads:** One slot. What gets matched is decided by `matchOn`; the match is the routing decision, not the payload. _(shape hint: `string | file | object`)_
- **Emits:** The original input, forwarded to exactly one branch — the first rule that matches, or the default. With no default, an unmatched input is skipped.
- **Suggested input streams:** `inputValue`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `default` | object | no | — | Fallback branch invoked when no explicit rule matches. When omitted, unmatched inputs are silently skipped. |
| `flags` | string[] | no | `["i"]` | Regex flags for every rule: `i` ignores case, `m` makes `^`/`$` match per line, `s` lets `.` match newlines, `u` enables Unicode. ⚠️ Glob patterns ignore these flags and always ignore case. |
| `matchOn` | union | no | `"value"` | What the rules are tested against: the value itself, the host of a URL, or a named field of an object. ⚠️ The ORIGINAL input is forwarded, whatever is matched — a file in stays a file out. The branch slots take the step's output type, text unless you set it. |
| `patternSyntax` | `regex` \| `glob` | no | `"regex"` | How the rule patterns are written. `regex` is full JavaScript regex; `glob` allows `*` and treats the rest literally. |
| `rules` | object[] | no | `[]` | Ordered pattern → output-slot rules; the first match wins. Leave it empty only beside a `default`: with neither, every input is skipped. |

### `default`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `outputSlot` | string | yes | — | The slot the input is forwarded to when no rule matches. |

### `matchOn` — one of

- the value `value`
- the value `url-host`

**An object with `field`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — | Name of the string field read off the object-shaped input as the matchable. |

### `rules` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `pattern` | string | yes | — | The pattern to test. A JavaScript regex, or a glob when the syntax above says so. |
| `outputSlot` | string | yes | — | The slot the input is forwarded to when this rule matches. |

## Worked example

One input goes down one branch — the first rule that matches wins. The variants show each rule firing, and the no-match case.

#### Video link

Reads `string` → emits `slot` · 1 URL → 1 of 4 categories

Input:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Routes to:

- `youtubeUrl` — `(?:^|\.)(?:youtube\.com|youtu\.be)$` **(taken)**
- `githubUrl` — `(?:^|\.)github\.com$` (not taken)
- `docUrl` — `(?:^|\.)docs\.` (not taken)
- `otherUrl` — no rule matched (not taken)

#### Code link

Reads `string` → emits `slot` · 1 URL → 1 of 4 categories

Input:

```
https://github.com/kipory/kipory
```

Routes to:

- `youtubeUrl` — `(?:^|\.)(?:youtube\.com|youtu\.be)$` (not taken)
- `githubUrl` — `(?:^|\.)github\.com$` **(taken)**
- `docUrl` — `(?:^|\.)docs\.` (not taken)
- `otherUrl` — no rule matched (not taken)

#### Docs link

Reads `string` → emits `slot` · 1 URL → 1 of 4 categories

Input:

```
https://docs.example.com/getting-started
```

Routes to:

- `youtubeUrl` — `(?:^|\.)(?:youtube\.com|youtu\.be)$` (not taken)
- `githubUrl` — `(?:^|\.)github\.com$` (not taken)
- `docUrl` — `(?:^|\.)docs\.` **(taken)**
- `otherUrl` — no rule matched (not taken)

#### Nothing matches

Reads `string` → emits `slot` · 1 URL → 1 of 4 categories

Input:

```
https://blog.example.org/2026/q2-update
```

Routes to:

- `youtubeUrl` — `(?:^|\.)(?:youtube\.com|youtu\.be)$` (not taken)
- `githubUrl` — `(?:^|\.)github\.com$` (not taken)
- `docUrl` — `(?:^|\.)docs\.` (not taken)
- `otherUrl` — no rule matched **(taken)**
