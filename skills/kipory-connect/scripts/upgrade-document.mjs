#!/usr/bin/env node
/**
 * upgrade-document.mjs — convert a project document you hold to the version
 * the platform serves.
 *
 * The platform reads exactly one document version. A document exported before
 * a rename is refused with `DOCUMENT_VERSION_UNSUPPORTED`; this script rewrites
 * it locally, so nothing you hold is lost. It needs Node 20 and nothing else.
 *
 *   node upgrade-document.mjs <file.kipory.yaml|file.json> [--write]
 *
 * Without `--write` it prints the converted document; with it, the file is
 * rewritten in place (keep your own copy first).
 *
 * Version 2 → 3 (the data words):
 *   - sections `records` → `tables`, `facets` → `vocabularies`;
 *   - function keys `entity.*` → `record.*`, `facet.resolve` →
 *     `vocabulary.resolve`, `taxonomy.aggregate` → `vocabulary.aggregate`;
 *   - fields: `recordType` → `tableKey`, `entryId` → `dataTypeId`, `facet` →
 *     `vocabularyKey`, and the rest of KEYS below.
 *
 * ⛔ A NAME IS RENAMED BY WHERE IT SITS, never by how it is spelled. Only the
 * places the platform defines are rewritten: a table's and a relation's own
 * settings, a function's config, a type reference. A name YOU chose — a
 * table, a step, a slot, a property of one of your types, an endpoint
 * parameter, an input, a header, a config value — is left exactly as written,
 * even when it is spelled `facet` or `recordType`.
 *
 * It does NOT rewrite free text: a prompt, a template, an expression or a slot
 * path that names a renamed field (`{{record.recordType}}`, `$r.facet`) is
 * listed on stderr for you to edit by hand. The three provider paths the
 * platform owns (`runInfo.recordType`, `projectInfo.relationKinds`,
 * `recordTypeInfo`) are the exception: they are exact, and are rewritten.
 *
 * YAML is converted line by line, since YAML cannot be parsed without a
 * dependency. A construct that cannot be converted safely that way — a
 * `{ … }` mapping written on one line, an anchor, a `?` key — in a place that
 * is rewritten is REFUSED with its line number rather than guessed at: write
 * it out as an indented block, or convert the file to JSON, and run the
 * script again.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The version this script converts TO. */
const TARGET_VERSION = 3;

const SECTIONS = new Map([
  ["records", "tables"],
  ["facets", "vocabularies"],
]);

const KEYS = new Map([
  ["recordType", "tableKey"],
  ["recordTypeKey", "tableKey"],
  ["includeRecordTypes", "includeTableKeys"],
  ["targetRecordTypeKeys", "targetTableKeys"],
  ["fromRecordTypeKey", "fromTableKey"],
  ["toRecordTypeKey", "toTableKey"],
  ["entryId", "dataTypeId"],
  ["dataEntryId", "dataTypeId"],
  ["schemaEntryId", "dataTypeId"],
  ["payloadEntryId", "payloadDataTypeId"],
  ["propertiesEntryId", "propertiesDataTypeId"],
  ["dataEntryKey", "dataTypeKey"],
  ["kindKey", "relationKey"],
  ["relationKind", "relationKey"],
  ["relationKinds", "relations"],
  ["edgeFilters", "linkFilters"],
  ["facet", "vocabularyKey"],
  ["facets", "vocabularies"],
  ["facetKey", "vocabularyKey"],
  ["facetKeys", "vocabularyKeys"],
  ["parentFacetKey", "parentVocabularyKey"],
  ["facetFields", "vocabularyFields"],
  ["facetFilter", "vocabularyFilter"],
  ["facetSlot", "vocabularySlot"],
  ["extractedFacetsSlots", "extractedVocabulariesSlots"],
  ["maxEntriesPerFacet", "maxEntriesPerVocabulary"],
  ["requiresParentFacet", "requiresParentVocabulary"],
  ["$facet", "$vocabularyKey"],
]);

/** Under one of these keys, the next level of keys is the AUTHOR's. */
const OPEN = new Set([
  "properties",
  "carryMap",
  "deterministicSlots",
  "escapeSlots",
  "fieldFilterSlots",
  "filterSlots",
  "headerSlots",
  "maxValues",
  "payloadSlots",
  "querySlots",
  "seedFrom",
  "sparseVectorSlots",
  "vectorSlots",
  // A link's filterable properties, each named by its author.
  "linkFilters",
  "edgeFilters",
]);

/** Under one of these keys EVERYTHING is the author's own value, however deep. */
const LITERAL = new Set([
  "data",
  "derived",
  "example",
  "examples",
  "default",
  "const",
  "enum",
  "headers",
  "query",
  "seedLiteral",
  "inputs",
  "resolutionParams",
]);

/** Keys of a type definition (JSON Schema) whose children are NAMES the author chose. */
const DEFINITION_NAMES = new Set([
  "properties",
  "patternProperties",
  "definitions",
  "$defs",
  "dependentRequired",
  "dependentSchemas",
]);
const DEFINITION_LITERAL = new Set([
  "default",
  "const",
  "enum",
  "example",
  "examples",
]);

/** Platform type names a reference may spell, bare or as the tail of a type id. */
const TYPE_NAMES = new Map([
  ["FacetThresholds", "VocabularyThresholds"],
  ["FacetReuseParams", "VocabularyReuseParams"],
  ["TaxonomyAggregate", "VocabularyAggregate"],
  ["TaxonomyTree", "VocabularyTree"],
  ["RecordTypeInfo", "TableInfo"],
  ["RecordTypeRelationKind", "TableRelation"],
  ["RecordRelationKind", "Relation"],
]);
const TYPE_ID = /^([lbi]_[A-Za-z0-9_]+_)([A-Za-z]+)$/;
const typeName = (value) => {
  if (TYPE_NAMES.has(value)) return TYPE_NAMES.get(value);
  const id = TYPE_ID.exec(value);
  return id !== null && TYPE_NAMES.has(id[2])
    ? `${id[1]}${TYPE_NAMES.get(id[2])}`
    : value;
};
const TYPE_KEYS = new Set([
  "ref",
  "typeName",
  "entryId",
  "dataEntryId",
  "schemaEntryId",
  "payloadEntryId",
  "propertiesEntryId",
  "dataTypeId",
]);

/** Keys of a step whose VALUE is free text that may name a renamed field. */
const FREE_TEXT = new Set([
  "systemPrompt",
  "promptTemplate",
  "expression",
  "template",
  "condition",
]);
/** Keys of a step whose value is paths into other steps' outputs. */
const PATHS = new Set(["inputStreams", "inputPaths", "condition"]);

const NAMES_A_RENAMED_FIELD =
  /\b(recordType|recordTypeKey|includeRecordTypes|facetKeys?|facetFields|facets|relationKinds?|edgeFilters|entryId)\b|"facet"\s*:|\bentity\.[a-z]|\bfacet\.resolve\b|\btaxonomy\.aggregate\b/;
/** A path that reads a renamed field off a value (`x.facet`, `hits[].kindKey`). */
const READS_A_RENAMED_FIELD =
  /(^|[.\]])(facet|facets|facetKey|parentFacetKey|recordType|recordTypeKey|entryId|dataEntryId|schemaEntryId|kindKey|relationKind|edges)(?![\w])/;
/** Text that still names a renamed field after what could be rewritten was. */
const needsAPerson = (text) =>
  READS_A_RENAMED_FIELD.test(text) || NAMES_A_RENAMED_FIELD.test(text);

const RECORD_VERBS =
  "append|count|create|delete|enqueue-process|link-assert|link-retract|links|list|query|read|teardown|update";
const functionKey = (key) =>
  new RegExp(`^entity\\.(${RECORD_VERBS})$`).test(key)
    ? `record.${key.slice(7)}`
    : key === "facet.resolve"
      ? "vocabulary.resolve"
      : key === "taxonomy.aggregate"
        ? "vocabulary.aggregate"
        : key;

/** Three provider paths the platform owns; matched whole, never inside another name. */
const PROVIDER_PATHS = [
  [/(?<![\w.$])runInfo\.recordType(?![\w])/g, "runInfo.tableKey"],
  [/(?<![\w.$])projectInfo\.relationKinds(?![\w])/g, "projectInfo.relations"],
  [/(?<![\w$])recordTypeInfo(?![\w])/g, "tableInfo"],
];
const providerPaths = (text) =>
  PROVIDER_PATHS.reduce((out, [from, to]) => out.replace(from, to), text);

/* ── where a key sits ─────────────────────────────────────────────────────
 *
 * A MODE says what the keys of one mapping are, and what its text is. Both
 * converters below ask it the same questions — what a key becomes, what its
 * children are, what to do with a string — so the JSON and the YAML path
 * cannot disagree about a document.
 *
 * `text` is how strings under the mode are treated wherever they sit:
 *   "paths"  provider paths are rewritten, and what still names a renamed
 *            field is listed (a function's config, a step's paths);
 *   "watch"  nothing is rewritten, and what names a renamed field is listed.
 */
const M = (name, parent = "", text = null) => ({ name, parent, text });
const UNTOUCHED = M("untouched");

/** What `key`, met in a mapping of `mode`, is called in the new version. */
const keyIn = (mode, key) => {
  switch (mode.name) {
    case "root":
      return SECTIONS.get(key) ?? key;
    case "platform":
    case "vocabularyRow":
    case "relationRow":
      if (key === "relations" && mode.parent === "include") return "links";
      // A vector search's `filter` holds one setting of the platform's; its
      // other keys are vector payload fields, which keep their stored names.
      if (mode.parent === "filter")
        return key === "facet" ? "vocabularyKey" : key;
      return KEYS.get(key) ?? key;
    case "definition":
      return key === "$facet" ? "$vocabularyKey" : key;
    case "definitionNames":
      return mode.parent === "$defs" ? typeName(key) : key;
    case "assertion":
      return key === "entryId" || key === "schemaEntryId" ? "dataTypeId" : key;
    default:
      return key;
  }
};

/** The mode of the mapping (or of each item of the list) under `key`. */
const under = (mode, key) => {
  const next = structureUnder(mode, key);
  const text =
    mode.name === "skillRow" && (key === "handlerConfig" || PATHS.has(key))
      ? "paths"
      : (mode.name === "triggerRow" && key === "filter") ||
          (mode.name === "caseRow" && key === "assertions")
        ? "watch"
        : mode.text;
  return text === next.text ? next : { ...next, text };
};
const structureUnder = (mode, key) => {
  switch (mode.name) {
    case "root":
      if (key === "records") return M("rows", "table");
      if (key === "facets") return M("rows", "vocabulary");
      if (key === "relations") return M("rows", "relation");
      if (key === "schema") return M("rows", "type");
      if (key === "flows") return M("rows", "flow");
      if (key === "evals") return M("rows", "suite");
      if (key === "surfaces") return M("surfaces");
      return UNTOUCHED;
    case "rows":
      return M(`${mode.parent}Row`);
    case "tableRow":
    case "relationRow":
      return platformUnder(key);
    case "vocabularyRow":
      return key === "terms" ? UNTOUCHED : platformUnder(key);
    case "typeRow":
      return key === "definition" ? M("definition") : UNTOUCHED;
    case "definition":
      if (DEFINITION_LITERAL.has(key)) return UNTOUCHED;
      return DEFINITION_NAMES.has(key) ? M("definitionNames", key) : mode;
    case "definitionNames":
      return M("definition");
    case "flowRow":
      if (key === "skills") return M("rows", "skill");
      return key === "inputSlots" || key === "outputSlots"
        ? M("platform", key)
        : key === "inputTypeNames" || key === "outputTypeNames"
          ? M("typeNames")
          : UNTOUCHED;
    case "skillRow":
      return key === "handlerConfig" ||
        key === "outputSchema" ||
        key === "inputSchemas"
        ? M("platform", key)
        : UNTOUCHED;
    case "surfaces":
      return key === "endpoints"
        ? M("rows", "endpoint")
        : key === "triggers"
          ? M("rows", "trigger")
          : UNTOUCHED;
    case "endpointRow":
      // `contractConfig` holds no renamed key, and its `params` are named by
      // the endpoint's author.
      return key === "actionConfig" ? M("platform", key) : UNTOUCHED;
    case "suiteRow":
      return key === "cases" ? M("rows", "case") : UNTOUCHED;
    case "caseRow":
      return key === "assertions" ? M("assertion") : UNTOUCHED;
    case "platform":
      return platformUnder(key);
    case "openKeys":
      return M("platform", key);
    default:
      return UNTOUCHED;
  }
};
const platformUnder = (key) =>
  LITERAL.has(key)
    ? UNTOUCHED
    : OPEN.has(key)
      ? M("openKeys")
      : M("platform", key);

/** How the string under `key` in `mode` is treated: "paths", "watch" or null. */
const textOf = (mode, key) =>
  mode.text !== null
    ? mode.text
    : (mode.name === "skillRow" && (FREE_TEXT.has(key) || PATHS.has(key))) ||
        (mode.name === "platform" && FREE_TEXT.has(key))
      ? "paths"
      : null;

/**
 * A flow input named `facet`: a resolver flow's contract calls it
 * `vocabularyKey` now. A slot name is the author's, so it is listed and left.
 */
const isOldResolverSlot = (mode, key, value) =>
  key === "slot" &&
  value === "facet" &&
  (mode.name === "typeNames" ||
    (mode.name === "platform" && mode.parent === "inputSlots"));
const RESOLVER_SLOT_NOTE =
  "a flow input named `facet`: if this is a resolver flow, the platform now passes `vocabularyKey`";

/** A scalar string, converted where its position says the platform owns it. */
const stringAt = (mode, key, value, siblingRelation) => {
  if (
    key === "handlerKey" &&
    (mode.name === "skillRow" || mode.name === "platform")
  )
    return functionKey(value);
  if (mode.name === "platform" && key === "functionKey")
    return functionKey(value);
  if (
    mode.name === "platform" &&
    key === "kind" &&
    value === "edge" &&
    siblingRelation
  )
    return "link";
  if (
    ((mode.name === "platform" || mode.name === "assertion") &&
      TYPE_KEYS.has(key)) ||
    (mode.name === "typeNames" && key === "typeName")
  )
    return typeName(value);
  if (mode.name === "definition" && key === "$ref") {
    const local = /^#\/\$defs\/(.+)$/.exec(value);
    return local === null ? value : `#/$defs/${typeName(local[1])}`;
  }
  return value;
};

/** `value` as it should be written, and whether a person must look at it. */
const textAt = (mode, key, value, siblingRelation) => {
  const placed = stringAt(mode, key, value, siblingRelation);
  const policy = textOf(mode, key);
  const out = policy === "paths" ? providerPaths(placed) : placed;
  return { out, listed: policy !== null && needsAPerson(out) };
};

const versionOf = (stated) =>
  typeof stated === "string" && /^\d+$/.test(stated) ? Number(stated) : stated;

/** A structured document (parsed JSON), converted. `notes` collects free text to review. */
export function upgradeJson(doc, notes = []) {
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("not a project document: expected an object");
  }
  const version = versionOf(doc.kipory);
  if (version === TARGET_VERSION) return doc;
  if (version !== 2) {
    throw new Error(
      `this script converts version 2 to ${TARGET_VERSION}; the document states ${JSON.stringify(doc.kipory)}`,
    );
  }
  /**
   * The value under `key` in a mapping of `mode`. A list's items sit where
   * the list does: a string item is that key's text, a mapping item is a
   * mapping of the mode under that key.
   */
  const valueAt = (value, mode, key, at, siblingRelation) => {
    if (typeof value === "string") {
      const { out, listed } = textAt(mode, key, value, siblingRelation);
      if (listed) notes.push(at);
      if (isOldResolverSlot(mode, key, value))
        notes.push(`${at} (${RESOLVER_SLOT_NOTE})`);
      return out;
    }
    if (Array.isArray(value)) {
      return value.map((item) => valueAt(item, mode, key, at, false));
    }
    if (value === null || typeof value !== "object") return value;
    return mapping(value, under(mode, key), at);
  };
  const mapping = (value, mode, at) => {
    if (mode.name === "untouched" && mode.text === null) return value;
    const out = {};
    const relation = typeof value.relation === "string";
    for (const [k, v] of Object.entries(value)) {
      const to = keyIn(mode, k);
      if (Object.hasOwn(out, to) || (to !== k && Object.hasOwn(value, to))) {
        throw new Error(
          `${at === "" ? "the document" : at}: holds two names for "${to}" (one of them "${k}")`,
        );
      }
      const here = at === "" ? to : `${at}.${to}`;
      if (mode.text === "watch" && to === k && KEYS.has(k)) notes.push(here);
      out[to] = valueAt(v, mode, k, here, relation);
    }
    return out;
  };
  const out = mapping(doc, M("root"), "");
  out.kipory = TARGET_VERSION;
  // One note per place, however many strings under it matched.
  notes.splice(0, notes.length, ...new Set(notes));
  return out;
}

/* ── YAML, line by line ─────────────────────────────────────────────────── */

/** `indent - - key: rest`, with the key plain, single- or double-quoted. */
const KEY_LINE =
  /^(\s*(?:-\s+)*)(?:"((?:[^"\\]|\\.)*)"|'((?:[^']|'')*)'|([^\s"'#\-[\]{},&*!|>%@`?:<][^#:]*?|[^\s"'#[\]{},&*!|>%@`?:<]))(\s*:)(?=\s|$)(.*)$/;
/** A value that opens a block scalar: optional tag/anchor, then `|` or `>`. */
const BLOCK_SCALAR = /^(?:[!&]\S+\s+)*[|>][+-]?\d?[+-]?\s*(?:#.*)?$/;
const TOP_VERSION = /^(["']?)kipory\1\s*:\s*(["']?)(\d+)\2\s*(#.*)?$/;
/** Text with its quoted strings emptied, so a `:` or `{` inside one is not structure. */
const unquoted = (text) =>
  text.replace(/"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'/g, '""');

const refuse = (line, why) => {
  throw new Error(
    `line ${line}: ${why}. Write it out as an indented block, or convert the file to JSON, and run this again.`,
  );
};

const closesQuote = (line, quote) => {
  let i = 0;
  while (i < line.length) {
    if (quote === '"' && line[i] === "\\") i += 2;
    else if (quote === "'" && line[i] === "'" && line[i + 1] === "'") i += 2;
    else if (line[i] === quote) return true;
    else i += 1;
  }
  return false;
};
/** The quote a scalar that starts `value` leaves open at the line's end, or null. */
const opensQuote = (value) => {
  const quote = value[0];
  if (quote !== '"' && quote !== "'") return null;
  return closesQuote(value.slice(1), quote) ? null : quote;
};
const indentOf = (line) => line.length - line.trimStart().length;
/** A value a YAML reader takes for a string, not null, a number or a collection. */
const isStringScalar = (value) =>
  value !== "" &&
  !/^[{[&*!|>]/.test(value) &&
  !/^(~|null|Null|NULL|true|false|-?\d+(\.\d+)?)$/.test(value);

/**
 * A YAML document, converted line by line: the indentation says where each
 * key sits, and the same rules as the JSON path say what it becomes. Comments
 * and layout are kept.
 */
export function upgradeYaml(text, notes = []) {
  const bom = text.charCodeAt(0) === 0xfeff ? text[0] : "";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.slice(bom.length).split(/\r?\n/);
  const versionLine = lines.findIndex((line) => TOP_VERSION.test(line));
  if (versionLine === -1) {
    throw new Error(
      "not a project document: no top-level `kipory: <version>` line",
    );
  }
  const version = Number(TOP_VERSION.exec(lines[versionLine])[3]);
  if (version === TARGET_VERSION) return text;
  if (version !== 2) {
    throw new Error(
      `this script converts version 2 to ${TARGET_VERSION}; the document states ${version}`,
    );
  }
  const keyOf = (match) => match[2] ?? match[3] ?? match[4];
  const columnOf = (match) => match[1].length;
  const valueOf = (rest) => rest.replace(/\s+#.*$/, "").trim();
  /**
   * Whether the mapping holding line `index` (its keys at `column`) has a
   * `relation` key naming a relation. A mapping that is a list item starts on
   * its `- ` line and ends before the next one, so the scan stops at both.
   */
  const hasRelationSibling = (index, column) => {
    const scan = (step) => {
      // The item's own first line has nothing of this mapping above it.
      if (step === -1 && indentOf(lines[index]) < column) return false;
      for (let i = index + step; i >= 0 && i < lines.length; i += step) {
        const line = lines[i];
        if (line.trim() === "" || /^\s*#/.test(line)) continue;
        const indent = indentOf(line);
        const match = KEY_LINE.exec(line);
        const at = match === null ? indent : columnOf(match);
        // Going down, a shallower line (the next item's dash included) ends it.
        if (step === 1 && indent < column) return false;
        if (match !== null && at === column && keyOf(match) === "relation") {
          const value = valueOf(match[6]);
          return /^(["']).*\1$/.test(value) || isStringScalar(value);
        }
        // Going up, the item's first line is the last one to look at.
        if (step === -1 && indent < column) return false;
      }
      return false;
    };
    return scan(-1) || scan(1);
  };

  /** Text that is not a key's own one-line value: a body or continuation line. */
  const looseText = (line, policy, note) => {
    if (policy === null) return line;
    const moved = policy === "paths" ? providerPaths(line) : line;
    if (needsAPerson(moved)) notes.push(note);
    return moved;
  };
  /** Whether a mapping of `mode` is rewritten or listed at all. */
  const live = (mode) => mode.name !== "untouched" || mode.text !== null;

  /**
   * Open keys met so far, innermost last: { column, key, mode (of its
   * children), policy (of its own text) }.
   */
  const stack = [];
  let scalar = null; // { column, policy, key } while inside a block scalar
  let quoted = null; // { quote, policy, key } while inside a multi-line quoted scalar
  const out = lines.map((line, index) => {
    const number = index + 1;
    if (quoted !== null) {
      const { quote, policy, key } = quoted;
      if (closesQuote(line, quote)) quoted = null;
      return looseText(line, policy, `line ${number} (${key})`);
    }
    if (index === versionLine) {
      return line.replace(TOP_VERSION, (all, _q1, q2, _digits, comment) => {
        const head = all.slice(0, all.indexOf(":") + 1);
        const gap = /^\s*/.exec(all.slice(head.length))[0];
        return `${head}${gap}${q2}${TARGET_VERSION}${q2}${comment === undefined ? "" : ` ${comment}`}`;
      });
    }
    if (line.trim() === "" || /^\s*#/.test(line)) return line;
    const indent = indentOf(line);
    if (scalar !== null) {
      if (indent > scalar.column)
        return looseText(line, scalar.policy, `line ${number} (${scalar.key})`);
      scalar = null;
    }
    if (/^\s*\t/.test(line)) refuse(number, "a tab is used for indentation");
    if (/^(---|\.\.\.)(\s|$)|^%[A-Z]/.test(line)) return line;
    const match = KEY_LINE.exec(line);
    if (match === null) {
      // A list item that is not a mapping, or a continuation of a plain scalar.
      const item = /^(\s*(?:-\s+)*)(.*)$/.exec(line);
      const value = valueOf(item[2]);
      const dashed = item[1].trim() !== "";
      // A list item belongs to the key whose list it is in; a continuation
      // line to the key above it.
      const edge = dashed ? item[1].length : indent;
      while (stack.length > 0 && stack[stack.length - 1].column >= edge)
        stack.pop();
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      const mode = parent === null ? M("root") : parent.mode;
      const policy = parent === null ? null : parent.policy;
      const key = parent === null ? "" : parent.key;
      if (BLOCK_SCALAR.test(value)) {
        scalar = { column: indent, policy, key };
        return line;
      }
      if (live(mode) || policy !== null) {
        const bare = unquoted(value);
        if (/^\?(\s|$)/.test(value))
          refuse(number, "a `?` key is used in a place that is rewritten");
        if (/^<<\s*:/.test(value) || /^[&*!]/.test(value))
          refuse(
            number,
            "an anchor, alias, tag or merge key is used in a place that is rewritten",
          );
        if (/^[{[]/.test(bare) && /[:{]/.test(bare.slice(1)))
          refuse(number, "a mapping is written on one line");
        if (!/^[{["']/.test(value) && /:(\s|$)/.test(bare))
          refuse(number, "this line has a key the script cannot read");
      }
      const open = opensQuote(value);
      if (open !== null) quoted = { quote: open, policy, key };
      return looseText(line, policy, `line ${number} (${key})`);
    }
    const column = columnOf(match);
    while (stack.length > 0 && stack[stack.length - 1].column >= column)
      stack.pop();
    const parent = stack.length > 0 ? stack[stack.length - 1] : null;
    if (column > 0 && parent === null) {
      refuse(number, "this line is indented under nothing");
    }
    const mode = parent === null ? M("root") : parent.mode;
    const key = keyOf(match);
    const to = keyIn(mode, key);
    const child = under(mode, key);
    const policy = textOf(mode, key);
    const rest = match[6];
    const value = valueOf(rest);
    const comment = rest.slice(rest.indexOf(value) + value.length);
    const quote =
      match[2] !== undefined ? '"' : match[3] !== undefined ? "'" : "";
    const head = `${match[1]}${quote}${to}${quote}${match[5]}`;
    const note = `line ${number} (${key})`;
    stack.push({ column, key, mode: child, policy: policy ?? child.text });
    if (mode.text === "watch" && to === key && KEYS.has(key)) notes.push(note);
    if (BLOCK_SCALAR.test(value)) {
      scalar = { column, policy, key };
      return `${head}${rest}`;
    }
    if (value === "") return `${head}${rest}`;
    const open = opensQuote(value);
    if (open !== null) {
      quoted = { quote: open, policy, key };
      return `${head}${looseText(rest, policy, note)}`;
    }
    if (/^[{[]/.test(value)) {
      // `[a, "b: c"]` of scalars and the empty `{}` / `[]` hold no key.
      const bare = unquoted(value);
      const flat = /^\[[^{}[\]:]*\]$/.test(bare) || /^\{\s*\}$/.test(bare);
      if (!flat && (live(mode) || live(child) || policy !== null))
        refuse(number, "a mapping is written on one line");
      return `${head}${looseText(rest, policy ?? child.text, note)}`;
    }
    if (/^[&*!]/.test(value)) {
      if (live(mode) || live(child) || policy !== null)
        refuse(
          number,
          "an anchor, alias or tag is used in a place that is rewritten",
        );
      return `${head}${rest}`;
    }
    // A plain or one-line quoted scalar.
    const bare = /^(["'])(.*)\1$/.exec(value);
    const plain = bare === null ? value : bare[2];
    const { out: converted, listed } = textAt(
      mode,
      key,
      plain,
      key === "kind" && plain === "edge" && hasRelationSibling(index, column),
    );
    if (listed) notes.push(note);
    if (isOldResolverSlot(mode, key, plain))
      notes.push(`line ${number} (${RESOLVER_SLOT_NOTE})`);
    if (converted === plain) return `${head}${rest}`;
    const lead = /^\s*/.exec(rest)[0];
    const q = bare === null ? "" : bare[1];
    return `${head}${lead}${q}${converted}${q}${comment}`;
  });
  notes.splice(0, notes.length, ...new Set(notes));
  return `${bom}${out.join(eol)}`;
}

/** Convert a document given as text: JSON when it starts as JSON, YAML otherwise. */
export function upgradeDocumentText(text, notes = []) {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!/^\s*[{[]/.test(body)) return upgradeYaml(text, notes);
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new Error(
      `the file starts like JSON and does not parse as JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const converted = upgradeJson(parsed, notes);
  return converted === parsed
    ? text
    : `${JSON.stringify(converted, null, 2)}\n`;
}

const isMain = (() => {
  if (process.argv[1] === undefined) return false;
  try {
    return (
      import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
    );
  } catch {
    return false;
  }
})();
if (isMain) {
  const args = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("-"));
  const files = args.filter((arg) => !arg.startsWith("-"));
  if (files.length !== 1 || flags.some((flag) => flag !== "--write")) {
    console.error(
      "usage: node upgrade-document.mjs <file.kipory.yaml|file.json> [--write]",
    );
    process.exit(2);
  }
  const [file] = files;
  const notes = [];
  let converted;
  try {
    converted = upgradeDocumentText(readFileSync(file, "utf8"), notes);
  } catch (error) {
    console.error(
      `upgrade-document: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
  if (flags.includes("--write")) writeFileSync(file, converted);
  else process.stdout.write(converted);
  if (notes.length > 0) {
    console.error(
      [
        `upgrade-document: ${notes.length} place(s) name a renamed field in text this script does not rewrite. Check each by hand:`,
        ...notes.map((note) => `  ${note}`),
      ].join("\n"),
    );
  }
}
