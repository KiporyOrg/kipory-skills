<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.dispatch` — Pick a branch

Send a value down the first branch whose rule it matches.

What gets matched is set by `matchOn`, but the original input is what travels on.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string | file | object` → `the input, unchanged`
- **Also found as:** branch, if, condition, switch, route, otherwise
- **Reads:** One slot. What gets matched is decided by `matchOn`; the match is the routing decision, not the payload. _(shape hint: `string | file | object`)_
- **Emits:** The original input, forwarded to exactly one branch — the first rule that matches, or the default. With no default, an unmatched input is skipped.
- **Suggested input streams:** `inputValue`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `default` | object | no | — | Branch for input no rule matches; empty means it is skipped. |
| `flags` | string[] | no | `["i"]` | Regex flags for every rule, such as `i` to ignore case. ⚠️ Glob patterns ignore these flags and always ignore case. |
| `matchOn` | union | no | `"value"` | What rules test: the value, a URL's host, or a named field. ⚠️ The original input is forwarded, and branch slots take the output type, text unless set. |
| `patternSyntax` | `regex` \| `glob` | no | `"regex"` | How patterns are written: full regex, or glob with `*` wildcards. |
| `rules` | object[] | no | `[]` | Pattern rules in order; the first match wins. |

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
| `field` | string | yes | — | Name of the object's text field to match against. |

### `rules` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `pattern` | string | yes | — | The pattern to test, as a regex or a glob. |
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
