// The catalog: sequencing facts about primitives, keyed by kitctl ref. It holds only what
// kitctl does not: which stage a primitive serves, how it is invoked, which hooks it
// registers and whether they block, what it costs always-on, and what it can feed.
// Unknown primitives still work: a way can carry its own entries (marked confidence: guess).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./yaml.mjs";

export const CATALOG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "catalog");
export const CATALOG_SCHEMA = "gestalt-catalog/1";

/** Session stages in order. `reflect` is the slow loop (daily/weekly), never in-session. */
export const STAGES = ["orient", "intend", "plan", "make", "check", "record"];
export const ALL_STAGES = [...STAGES, "reflect"];

/** What may sit at each stage. A generator downstream of a checker breaks the flow. */
export const STAGE_KINDS = {
  orient: ["orienter"],
  intend: ["guard", "planner"],
  plan: ["planner", "reviewer", "investigator"],
  make: ["author", "transformer", "investigator"],
  check: ["gate", "reviewer"],
  record: ["recorder"],
  reflect: ["ritual", "reviewer", "recorder", "planner"],
};
export const STEP_KINDS = [...new Set(Object.values(STAGE_KINDS).flat())];
export const GENERATOR_KINDS = ["author", "transformer", "planner"];
export const CHECKER_KINDS = ["gate", "reviewer"];
export const ENTRY_KINDS = ["plugin", "skill", "tool", "connector", "manager", "platform"];

/**
 * Invocation modes, weakest first (vonnegut docs/wiring.md, plus `ambient` for a hook that
 * fires without the model choosing). Every step up costs context on every turn.
 */
export const MODES = ["ambient", "dispatcher", "explicit", "protocol"];
export const HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SubagentStop", "SessionEnd"];
export const HOOK_MECHANISMS = ["exit-2", "decision-block", "permission-decision", "context", "none"];
export const HARNESSES = ["claude", "codex", "cursor", "agents-md"];
export const ENFORCEMENT = ["enforced", "partial", "advisory", "none"];
export const TIERS = ["lead", "worker", "critic", "script"];
export const MECHANISMS = ["subagent", "headless", "agent-file", "script"];

// Mirrors kitctl/src/kitctl/model.py so a catalog ref is a valid kitctl ref.
const SEGMENT = "[a-z0-9](?:[a-z0-9._-]{0,62})";
export const KIT_KINDS = ["skill", "mcp", "hook", "plugin", "marketplace", "tool"];
export const REF_RE = new RegExp(`^(${KIT_KINDS.join("|")}):((?:${SEGMENT}/)?${SEGMENT})$`);
export const SLOT_RE = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
export const WHEN_RE = /^file-exists:(.+)$/;
export const STEP_ID_RE = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/;
export const ENTRY_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

const ENTRY_KEYS = new Set(["schema", "id", "ref", "kind", "title", "summary", "version_seen", "source", "install", "slot", "steps", "hooks", "knobs", "harness", "cost", "mcp", "feeds", "worker", "exclusive_of", "confidence", "notes"]);
const STEP_KEYS = new Set(["id", "stage", "kind", "mode", "invoke", "wiring_marker", "fallback", "when", "note"]);
const HOOK_KEYS = new Set(["event", "matcher", "blocking", "mechanism", "opt_in", "honours_stop_hook_active", "serves", "lines", "quiet_unless", "once_per_session", "note"]);
const KNOB_KEYS = new Set(["file", "scope", "key", "default", "change_with", "loosening"]);
const COST_KEYS = new Set(["skills", "agents", "commands", "listing_tokens", "session_start_lines", "measured_from", "wiring_lines"]);
const MCP_KEYS = new Set(["servers", "tools", "note"]);
const FEED_KEYS = new Set(["on", "to", "as", "status"]);
const WORKER_KEYS = new Set(["tier", "mechanism"]);

function unknown(obj, allowed, where, problems) {
  for (const k of Object.keys(obj ?? {})) if (!allowed.has(k)) problems.push(`${where}: unknown key "${k}"`);
}
const isStr = v => typeof v === "string" && v.length > 0;

/** Validate one entry. Returns a list of problems (empty when valid). */
export function validateEntry(entry, where = entry?.id ?? "entry") {
  const problems = [];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [`${where}: not a map`];
  unknown(entry, ENTRY_KEYS, where, problems);
  if (entry.schema !== undefined && entry.schema !== CATALOG_SCHEMA) problems.push(`${where}: schema must be ${CATALOG_SCHEMA}`);
  if (!isStr(entry.id) || !ENTRY_ID_RE.test(entry.id)) problems.push(`${where}: id must match ${ENTRY_ID_RE}`);
  if (!isStr(entry.ref) || !REF_RE.test(entry.ref)) problems.push(`${where}: ref "${entry.ref}" is not a kitctl ref (kind:name)`);
  if (!ENTRY_KINDS.includes(entry.kind)) problems.push(`${where}: kind must be one of ${ENTRY_KINDS.join(", ")}`);
  if (entry.slot != null && !SLOT_RE.test(entry.slot)) problems.push(`${where}: slot "${entry.slot}" is not a kitctl slot name`);
  if (entry.confidence != null && !["verified", "guess"].includes(entry.confidence)) problems.push(`${where}: confidence must be verified or guess`);

  const stepIds = new Set();
  for (const [i, step] of (entry.steps ?? []).entries()) {
    const w = `${where}.steps[${i}]`;
    unknown(step, STEP_KEYS, w, problems);
    if (!isStr(step.id) || !STEP_ID_RE.test(step.id)) problems.push(`${w}: id must look like entry.step`);
    else if (!step.id.startsWith(`${entry.id}.`)) problems.push(`${w}: id "${step.id}" must start with "${entry.id}."`);
    if (stepIds.has(step.id)) problems.push(`${w}: duplicate step id ${step.id}`);
    stepIds.add(step.id);
    if (!ALL_STAGES.includes(step.stage)) problems.push(`${w}: stage must be one of ${ALL_STAGES.join(", ")}`);
    else if (!STAGE_KINDS[step.stage].includes(step.kind)) problems.push(`${w}: kind "${step.kind}" cannot sit at stage ${step.stage} (allowed: ${STAGE_KINDS[step.stage].join(", ")})`);
    if (!MODES.includes(step.mode)) problems.push(`${w}: mode must be one of ${MODES.join(", ")}`);
    if (step.when != null && !WHEN_RE.test(step.when)) problems.push(`${w}: when must be file-exists:PATH`);
    if (step.fallback != null) {
      if (typeof step.fallback !== "object") problems.push(`${w}: fallback must map harness → instruction`);
      else for (const h of Object.keys(step.fallback)) if (!HARNESSES.includes(h)) problems.push(`${w}: fallback harness "${h}" unknown`);
    }
  }
  for (const [i, hook] of (entry.hooks ?? []).entries()) {
    const w = `${where}.hooks[${i}]`;
    unknown(hook, HOOK_KEYS, w, problems);
    if (!HOOK_EVENTS.includes(hook.event)) problems.push(`${w}: event must be one of ${HOOK_EVENTS.join(", ")}`);
    if (typeof hook.blocking !== "boolean") problems.push(`${w}: blocking must be true or false`);
    if (hook.mechanism != null && !HOOK_MECHANISMS.includes(hook.mechanism)) problems.push(`${w}: mechanism must be one of ${HOOK_MECHANISMS.join(", ")}`);
    if (hook.blocking && !hook.mechanism) problems.push(`${w}: a blocking hook names its mechanism`);
    if (hook.serves != null && !stepIds.has(hook.serves)) problems.push(`${w}: serves "${hook.serves}" is not a step of ${entry.id}`);
    if (hook.quiet_unless != null && !WHEN_RE.test(hook.quiet_unless)) problems.push(`${w}: quiet_unless must be file-exists:PATH`);
  }
  for (const [i, knob] of (entry.knobs ?? []).entries()) unknown(knob, KNOB_KEYS, `${where}.knobs[${i}]`, problems);
  if (entry.harness != null) {
    for (const [h, level] of Object.entries(entry.harness)) {
      if (!HARNESSES.includes(h)) problems.push(`${where}.harness: unknown harness "${h}"`);
      if (!ENFORCEMENT.includes(level)) problems.push(`${where}.harness.${h}: must be one of ${ENFORCEMENT.join(", ")}`);
    }
  } else problems.push(`${where}: harness enforcement is required (never leave portability implicit)`);
  if (entry.cost != null) unknown(entry.cost, COST_KEYS, `${where}.cost`, problems);
  if (entry.mcp != null) unknown(entry.mcp, MCP_KEYS, `${where}.mcp`, problems);
  for (const [i, feed] of (entry.feeds ?? []).entries()) {
    unknown(feed, FEED_KEYS, `${where}.feeds[${i}]`, problems);
    if (!["built", "proposed"].includes(feed.status)) problems.push(`${where}.feeds[${i}]: status must be built or proposed`);
  }
  if (entry.worker != null) {
    unknown(entry.worker, WORKER_KEYS, `${where}.worker`, problems);
    if (!TIERS.includes(entry.worker.tier)) problems.push(`${where}.worker.tier must be one of ${TIERS.join(", ")}`);
    if (!MECHANISMS.includes(entry.worker.mechanism)) problems.push(`${where}.worker.mechanism must be one of ${MECHANISMS.join(", ")}`);
  }
  return problems;
}

/**
 * Load catalog entries from a directory, plus any way-local entries. Returns
 * { entries: Map id→entry, steps: Map stepId→{...step, entry}, byRef: Map ref→entry, problems }.
 */
export function loadCatalog({ dir = CATALOG_DIR, extra = [] } = {}) {
  const problems = [];
  const list = [];
  if (existsSync(dir)) {
    for (const file of readdirSync(dir).filter(f => f.endsWith(".yaml")).sort()) {
      let entry;
      try {
        entry = parseYaml(readFileSync(join(dir, file), "utf8"));
      } catch (e) {
        problems.push(`${file}: ${e.message}`);
        continue;
      }
      if (entry?.id !== basename(file, ".yaml")) problems.push(`${file}: id must equal the file name`);
      list.push({ ...entry, origin: `catalog/${file}` });
    }
  }
  for (const entry of extra) list.push({ ...entry, origin: "way" });
  return indexCatalog(list, problems);
}

export function indexCatalog(list, problems = []) {
  const entries = new Map();
  const steps = new Map();
  const byRef = new Map();
  for (const entry of list) {
    const { origin, ...bare } = entry;
    problems.push(...validateEntry(bare, `${origin}:${entry.id}`));
    if (entries.has(entry.id)) {
      // A way-local entry may override a shipped one (newer facts about the user's install).
      if (origin !== "way") problems.push(`${entry.id}: defined twice`);
    }
    entries.set(entry.id, entry);
    if (byRef.has(entry.ref) && byRef.get(entry.ref).id !== entry.id) problems.push(`${entry.ref}: claimed by ${byRef.get(entry.ref).id} and ${entry.id}`);
    byRef.set(entry.ref, entry);
  }
  for (const entry of entries.values()) {
    for (const step of entry.steps ?? []) steps.set(step.id, { ...step, entry });
  }
  return { entries, steps, byRef, problems };
}

/** Hooks of an entry that serve (or default to) a given step. */
export function hooksFor(entry, stepId) {
  return (entry.hooks ?? []).filter(h => h.serves === stepId);
}
