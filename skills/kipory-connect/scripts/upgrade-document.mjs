#!/usr/bin/env node
/**
 * upgrade-document.mjs — convert a project document you hold to the version
 * the platform serves.
 *
 * The platform reads exactly one document version. A document exported before
 * a rename, or before search models stopped naming their slots, is refused
 * with `DOCUMENT_VERSION_UNSUPPORTED`; this script rewrites it locally, so
 * nothing you hold is lost. It needs Node 20 and nothing else.
 *
 *   node upgrade-document.mjs <file.kipory.yaml|file.json> [--write]
 *
 * Without `--write` it prints the converted document; with it, the file is
 * rewritten in place (keep your own copy first).
 *
 * It converts in five steps, and a version 2 document takes all five in one
 * run. A version 3 document takes the last four, a version 4 document the
 * last three, a version 5 document the last two, a version 6 document the
 * last; a version 7 document is returned as it is.
 *
 * Version 2 → 3 (the data words):
 *   - sections `records` → `tables`, `facets` → `vocabularies`;
 *   - function keys `entity.*` → `record.*`, `facet.resolve` →
 *     `vocabulary.resolve`, `taxonomy.aggregate` → `vocabulary.aggregate`;
 *   - fields: `recordType` → `tableKey`, `entryId` → `dataTypeId`, `facet` →
 *     `vocabularyKey`, and the rest of KEYS below.
 *
 * Version 3 → 4 (the flow words):
 *   - a flow's `skills` → `actions`;
 *   - on each action, `handlerKey` → `functionKey` and `handlerConfig` →
 *     `functionConfig` (nothing inside the config changes);
 *   - on an endpoint, `actionConfig` → `targetConfig`;
 *   - on an eval suite, `perSkillLatency` → `perActionLatency`; in a case's
 *     assertions, `kind: skill-outcome` with its `skillKey` → `kind:
 *     action-outcome` with `actionKey`.
 *
 * Version 4 → 5 (a function config names a relation by key):
 *   - in the `functionConfig` of a `record.link-assert`, `record.link-retract`
 *     or `record.links` action, `kind` → `relationKey`;
 *   - in a `record.list` or `record.count` action's `linkFilters`, each
 *     entry's `kind` → `relationKey`;
 *   - in a `vector.search` action over a terms collection (`$project.terms`,
 *     or a name ending `.terms`), `filterSlots.facet` and `filter.facet` →
 *     `vocabularyKey`. Over any other collection those keys are payload
 *     fields of yours, and stay.
 *   The action is known by its `functionKey`, and a search's collection by
 *   its `collection`: both are read beside the key they decide.
 *
 * Version 5 → 6 (the search words: a document names no vector slot and no
 * collection):
 *   - a search model under `vectors.profiles` loses `denseSlots` and
 *     `sparseSlot` and states `keywords`: `true` where it named a sparse slot,
 *     `false` where it named none;
 *   - a `search` use of a table's field loses `role`;
 *   - `vectors.collections` is removed, and `vectors` with it when nothing
 *     else is under it.
 * Each of these is listed on stderr.
 *
 * Version 6 → 7 (one word for a type):
 *   - the root section `schema` → `types`;
 *   - on each table, `shape` → `type`;
 *   - on each namespace of `project.config`, `shape` → `type`.
 *   Nothing else named `shape` or `schema` moves: not a function's config
 *   (`vocabulary.aggregate`'s `shape`, `text.generate`'s `schema`), not an
 *   action's `outputSchema` or `inputSchemas`, not `events.types`, not a
 *   property of one of your types, and not a table, action or namespace you
 *   named `shape` or `schema`.
 *
 * It does NOT rebuild an action on a function that no longer exists
 * (`vector.search`, `vector.upsert`, `vector.fetch`, `vector.point-id`,
 * `text.embed`, `text.embed-sparse`): what the action becomes is your
 * decision. Each is left as written and listed on stderr — rebuild it as
 * `record.query` with a `semantic` clause or as `term.search`, or remove it.
 *
 * ⛔ A NAME IS RENAMED BY WHERE IT SITS, never by how it is spelled. Only the
 * places the platform defines are rewritten: a table's and a relation's own
 * settings, a flow's and an action's own settings, a function's config, a
 * type reference. A name YOU chose — a table, an action, a slot, a property
 * of one of your types, an endpoint parameter, an input, a header, a config
 * value — is left exactly as written, even when it is spelled `facet`,
 * `recordType`, `skills` or `handlerKey`.
 *
 * It does NOT rewrite free text: a prompt, a template, an expression or a slot
 * path that names a renamed field (`{{record.recordType}}`, `$r.facet`,
 * `$run.skillKey`, `handler-error`, a `step-failed` event kind) is listed on
 * stderr for you to edit by hand. Two exceptions are exact, and are
 * rewritten: the three provider paths the platform owns
 * (`runInfo.recordType`, `projectInfo.relationKinds`, `recordTypeInfo`), and
 * in a `jsonata` assertion's expression the preview's `skillId`, `skillKey`,
 * `skillName`, `handler-error`, `handler-soft-warning` and
 * `step-failed-continued` (→ `actionId`, `actionKey`, `actionName`,
 * `function-error`, `function-soft-warning`, `action-failed-continued`), as
 * the platform rewrote its stored copy.
 *
 * YAML is converted line by line, since YAML cannot be parsed without a
 * dependency. A construct that cannot be converted safely that way — a
 * `{ … }` mapping written on one line, an anchor, a `?` key — in a place that
 * is rewritten, or holding a member that is removed, is REFUSED with its line
 * number rather than guessed at: write it out as an indented block, or
 * convert the file to JSON, and run the script again.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The version this script converts TO — the format these skills write. */
export const TARGET_VERSION = 7;

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

/**
 * A scalar string, converted where its position says the platform owns it.
 * `sibling(name)` is the text another key of the same mapping holds, or
 * undefined when it holds none.
 */
const stringAt = (mode, key, value, sibling) => {
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
    typeof sibling("relation") === "string"
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

/* ── version 3 → 4: the flow words ────────────────────────────────────────
 *
 * The same questions, asked of a version 3 document. Far fewer places answer:
 * a flow, an action, an endpoint, an eval suite and an assertion each hold a
 * renamed key, and nothing under a function's or an endpoint's config does.
 */
const ACTION_KEYS = new Map([
  ["handlerKey", "functionKey"],
  ["handlerConfig", "functionConfig"],
]);
/** Text that names a flow word, or a run event or failure phase that moved. */
const NAMES_A_FLOW_WORD =
  /\b(skillName|skillId|skillKey|handlerKey|handlerConfig)\b|(?<![\w-])(handler-error|handler-soft-warning|skill-(started|ended|not-reached|outcome)|step-(?!by-step)[a-z]+)(?![\w])/;
/** Nothing under it is renamed; its text is read for a flow word. */
const WATCHED = M("untouched", "", "watch");

const flowKeyIn = (mode, key, sibling) => {
  switch (mode.name) {
    case "flowRow":
      return key === "skills" ? "actions" : key;
    case "actionRow":
      return ACTION_KEYS.get(key) ?? key;
    case "endpointRow":
      return key === "actionConfig" ? "targetConfig" : key;
    case "suiteRow":
      return key === "perSkillLatency" ? "perActionLatency" : key;
    case "assertion":
      return key === "skillKey" && sibling("kind") === "skill-outcome"
        ? "actionKey"
        : key;
    default:
      return key;
  }
};
const flowUnder = (mode, key) => {
  switch (mode.name) {
    case "root":
      if (key === "flows") return M("rows", "flow");
      if (key === "evals") return M("rows", "suite");
      if (key === "surfaces") return M("surfaces");
      return UNTOUCHED;
    case "rows":
      return M(`${mode.parent}Row`);
    case "flowRow":
      return key === "skills" ? M("rows", "action") : UNTOUCHED;
    case "actionRow":
      return key === "handlerConfig" || PATHS.has(key) ? WATCHED : UNTOUCHED;
    case "surfaces":
      return key === "endpoints" ? M("rows", "endpoint") : UNTOUCHED;
    case "suiteRow":
      return key === "cases" ? M("rows", "case") : UNTOUCHED;
    case "caseRow":
      return key === "assertions" ? M("assertion", "", "watch") : UNTOUCHED;
    default:
      // An assertion's own values, and whatever sits under watched text.
      return mode.text === null ? UNTOUCHED : WATCHED;
  }
};
/** An assertion's keys whose value is a kind or an action's key, never text. */
const ASSERTION_NAMES = new Set(["kind", "skillKey", "actionKey"]);
const flowTextOf = (mode, key) =>
  mode.name === "assertion" && ASSERTION_NAMES.has(key)
    ? null
    : mode.text !== null
      ? mode.text
      : mode.name === "actionRow" && (FREE_TEXT.has(key) || PATHS.has(key))
        ? "watch"
        : null;
/**
 * The field names a jsonata assertion reads off the preview it scores, and
 * the failure phase and warning kinds it may compare: the same rewrite the
 * platform's migration gives a stored case (ruled 2026-10-08). An expression
 * filtering on a name the preview no longer carries matches nothing and
 * passes vacuously.
 */
const jsonataFlowWords = (text) =>
  text
    .replace(/\bskillId\b/g, "actionId")
    .replace(/\bskillKey\b/g, "actionKey")
    .replace(/\bskillName\b/g, "actionName")
    .replaceAll("handler-error", "function-error")
    .replaceAll("handler-soft-warning", "function-soft-warning")
    .replaceAll("step-failed-continued", "action-failed-continued");
const flowStringAt = (mode, key, value, sibling) => {
  if (mode.name !== "assertion") return value;
  if (key === "kind" && value === "skill-outcome") return "action-outcome";
  if (key === "expression" && sibling("kind") === "jsonata")
    return jsonataFlowWords(value);
  return value;
};

/* ── version 4 → 5: a function config names a relation by key ─────────────
 *
 * Only an action's config moves, and only for the functions below; which
 * function an action runs is its `functionKey`, read beside `functionConfig`.
 * A terms search is told apart by its own `collection`, read beside the
 * filter map.
 */
const LINK_FUNCTIONS = new Set([
  "record.link-assert",
  "record.link-retract",
  "record.links",
]);
const LINK_FILTER_FUNCTIONS = new Set(["record.list", "record.count"]);
/** A project's terms collection, as the platform tells one (`substrateCollectionOwner`). */
const isTermsCollection = (name) =>
  typeof name === "string" &&
  name.length > ".terms".length &&
  name.endsWith(".terms");

const configKeyIn = (mode, key) => {
  switch (mode.name) {
    case "linkConfig":
    case "linkFilter":
      return key === "kind" ? "relationKey" : key;
    case "termsFilter":
      return key === "facet" ? "vocabularyKey" : key;
    default:
      return key;
  }
};
const configUnder = (mode, key, sibling = noSibling) => {
  switch (mode.name) {
    case "root":
      return key === "flows" ? M("rows", "flow") : UNTOUCHED;
    case "rows":
      return M(`${mode.parent}Row`);
    case "flowRow":
      return key === "actions" ? M("rows", "action") : UNTOUCHED;
    case "actionRow": {
      if (key !== "functionConfig") return UNTOUCHED;
      const fn = sibling("functionKey");
      if (LINK_FUNCTIONS.has(fn)) return M("linkConfig");
      if (LINK_FILTER_FUNCTIONS.has(fn)) return M("listConfig");
      return fn === "vector.search" ? M("searchConfig") : UNTOUCHED;
    }
    case "listConfig":
      return key === "linkFilters" ? M("linkFilter") : UNTOUCHED;
    case "searchConfig":
      return (key === "filterSlots" || key === "filter") &&
        isTermsCollection(sibling("collection"))
        ? M("termsFilter")
        : UNTOUCHED;
    default:
      return UNTOUCHED;
  }
};

/* ── version 6 → 7: one word for a type ──────────────────────────────────
 *
 * Three keys move, each known by where it sits: the root `schema`, a table's
 * `shape`, a config namespace's `shape`. Nothing below a table or a namespace
 * is entered, so a function's config, a type's definition and the author's
 * values keep every key they hold.
 */
const typeKeyIn = (mode, key) => {
  switch (mode.name) {
    case "root":
      return key === "schema" ? "types" : key;
    case "tableRow":
    case "namespaceRow":
      return key === "shape" ? "type" : key;
    default:
      return key;
  }
};
const typeUnder = (mode, key) => {
  switch (mode.name) {
    case "root":
      if (key === "tables") return M("rows", "table");
      return key === "project" ? M("project") : UNTOUCHED;
    case "project":
      return key === "config" ? M("rows", "namespace") : UNTOUCHED;
    case "rows":
      return M(`${mode.parent}Row`);
    default:
      return UNTOUCHED;
  }
};

/**
 * One step of the conversion: the version it reads, the version it writes,
 * and its answers to the questions above.
 */
const STAGES = [
  {
    from: 2,
    to: 3,
    keyIn,
    under,
    textOf,
    stringAt,
    rewrite: providerPaths,
    needsAPerson,
    watchedKey: (key) => KEYS.has(key),
    slotNote: isOldResolverSlot,
  },
  {
    from: 3,
    to: 4,
    keyIn: flowKeyIn,
    under: flowUnder,
    textOf: flowTextOf,
    stringAt: flowStringAt,
    rewrite: (text) => text,
    needsAPerson: (text) => NAMES_A_FLOW_WORD.test(text),
    watchedKey: () => false,
    slotNote: () => false,
  },
  {
    from: 4,
    to: 5,
    keyIn: configKeyIn,
    under: configUnder,
    textOf: () => null,
    stringAt: (_mode, _key, value) => value,
    rewrite: (text) => text,
    needsAPerson: () => false,
    watchedKey: () => false,
    slotNote: () => false,
  },
  {
    // Renames nothing: the search words are removals, made after every step
    // has run (`searchWordsJson`, `searchWordsYaml`), so this step only moves
    // the version.
    from: 5,
    to: 6,
    keyIn: (_mode, key) => key,
    under: () => UNTOUCHED,
    textOf: () => null,
    stringAt: (_mode, _key, value) => value,
    rewrite: (text) => text,
    needsAPerson: () => false,
    watchedKey: () => false,
    slotNote: () => false,
  },
  {
    from: 6,
    to: 7,
    keyIn: typeKeyIn,
    under: typeUnder,
    textOf: () => null,
    stringAt: (_mode, _key, value) => value,
    rewrite: (text) => text,
    needsAPerson: () => false,
    watchedKey: () => false,
    slotNote: () => false,
  },
];
/* The conversions run one version at a time to TARGET_VERSION, or the script
 * refuses to load: a target raised with no conversion to it would stamp a
 * document with the old version and refuse every file in the previous one. */
STAGES.forEach((stage, i) => {
  if (stage.to !== stage.from + 1 || (i > 0 && STAGES[i - 1].to !== stage.from))
    throw new Error(
      `upgrade-document: the conversion from version ${stage.from} does not follow the one before it`,
    );
});
if (STAGES.at(-1).to !== TARGET_VERSION)
  throw new Error(
    `upgrade-document: its conversions end at version ${STAGES.at(-1).to}, not at ${TARGET_VERSION}, the version it converts to`,
  );
const CONVERTS = `this script converts version ${STAGES.map((stage) => stage.from).join(" or ")} to ${TARGET_VERSION}`;
/** The steps a document stating `version` still has to take, or null for a version not read. */
const stagesFrom = (version) => {
  const first = STAGES.findIndex((stage) => stage.from === version);
  return first === -1 ? null : STAGES.slice(first);
};
const noSibling = () => undefined;

/** `value` as it should be written, and whether a person must look at it. */
const textAt = (stage, mode, key, value, sibling) => {
  const placed = stage.stringAt(mode, key, value, sibling);
  const policy = stage.textOf(mode, key);
  const out = policy === "paths" ? stage.rewrite(placed) : placed;
  return { out, listed: policy !== null && stage.needsAPerson(out) };
};

const versionOf = (stated) =>
  typeof stated === "string" && /^\d+$/.test(stated) ? Number(stated) : stated;

/**
 * A structured document (parsed JSON), converted. `notes` collects the places
 * a person must edit, `dropped` the members that were removed. A version 7
 * document is returned as it is, the same object.
 */
export function upgradeJson(doc, notes = [], dropped = []) {
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("not a project document: expected an object");
  }
  const version = versionOf(doc.kipory);
  if (version === TARGET_VERSION) return doc;
  const stages = stagesFrom(version);
  if (stages === null) {
    throw new Error(
      `${CONVERTS}; the document states ${JSON.stringify(doc.kipory)}`,
    );
  }
  /** Places to review, each { path, extra }: a path is the keys down to it. */
  let places = [];
  let out = doc;
  for (const stage of stages) {
    // A place an earlier step listed is named as the later step leaves it.
    places = places.map(({ path, extra }) => ({
      path: pathAfter(stage, path),
      extra,
    }));
    out = stageJson(out, stage, places);
  }
  // One note per place, however many strings under it matched.
  const said = places.map(
    ({ path, extra }) =>
      `${path.join(".")}${extra === "" ? "" : ` (${extra})`}`,
  );
  notes.splice(0, notes.length, ...new Set([...notes, ...said]));
  // The search words (version 5 → 6), once every step has run.
  const searched = searchWordsJson(out, notes, dropped);
  notes.splice(0, notes.length, ...new Set(notes));
  return searched;
}

/** The keys down to a place, as `stage` renames them. */
const pathAfter = (stage, path) => {
  let mode = M("root");
  return path.map((key) => {
    const to = stage.keyIn(mode, key, noSibling);
    mode = stage.under(mode, key);
    return to;
  });
};

/** One step over a structured document. */
const stageJson = (doc, stage, places) => {
  /**
   * The value under `key` in a mapping of `mode`. A list's items sit where
   * the list does: a string item is that key's text, a mapping item is a
   * mapping of the mode under that key.
   */
  const valueAt = (value, mode, key, path, sibling) => {
    if (typeof value === "string") {
      const { out, listed } = textAt(stage, mode, key, value, sibling);
      if (listed) places.push({ path, extra: "" });
      if (stage.slotNote(mode, key, value))
        places.push({ path, extra: RESOLVER_SLOT_NOTE });
      return out;
    }
    if (Array.isArray(value)) {
      return value.map((item) => valueAt(item, mode, key, path, noSibling));
    }
    if (value === null || typeof value !== "object") return value;
    return mapping(value, stage.under(mode, key, sibling), path);
  };
  const mapping = (value, mode, path) => {
    if (mode.name === "untouched" && mode.text === null) return value;
    const out = {};
    const sibling = (name) =>
      typeof value[name] === "string" ? value[name] : undefined;
    for (const [k, v] of Object.entries(value)) {
      const to = stage.keyIn(mode, k, sibling);
      if (Object.hasOwn(out, to) || (to !== k && Object.hasOwn(value, to))) {
        throw new Error(
          `${path.length === 0 ? "the document" : path.join(".")}: holds two names for "${to}" (one of them "${k}")`,
        );
      }
      const here = [...path, to];
      if (mode.text === "watch" && to === k && stage.watchedKey(k))
        places.push({ path: here, extra: "" });
      out[to] = valueAt(v, mode, k, here, sibling);
    }
    return out;
  };
  const out = mapping(doc, M("root"), []);
  out.kipory = stage.to;
  return out;
};

/* ── the search words ─────────────────────────────────────────────────────
 *
 * Version 6: a document names no vector slot and no collection. This runs
 * once every step has (the places it reads did not move from 5 to 7), so
 * every older version takes one path.
 */

/** Functions the platform no longer has. An action on one is the author's to rebuild. */
const REMOVED_FUNCTIONS = new Set([
  "vector.search",
  "vector.upsert",
  "vector.fetch",
  "vector.point-id",
  "text.embed",
  "text.embed-sparse",
]);
const removedFunctionNote = (at, key) =>
  `${at} (the function \`${key}\` no longer exists: rebuild the action as \`record.query\` with a \`semantic\` clause or as \`term.search\`, or remove it)`;
const SLOT_MEMBERS = ["denseSlots", "sparseSlot"];
const profileDropped = (at, members, keywords, stated) =>
  `${at}: ${members.map((m) => `\`${m}\``).join(" and ")} dropped; ${
    stated
      ? `\`keywords: ${keywords}\` stays as stated`
      : `it states \`keywords: ${keywords}\``
  }`;
const keywordsDisagree = (at, keywords) =>
  `${at}: states \`keywords: ${keywords}\` and a \`sparseSlot\` that says otherwise. Remove one of the two and run this again.`;
const roleDropped = (at, table) =>
  `${at}: \`role\` dropped from a \`search\` use of table \`${table}\``;
const COLLECTIONS_DROPPED = "`collections` dropped: a document carries none";
const VECTORS_DROPPED = "`vectors` dropped: nothing else was under it";

const isMap = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
/** `map` with each value passed through `fn`; `map` itself when none changed. */
const mapValues = (map, fn) => {
  const out = {};
  let same = true;
  for (const [key, value] of Object.entries(map)) {
    out[key] = fn(value, key);
    if (out[key] !== value) same = false;
  }
  return same ? map : out;
};
const mapItems = (list, fn) => {
  const out = list.map(fn);
  return out.every((item, index) => item === list[index]) ? list : out;
};
/** `map` with `key` holding `fn` of what it holds, when `holds` says it is the kind expected. */
const within = (map, key, holds, fn) => {
  if (!isMap(map) || !holds(map[key])) return map;
  const value = fn(map[key]);
  return value === map[key] ? map : { ...map, [key]: value };
};

function searchWordsJson(doc, notes, dropped) {
  const profile = (row, where) => {
    if (!isMap(row)) return row;
    const old = SLOT_MEMBERS.filter((member) => Object.hasOwn(row, member));
    if (old.length === 0) return row;
    const keywords =
      typeof row.sparseSlot === "string" && row.sparseSlot.trim() !== "";
    const stated = Object.hasOwn(row, "keywords");
    if (stated && Object.hasOwn(row, "sparseSlot") && row.keywords !== keywords)
      throw new Error(keywordsDisagree(where, JSON.stringify(row.keywords)));
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      if (!old.includes(key)) out[key] = value;
      else if (key === old[0] && !stated) out.keywords = keywords;
    }
    dropped.push(profileDropped(where, old, out.keywords, stated));
    return out;
  };
  const vectors = (section) => {
    const kept = within(section, "profiles", isMap, (profiles) =>
      mapValues(profiles, (row, key) =>
        profile(row, `vectors.profiles.${key}`),
      ),
    );
    if (!Object.hasOwn(kept, "collections")) return kept;
    const { collections: _collections, ...rest } = kept;
    dropped.push(`vectors.collections: ${COLLECTIONS_DROPPED}`);
    return rest;
  };
  const table = (row, key) =>
    within(row, "uses", isMap, (uses) =>
      within(uses, "fields", Array.isArray, (fields) =>
        mapItems(fields, (field, index) =>
          within(field, "uses", Array.isArray, (list) =>
            mapItems(list, (use, position) => {
              if (
                !isMap(use) ||
                use.kind !== "search" ||
                !Object.hasOwn(use, "role")
              )
                return use;
              const { role: _role, ...rest } = use;
              dropped.push(
                roleDropped(
                  `tables.${key}.uses.fields[${index}].uses[${position}]`,
                  key,
                ),
              );
              return rest;
            }),
          ),
        ),
      ),
    );
  if (isMap(doc.flows)) {
    for (const [flowKey, flow] of Object.entries(doc.flows)) {
      if (!isMap(flow) || !isMap(flow.actions)) continue;
      for (const [actionKey, action] of Object.entries(flow.actions)) {
        if (isMap(action) && REMOVED_FUNCTIONS.has(action.functionKey))
          notes.push(
            removedFunctionNote(
              `flows.${flowKey}.actions.${actionKey}`,
              action.functionKey,
            ),
          );
      }
    }
  }
  const out = within(
    within(doc, "vectors", isMap, vectors),
    "tables",
    isMap,
    (tables) => mapValues(tables, table),
  );
  if (!isMap(out.vectors) || Object.keys(out.vectors).length > 0) return out;
  if (out.vectors === doc.vectors) return out; // written empty: the author's
  const { vectors: _vectors, ...rest } = out;
  dropped.push(`vectors: ${VECTORS_DROPPED}`);
  return rest;
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

const refuseTwoNames = (line, to, from) => {
  throw new Error(
    `line ${line}: this mapping holds two names for "${to}" (one of them "${from}"). Keep one and run this again.`,
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

const keyOf = (match) => match[2] ?? match[3] ?? match[4];
const columnOf = (match) => match[1].length;
const valueOf = (rest) => rest.replace(/\s+#.*$/, "").trim();
/** A one-line scalar without its quotes. */
const unquote = (value) => {
  const bare = /^(["'])(.*)\1$/.exec(value);
  return bare === null ? value : bare[2];
};

/**
 * The value of the key `name` in the mapping holding line `index` (its keys at
 * `column`), or null when it has none. A mapping that is a list item starts on
 * its `- ` line and ends before the next one, so the scan stops at both.
 */
const siblingValue = (lines, index, column, name) => {
  const scan = (step) => {
    // The item's own first line has nothing of this mapping above it.
    if (step === -1 && indentOf(lines[index]) < column) return null;
    for (let i = index + step; i >= 0 && i < lines.length; i += step) {
      const line = lines[i];
      if (line.trim() === "" || /^\s*#/.test(line)) continue;
      const indent = indentOf(line);
      const match = KEY_LINE.exec(line);
      const at = match === null ? indent : columnOf(match);
      // Going down, a shallower line (the next item's dash included) ends it.
      if (step === 1 && indent < column) return null;
      if (match !== null && at === column && keyOf(match) === name)
        return valueOf(match[6]);
      // Going up, the item's first line is the last one to look at.
      if (step === -1 && indent < column) return null;
    }
    return null;
  };
  return scan(-1) ?? scan(1);
};

/**
 * A YAML document, converted line by line: the indentation says where each
 * key sits, and the same rules as the JSON path say what it becomes. Comments
 * and layout are kept. A version 7 document is returned as it is.
 */
export function upgradeYaml(text, notes = [], dropped = []) {
  const stated = text
    .slice(text.charCodeAt(0) === 0xfeff ? 1 : 0)
    .split(/\r?\n/)
    .find((line) => TOP_VERSION.test(line));
  if (stated === undefined) {
    throw new Error(
      "not a project document: no top-level `kipory: <version>` line",
    );
  }
  const version = Number(TOP_VERSION.exec(stated)[3]);
  if (version === TARGET_VERSION) return text;
  const stages = stagesFrom(version);
  if (stages === null) {
    throw new Error(`${CONVERTS}; the document states ${version}`);
  }
  // Each step keeps every line where it is, so a line number one step lists
  // still names that line after the next — the search words too, which
  // remove lines only once every number is said.
  const renamed = stages.reduce(
    (held, stage) => stageYaml(held, stage, notes),
    text,
  );
  const bom = renamed.charCodeAt(0) === 0xfeff ? renamed[0] : "";
  const eol = renamed.includes("\r\n") ? "\r\n" : "\n";
  const lines = renamed.slice(bom.length).split(/\r?\n/);
  // The search words (version 5 → 6), once every step has run.
  const out = searchWordsYaml(lines, notes, dropped);
  notes.splice(0, notes.length, ...new Set(notes));
  return out === lines ? renamed : `${bom}${out.join(eol)}`;
}

/** One step over a YAML document. */
const stageYaml = (text, stage, notes) => {
  const { keyIn, under, textOf } = stage;
  const bom = text.charCodeAt(0) === 0xfeff ? text[0] : "";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.slice(bom.length).split(/\r?\n/);
  const versionLine = lines.findIndex((line) => TOP_VERSION.test(line));
  /**
   * The text the mapping holding line `index` (its keys at `column`) holds
   * under the key `name`, or undefined when it holds none there. A mapping
   * that is a list item starts on its `- ` line and ends before the next one,
   * so the scan stops at both.
   */
  const siblingText = (index, column, name) => {
    const scan = (step) => {
      // The item's own first line has nothing of this mapping above it.
      if (step === -1 && indentOf(lines[index]) < column) return undefined;
      for (let i = index + step; i >= 0 && i < lines.length; i += step) {
        const line = lines[i];
        if (line.trim() === "" || /^\s*#/.test(line)) continue;
        const indent = indentOf(line);
        const match = KEY_LINE.exec(line);
        const at = match === null ? indent : columnOf(match);
        // Going down, a shallower line (the next item's dash included) ends it.
        if (step === 1 && indent < column) return undefined;
        if (match !== null && at === column && keyOf(match) === name) {
          const value = valueOf(match[6]);
          const quoted = /^(["'])(.*)\1$/.exec(value);
          if (quoted !== null) return quoted[2];
          return isStringScalar(value) ? value : undefined;
        }
        // Going up, the item's first line is the last one to look at.
        if (step === -1 && indent < column) return undefined;
      }
      return undefined;
    };
    return scan(-1) ?? scan(1);
  };

  /** Text that is not a key's own one-line value: a body or continuation line. */
  const looseText = (line, policy, note) => {
    if (policy === null) return line;
    const moved = policy === "paths" ? stage.rewrite(line) : line;
    if (stage.needsAPerson(moved)) notes.push(note);
    return moved;
  };
  /** Whether a mapping of `mode` is rewritten or listed at all. */
  const live = (mode) => mode.name !== "untouched" || mode.text !== null;

  /**
   * Open keys met so far, innermost last: { column, key, mode (of its
   * children), policy (of its own text), names (of the mapping under it) }.
   */
  const stack = [];
  /** The new name of each key the top-level mapping has shown, by how it was written. */
  const rootNames = new Map();
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
        return `${head}${gap}${q2}${stage.to}${q2}${comment === undefined ? "" : ` ${comment}`}`;
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
    const sibling = (name) => siblingText(index, column, name);
    const to = keyIn(mode, key, sibling);
    const child = under(mode, key, sibling);
    const policy = textOf(mode, key);
    const rest = match[6];
    const value = valueOf(rest);
    const comment = rest.slice(rest.indexOf(value) + value.length);
    const quote =
      match[2] !== undefined ? '"' : match[3] !== undefined ? "'" : "";
    const head = `${match[1]}${quote}${to}${quote}${match[5]}`;
    const note = `line ${number} (${key})`;
    if (live(mode)) {
      // The keys of one mapping: a list item's start anew on its `- ` line.
      const holder = parent ?? { names: rootNames };
      if (match[1].includes("-")) holder.names = new Map();
      const first = holder.names.get(to);
      if (first !== undefined && first !== key)
        refuseTwoNames(number, to, to === key ? first : key);
      holder.names.set(to, first ?? key);
    }
    stack.push({
      column,
      key,
      mode: child,
      policy: policy ?? child.text,
      names: new Map(),
    });
    if (mode.text === "watch" && to === key && stage.watchedKey(key))
      notes.push(note);
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
      // This line's own key is read above; what the mapping holds is
      // rewritten only where the mode under the key says so.
      if (!flat && (live(child) || policy !== null))
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
    const { out: converted, listed } = textAt(stage, mode, key, plain, sibling);
    if (listed) notes.push(note);
    if (stage.slotNote(mode, key, plain))
      notes.push(`line ${number} (${RESOLVER_SLOT_NOTE})`);
    if (converted === plain) return `${head}${rest}`;
    const lead = /^\s*/.exec(rest)[0];
    const q = bare === null ? "" : bare[1];
    return `${head}${lead}${q}${converted}${q}${comment}`;
  });
  notes.splice(0, notes.length, ...new Set(notes));
  return `${bom}${out.join(eol)}`;
};

/**
 * Each line of a YAML text as structure: `null` for a blank line, a comment or
 * a document marker; `{ body: true }` for a line inside a scalar; otherwise
 * where the line sits — its indentation, the column of its key (or of its
 * list item), the key (`null` for a list item that is no mapping), its value,
 * and the keys above it with its own last.
 */
const outline = (lines) => {
  const stack = [];
  let scalar = null; // the column a block scalar's body is deeper than
  let quoted = null; // the quote a multi-line quoted scalar is waiting for
  return lines.map((line, index) => {
    if (quoted !== null) {
      if (closesQuote(line, quoted)) quoted = null;
      return { body: true };
    }
    if (line.trim() === "" || /^\s*#/.test(line)) return null;
    const indent = indentOf(line);
    if (scalar !== null) {
      if (indent > scalar) return { body: true };
      scalar = null;
    }
    if (/^\s*\t/.test(line)) refuse(index + 1, "a tab is used for indentation");
    if (/^(---|\.\.\.)(\s|$)|^%[A-Z]/.test(line)) return null;
    const match = KEY_LINE.exec(line);
    const item = match ?? /^(\s*(?:-\s+)*)(.*)$/.exec(line);
    const dashed = item[1].trim() !== "";
    const column = match !== null || dashed ? item[1].length : indent;
    while (stack.length > 0 && stack[stack.length - 1].column >= column)
      stack.pop();
    const key = match === null ? null : keyOf(match);
    const value = valueOf(match === null ? item[2] : match[6]);
    const path = stack.map((entry) => entry.key);
    if (key !== null) {
      path.push(key);
      stack.push({ column, key });
    }
    if (BLOCK_SCALAR.test(value)) scalar = key === null ? indent : column;
    else quoted = opensQuote(value);
    return { indent, column, dashed, key, value, path, match };
  });
};

const pathIs = (path, pattern) =>
  path.length === pattern.length &&
  pattern.every((part, index) => part === "*" || part === path[index]);
const USES_OF_A_FIELD = ["tables", "*", "uses", "fields", "uses"];
const NULL_SCALAR = /^(~|null|Null|NULL)?$/;

/**
 * The search words, line by line: the same removals as `searchWordsJson`,
 * made where the indentation says the member sits. Returns `lines` itself
 * when nothing is removed.
 */
function searchWordsYaml(lines, notes, dropped) {
  const rows = outline(lines);
  const gone = new Set();
  const put = new Map();
  /** A value that is one whole `{ … }` or `[ … ]` on its line. */
  const closedFlow = (value) => {
    const bare = unquoted(value);
    const count = (chars) =>
      [...bare].filter((char) => chars.includes(char)).length;
    return (
      /^[{[]/.test(bare) && /[}\]]$/.test(bare) && count("{[") === count("}]")
    );
  };
  /** The last line of what the key on line `index` holds. */
  const blockEnd = (index) => {
    const { column, value } = rows[index];
    let end = index;
    let inside = true; // whether the last line of structure seen was held
    for (let i = index + 1; i < lines.length; i += 1) {
      const row = rows[i];
      if (row === null) continue;
      if (row.body !== true) {
        inside =
          row.indent > column ||
          (value === "" && row.indent === column && row.dashed);
        if (!inside) break;
      }
      if (inside) end = i;
    }
    return end;
  };
  const remove = (from, to = from) => {
    for (let i = from; i <= to; i += 1) gone.add(i);
  };
  /** Remove the key on line `index` with everything it holds, or refuse. */
  const removeMember = (index) => {
    const { value, key } = rows[index];
    const end = blockEnd(index);
    if (value === "") return remove(index, end);
    if (/^[{[]/.test(value) && !closedFlow(value))
      refuse(
        index + 1,
        `\`${key}\` is a mapping or list left open on its line`,
      );
    if (/^[&*!|>]/.test(value) || opensQuote(value) !== null || end > index)
      refuse(
        index + 1,
        `\`${key}\` is written with an anchor, a tag or a value that runs over several lines`,
      );
    return remove(index);
  };
  const one = (index) => rows[index].match;
  const names = (words) => new RegExp(`(^|[\\s{,\\["'])(${words})["']?\\s*:`);

  const open = (index) =>
    refuse(index + 1, "a mapping or list is left open on its line");
  /** Whether `path` is on the way to a field's uses, or is them. */
  const towardsUses = (path) =>
    path.length <= USES_OF_A_FIELD.length &&
    pathIs(path, USES_OF_A_FIELD.slice(0, path.length));

  rows.forEach((row, index) => {
    if (row === null || row.body === true || gone.has(index)) return;
    const { key, value, path } = row;
    const flow = /^[{[]/.test(value);

    /* vectors: profiles' slot names, and the collections. */
    if (path[0] === "vectors" && key !== null) {
      if (/^[&*!]/.test(value) && path.length <= 3)
        refuse(index + 1, "an anchor, alias or tag is used under `vectors`");
      if (
        flow &&
        path.length <= 3 &&
        !pathIs(path, ["vectors", "collections"])
      ) {
        if (!closedFlow(value)) open(index);
        if (names("denseSlots|sparseSlot|collections").test(value))
          refuse(index + 1, "a mapping is written on one line");
      }
      if (pathIs(path, ["vectors", "collections"])) {
        removeMember(index);
        dropped.push(
          `line ${index + 1} (vectors.collections): ${COLLECTIONS_DROPPED}`,
        );
      }
      if (pathIs(path, ["vectors", "profiles", "*"]) && value === "") {
        const members = new Map();
        for (let i = index + 1; i < rows.length; i += 1) {
          const child = rows[i];
          if (child === null || child.body === true) continue;
          if (child.indent <= row.column) break;
          if (child.key !== null && child.path.length === 4)
            members.set(child.key, i);
        }
        const old = SLOT_MEMBERS.filter((member) => members.has(member));
        if (old.length > 0) {
          const where = `vectors.profiles.${key}`;
          let keywords = false;
          if (members.has("sparseSlot")) {
            const line = members.get("sparseSlot");
            const slot = rows[line].value;
            if (
              /^[{[&*!|>]/.test(slot) ||
              opensQuote(slot) !== null ||
              blockEnd(line) > line
            )
              refuse(
                line + 1,
                "`sparseSlot` is not written as one plain value",
              );
            keywords = !NULL_SCALAR.test(slot) && unquote(slot).trim() !== "";
          }
          const stated = members.has("keywords")
            ? rows[members.get("keywords")].value
            : null;
          if (
            stated !== null &&
            members.has("sparseSlot") &&
            unquote(stated).toLowerCase() !== String(keywords)
          )
            throw new Error(
              keywordsDisagree(
                `line ${members.get("keywords") + 1} (${where})`,
                stated,
              ),
            );
          const first = Math.min(...old.map((member) => members.get(member)));
          for (const member of old) removeMember(members.get(member));
          if (stated === null) {
            gone.delete(first);
            put.set(
              first,
              `${one(first)[1]}keywords${one(first)[5]} ${keywords}`,
            );
          }
          dropped.push(
            profileDropped(
              `line ${first + 1} (${where})`,
              old,
              stated ?? keywords,
              stated !== null,
            ),
          );
        }
      }
    }

    /* tables: a `search` use's role. */
    if (path[0] === "tables") {
      if (flow && towardsUses(path)) {
        if (!closedFlow(value)) open(index);
        if (names("role").test(value))
          refuse(index + 1, "a mapping is written on one line");
      }
      if (pathIs(path, [...USES_OF_A_FIELD, "role"])) {
        const kind = siblingValue(lines, index, row.column, "kind");
        if (kind !== null && unquote(kind) === "search") {
          if (
            value === "" ||
            /^[{[&*!|>]/.test(value) ||
            opensQuote(value) !== null ||
            blockEnd(index) > index
          )
            refuse(index + 1, "`role` is not written as one plain value");
          if (row.indent < row.column) {
            // `- role: x` opens the item: the next key takes the dash.
            const next = rows.findIndex(
              (r, i) =>
                i > index && r !== null && r.body !== true && !gone.has(i),
            );
            const lead = one(index)[1];
            if (
              next === -1 ||
              rows[next].column !== row.column ||
              rows[next].key === null ||
              lines[next].slice(0, lead.length).trim() !== ""
            )
              refuse(
                index + 1,
                "`role` opens a list item the script cannot re-open",
              );
            put.set(next, `${lead}${lines[next].slice(lead.length)}`);
          }
          remove(index);
          dropped.push(roleDropped(`line ${index + 1}`, path[1]));
        }
      }
    }

    /* flows: an action on a function that no longer exists. */
    if (
      pathIs(path, ["flows", "*", "actions", "*", "functionKey"]) &&
      REMOVED_FUNCTIONS.has(unquote(value))
    )
      notes.push(
        removedFunctionNote(
          `line ${index + 1} (flows.${path[1]}.actions.${path[3]})`,
          unquote(value),
        ),
      );
  });

  /* `vectors` with nothing left under it goes too: a key with no value is null. */
  const section = rows.findIndex(
    (row) =>
      row !== null &&
      row.body !== true &&
      row.key === "vectors" &&
      row.path.length === 1,
  );
  if (section !== -1 && rows[section].value === "" && gone.size > 0) {
    const kept = rows.some(
      (row, i) =>
        i > section &&
        row !== null &&
        row.body !== true &&
        row.path[0] === "vectors" &&
        row.path.length > 1 &&
        !gone.has(i),
    );
    const lost = [...gone].some((i) => rows[i]?.path?.[0] === "vectors");
    if (!kept && lost) {
      remove(section);
      dropped.push(`line ${section + 1} (vectors): ${VECTORS_DROPPED}`);
    }
  }
  if (gone.size === 0 && put.size === 0) return lines;
  return lines.flatMap((line, index) =>
    gone.has(index) ? [] : [put.get(index) ?? line],
  );
}

/** Convert a document given as text: JSON when it starts as JSON, YAML otherwise. */
export function upgradeDocumentText(text, notes = [], dropped = []) {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!/^\s*[{[]/.test(body)) return upgradeYaml(text, notes, dropped);
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new Error(
      `the file starts like JSON and does not parse as JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const converted = upgradeJson(parsed, notes, dropped);
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
  const dropped = [];
  let converted;
  try {
    converted = upgradeDocumentText(readFileSync(file, "utf8"), notes, dropped);
  } catch (error) {
    console.error(
      `upgrade-document: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
  if (flags.includes("--write")) writeFileSync(file, converted);
  else process.stdout.write(converted);
  if (dropped.length > 0) {
    console.error(
      [
        `upgrade-document: ${dropped.length} member(s) a document no longer carries were removed:`,
        ...dropped.map((line) => `  ${line}`),
      ].join("\n"),
    );
  }
  if (notes.length > 0) {
    console.error(
      [
        `upgrade-document: ${notes.length} place(s) this script does not rewrite — text that names a renamed field, or an action on a function that no longer exists. Edit each by hand:`,
        ...notes.map((note) => `  ${note}`),
      ].join("\n"),
    );
  }
}
