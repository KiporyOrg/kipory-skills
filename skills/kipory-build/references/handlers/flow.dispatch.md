<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `flow.dispatch` — Dispatch by pattern

Send a value down a branch chosen by the first matching rule.

- **Group:** Flow · **Phase:** `control` · **Effect class:** `read`
- **I/O:** `string | file | object` → `string`
- **Reads:** One slot. What gets matched is decided by `matchOn`; the match is the routing decision, not the payload. _(shape hint: `string | file | object`)_
- **Emits:** The original input, forwarded to exactly one branch — the first rule that matches, or the default. With no default, an unmatched input is skipped.
- **Suggested input streams:** `inputValue`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `default` | object | no | — | Fallback branch invoked when no explicit rule matches. When omitted, unmatched inputs are silently skipped. |
| `flags` | string | no | `"i"` | Regex flags applied to every rule. Glob patterns are always case-insensitive and ignore this. |
| `matchOn` | object | no | `"value"` | What the rules are tested against: the value itself, the host of a URL, or a named field of an object. ⚠️ Whatever is matched, the ORIGINAL input is what gets forwarded — so a file in stays a file out. |
| `patternSyntax` | `regex` \| `glob` | no | `"regex"` | How the rule patterns are written. `regex` is full JavaScript regex; `glob` allows `*` and treats the rest literally. |
| `rules` | object[] | no | `[]` | Ordered list of pattern → output-slot routing rules. Evaluated in declared order; first match wins. |

## Worked example

One input goes down one branch — the first rule that matches wins. The variants show each rule firing, and the no-match case.

Reads: test rules in order. Emits: first match · forward input.

#### youtube

Reads `string` → emits `slot` · 1 URL → 1 of 4 categories

Input:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Routes to:

- {"index":0,"value":"youtubeUrl","detail":"(?:^\|\\.)(?:youtube\\.com\|youtu\\.be)$","chosen":true}
- {"index":1,"value":"githubUrl","detail":"(?:^\|\\.)github\\.com$","chosen":false}
- {"index":2,"value":"docUrl","detail":"(?:^\|\\.)docs\\.","chosen":false}
- {"index":3,"value":"otherUrl","detail":"no rule matched","chosen":false}

#### github

Reads `string` → emits `slot` · 1 URL → 1 of 4 categories

Input:

```
https://github.com/kipory/kipory
```

Routes to:

- {"index":0,"value":"youtubeUrl","detail":"(?:^\|\\.)(?:youtube\\.com\|youtu\\.be)$","chosen":false}
- {"index":1,"value":"githubUrl","detail":"(?:^\|\\.)github\\.com$","chosen":true}
- {"index":2,"value":"docUrl","detail":"(?:^\|\\.)docs\\.","chosen":false}
- {"index":3,"value":"otherUrl","detail":"no rule matched","chosen":false}

#### docs subdomain

Reads `string` → emits `slot` · 1 URL → 1 of 4 categories

Input:

```
https://docs.example.com/getting-started
```

Routes to:

- {"index":0,"value":"youtubeUrl","detail":"(?:^\|\\.)(?:youtube\\.com\|youtu\\.be)$","chosen":false}
- {"index":1,"value":"githubUrl","detail":"(?:^\|\\.)github\\.com$","chosen":false}
- {"index":2,"value":"docUrl","detail":"(?:^\|\\.)docs\\.","chosen":true}
- {"index":3,"value":"otherUrl","detail":"no rule matched","chosen":false}

#### no match

Reads `string` → emits `slot` · 1 URL → 1 of 4 categories

Input:

```
https://blog.example.org/2026/q2-update
```

Routes to:

- {"index":0,"value":"youtubeUrl","detail":"(?:^\|\\.)(?:youtube\\.com\|youtu\\.be)$","chosen":false}
- {"index":1,"value":"githubUrl","detail":"(?:^\|\\.)github\\.com$","chosen":false}
- {"index":2,"value":"docUrl","detail":"(?:^\|\\.)docs\\.","chosen":false}
- {"index":3,"value":"otherUrl","detail":"no rule matched","chosen":true}
