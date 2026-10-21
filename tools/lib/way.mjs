// The way: one person's harness, as data. `way.yaml` says who they are, which harnesses and
// connectors they use, which kinds of work (contexts) they do, and the ordered flow of
// steps through orient → intend → plan → make → check → record, plus the slow reflect loop
// and the lead/worker topology. Validation here is structural (GST-SCHEMA, GST-REF);
// the judgment rules live in lint.mjs.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseYaml } from "./yaml.mjs";
import {
  ALL_STAGES, HARNESSES, MECHANISMS, MODES, REF_RE, STAGES, TIERS, WHEN_RE, indexCatalog, loadCatalog,
} from "./catalog.mjs";

export const WAY_SCHEMA = "gestalt-way/1";
export const CONNECTOR_ROLES = ["tracker", "docs", "mail", "calendar", "chat", "publish", "code", "data", "files"];
// on_enter runs once per repo, in the order listed (set the repo up before working in it);
// daily, weekly and monthly are calendar rituals; as_needed ones wait for their moment (the
// focus shipped, the goals changed) and are run by name.
export const CADENCES = ["on_enter", "daily", "weekly", "monthly", "as_needed"];
export const DEFAULT_BUDGETS = {
  block_tokens: 450,
  protocol_rules: 3,
  unordered_blocking_per_event: 1,
  session_start_lines: 8,
  always_on_tokens: 12000,
  skills_per_context: 8,
  index: false,
};
const ENV_NAME_RE = /^[A-Z_][A-Z0-9_]*$/;
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const PLATFORM_RE = /^platform:[a-z0-9][a-z0-9-]*$/;

const TOP_KEYS = ["schema", "person", "harnesses", "writer", "connectors", "contexts", "flow", "stop_order", "links", "reflect", "budgets", "disable", "topology", "catalog", "taste", "waive", "profiles"];
const KEYS = {
  person: ["name", "roles", "goals", "pains"],
  connector: ["id", "ref", "role", "auth", "optional", "server", "note"],
  server: ["type", "url", "command", "args", "env"],
  context: ["when", "loadouts", "note"],
  step: ["use", "in", "mode", "enforce", "after", "parallel_with", "waive", "note"],
  waive: ["code", "reason"],
  wayWaive: ["code", "reason", "in"],
  link: ["from", "on", "to", "as", "via"],
  topology: ["tiers", "lead", "workers"],
  lead: ["keeps", "note"],
  worker: ["id", "tier", "mechanism", "uses", "route", "mcp", "returns", "note"],
  taste: ["id", "prompt", "context", "path", "expect", "expect_quiet"],
  profile: ["description", "flow", "reflect", "budgets", "offer"],
};

export function gestaltHome(env = process.env) {
  return env.GESTALT_HOME || join(homedir(), ".gestalt");
}

export function defaultWayPath(env = process.env) {
  return join(gestaltHome(env), "way.yaml");
}

const isMap = v => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = v => typeof v === "string" && v.trim().length > 0;
const list = v => (v == null ? [] : Array.isArray(v) ? v : [v]);

class Problems {
  constructor() { this.items = []; }
  add(code, where, message, severity = "error") { this.items.push({ code, severity, where, message }); }
  keys(obj, allowed, where) {
    if (!isMap(obj)) { this.add("GST-SCHEMA", where, "must be a map"); return false; }
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) this.add("GST-SCHEMA", where, `unknown key "${k}" (allowed: ${allowed.join(", ")})`);
    return true;
  }
}

/**
 * Validate and normalise a parsed way. Returns { way, catalog, problems } where `way` has
 * defaults filled in, every flow step resolved to its catalog step, and `contexts` ordered.
 */
export function normaliseWay(raw, { catalogDir, offer = false } = {}) {
  const p = new Problems();
  if (!p.keys(raw, TOP_KEYS, "way")) return { way: null, catalog: null, problems: p.items };
  if (raw.schema !== WAY_SCHEMA) p.add("GST-SCHEMA", "schema", `must be ${WAY_SCHEMA}`);

  const catalog = catalogDir === undefined
    ? loadCatalog({ extra: list(raw.catalog) })
    : loadCatalog({ dir: catalogDir, extra: list(raw.catalog) });
  for (const msg of catalog.problems) p.add("GST-SCHEMA", "catalog", msg);

  // person
  const person = raw.person ?? {};
  if (p.keys(person, KEYS.person, "person")) {
    if (!isStr(person.name)) p.add("GST-SCHEMA", "person.name", "required");
    const goals = list(person.goals);
    if (goals.length === 0) p.add("GST-SCHEMA", "person.goals", "at least one goal: a way with no goal cannot be judged");
    if (goals.length > 3) p.add("GST-SCHEMA", "person.goals", "at most three goals; more is a list, not a direction");
    for (const [i, g] of goals.entries()) {
      // A comma inside an unquoted flow-map value splits it into a stray key: catch it here.
      if (isMap(g)) p.keys(g, ["id", "text"], `person.goals[${i}]`);
      if (!isMap(g) || !ID_RE.test(g.id ?? "") || !isStr(g.text)) p.add("GST-SCHEMA", `person.goals[${i}]`, "needs an id and text");
    }
  }

  // harnesses and writer
  const harnesses = list(raw.harnesses);
  if (harnesses.length === 0) p.add("GST-SCHEMA", "harnesses", "name at least one harness");
  for (const h of harnesses) if (!HARNESSES.includes(h)) p.add("GST-SCHEMA", "harnesses", `"${h}" is not one of ${HARNESSES.join(", ")}`);
  const writer = raw.writer ?? "manual";
  if (!["kitctl", "manual"].includes(writer)) p.add("GST-SCHEMA", "writer", "must be kitctl or manual");

  // connectors
  const connectors = [];
  for (const [i, c] of list(raw.connectors).entries()) {
    const w = `connectors[${i}]`;
    if (!p.keys(c, KEYS.connector, w)) continue;
    if (!ID_RE.test(c.id ?? "")) p.add("GST-SCHEMA", `${w}.id`, "lowercase id required");
    if (!REF_RE.test(c.ref ?? "")) p.add("GST-SCHEMA", `${w}.ref`, `"${c.ref}" is not a kitctl ref`);
    if (!CONNECTOR_ROLES.includes(c.role)) p.add("GST-SCHEMA", `${w}.role`, `must be one of ${CONNECTOR_ROLES.join(", ")}`);
    if (c.auth != null && !ENV_NAME_RE.test(c.auth)) p.add("GST-SCHEMA", `${w}.auth`, "must be an environment variable NAME, never a value");
    if (c.server != null && p.keys(c.server, KEYS.server, `${w}.server`)) {
      for (const [k, v] of Object.entries(c.server.env ?? {})) {
        if (!/^\$\{[A-Z_][A-Z0-9_]*\}$/.test(String(v))) p.add("GST-SCHEMA", `${w}.server.env.${k}`, "must be an ${ENV} reference, never a literal");
      }
    }
    connectors.push({ optional: false, ...c });
  }

  // contexts
  const contexts = {};
  if (raw.contexts == null || !isMap(raw.contexts) || Object.keys(raw.contexts).length === 0) {
    p.add("GST-SCHEMA", "contexts", "define at least one context (e.g. everywhere: {when: always})");
  } else {
    for (const [name, ctx] of Object.entries(raw.contexts)) {
      const w = `contexts.${name}`;
      if (!ID_RE.test(name)) p.add("GST-SCHEMA", w, "context names are lowercase ids");
      if (!p.keys(ctx, KEYS.context, w)) continue;
      if (ctx.when !== "always" && !WHEN_RE.test(ctx.when ?? "")) p.add("GST-SCHEMA", `${w}.when`, "must be always or file-exists:PATH");
      contexts[name] = { when: ctx.when, loadouts: list(ctx.loadouts), note: ctx.note };
    }
    if (!Object.values(contexts).some(c => c.when === "always")) p.add("GST-SCHEMA", "contexts", "one context must be `when: always` (what applies everywhere)");
  }
  const contextNames = Object.keys(contexts);

  // flow
  const flow = [];
  const flowRaw = raw.flow ?? {};
  if (p.keys(flowRaw, STAGES, "flow")) {
    for (const stage of STAGES) {
      for (const [i, s] of list(flowRaw[stage]).entries()) {
        const w = `flow.${stage}[${i}]`;
        if (!p.keys(s, KEYS.step, w)) continue;
        const cat = catalog.steps.get(s.use);
        if (!cat) { p.add("GST-REF", w, `"${s.use}" is not a catalog step (add a catalog: entry to the way for unknown primitives)`); continue; }
        if (cat.stage !== stage) p.add("GST-ORDER", w, `${s.use} serves the ${cat.stage} stage, not ${stage}`);
        const mode = s.mode ?? cat.mode;
        if (!MODES.includes(mode)) p.add("GST-SCHEMA", `${w}.mode`, `must be one of ${MODES.join(", ")}`);
        const enforce = s.enforce ?? "none";
        if (!["none", "hook"].includes(enforce)) p.add("GST-SCHEMA", `${w}.enforce`, "must be none or hook");
        const inCtx = s.in == null ? contextNames : list(s.in);
        for (const c of inCtx) if (!contexts[c]) p.add("GST-REF", `${w}.in`, `unknown context "${c}"`);
        if (s.waive != null) p.keys(s.waive, KEYS.waive, `${w}.waive`);
        for (const wv of list(s.waive)) if (!isStr(wv.reason) || wv.reason.length < 12) p.add("GST-SCHEMA", `${w}.waive`, "a waiver needs a stated reason (12+ characters)");
        flow.push({
          use: s.use, stage, mode, enforce, in: inCtx, after: list(s.after), parallel_with: list(s.parallel_with),
          waive: list(s.waive), note: s.note, step: cat, entry: cat.entry, where: w,
        });
      }
    }
  }
  const flowIds = new Set(flow.map(f => f.use));
  for (const f of flow) {
    for (const ref of [...f.after, ...f.parallel_with]) if (!flowIds.has(ref)) p.add("GST-REF", f.where, `"${ref}" is not a step in this flow`);
  }
  const dup = flow.map(f => f.use).filter((u, i, a) => a.indexOf(u) !== i);
  for (const d of new Set(dup)) p.add("GST-SCHEMA", "flow", `${d} appears twice; give it one place and use \`in\` for contexts`);

  // reflect
  const reflect = {};
  const reflectRaw = raw.reflect ?? {};
  if (p.keys(reflectRaw, CADENCES, "reflect")) {
    for (const cadence of CADENCES) {
      reflect[cadence] = [];
      // An item is a step id, or {use, in} when the ritual belongs to one kind of repo
      // (a roadmap cycle runs in roadmap repos, so it must not load roadmap everywhere).
      for (const item of list(reflectRaw[cadence])) {
        const id = typeof item === "string" ? item : item?.use;
        const inCtx = typeof item === "string" || item?.in == null ? contextNames : list(item.in);
        for (const c of inCtx) if (!contexts[c]) p.add("GST-REF", `reflect.${cadence}`, `unknown context "${c}"`);
        const cat = catalog.steps.get(id);
        if (!cat) p.add("GST-REF", `reflect.${cadence}`, `"${id}" is not a catalog step`);
        else if (cat.stage !== "reflect") p.add("GST-ORDER", `reflect.${cadence}`, `${id} serves ${cat.stage}, not reflect; in-session steps go in flow`);
        else reflect[cadence].push({ use: id, in: inCtx, step: cat, entry: cat.entry });
      }
    }
  }

  // stop order, links
  const stepIds = new Set([...flowIds, ...Object.values(reflect).flat().map(r => r.use)]);
  const stopOrder = list(raw.stop_order);
  // A Stop gate can come from a plugin hook whose step is not in the flow (it fires anyway),
  // so stop_order accepts any step of a primitive the flow uses.
  const usedEntries = new Set(flow.map(f => f.entry.id));
  for (const s of stopOrder) {
    const cat = catalog.steps.get(s);
    if (!flowIds.has(s) && !PLATFORM_RE.test(s) && !(cat && usedEntries.has(cat.entry.id))) p.add("GST-REF", "stop_order", `"${s}" is neither a step of a primitive in this flow nor platform:<name>`);
  }
  const links = [];
  for (const [i, l] of list(raw.links).entries()) {
    const w = `links[${i}]`;
    if (!p.keys(l, KEYS.link, w)) continue;
    if (!stepIds.has(l.from)) p.add("GST-REF", `${w}.from`, `"${l.from}" is not a step in this way`);
    if (l.to !== "user" && !stepIds.has(l.to)) p.add("GST-REF", `${w}.to`, `"${l.to}" is not a step in this way (or "user")`);
    if (!isStr(l.on)) p.add("GST-SCHEMA", `${w}.on`, "name the event (e.g. REFRAME, shareable, done)");
    const via = l.via ?? "manual";
    if (!["instruction", "manual"].includes(via)) p.add("GST-SCHEMA", `${w}.via`, "must be instruction or manual");
    links.push({ ...l, via, where: w });
  }

  // budgets, disable
  const budgets = { ...DEFAULT_BUDGETS };
  if (raw.budgets != null && p.keys(raw.budgets, Object.keys(DEFAULT_BUDGETS), "budgets")) Object.assign(budgets, raw.budgets);
  const disable = {};
  if (raw.disable != null && isMap(raw.disable)) {
    for (const [ctx, refs] of Object.entries(raw.disable)) {
      if (!contexts[ctx]) p.add("GST-REF", `disable.${ctx}`, `unknown context "${ctx}"`);
      disable[ctx] = list(refs);
      for (const r of disable[ctx]) if (!REF_RE.test(r)) p.add("GST-SCHEMA", `disable.${ctx}`, `"${r}" is not a kitctl ref`);
    }
  }

  // way-level waivers: for context-level codes (budgets, the lead's load) that no single
  // step owns. Each needs the person's reason and stays visible in WAY.md.
  const waive = [];
  for (const [i, w] of list(raw.waive).entries()) {
    const where = `waive[${i}]`;
    if (!p.keys(w, KEYS.wayWaive, where)) continue;
    if (!["GST-BUDGET", "GST-LEAD", "GST-HARNESS", "GST-TIER"].includes(w.code)) p.add("GST-SCHEMA", `${where}.code`, "way-level waivers cover GST-BUDGET, GST-LEAD, GST-HARNESS and GST-TIER; waive a step's own code on the step");
    if (!isStr(w.reason) || w.reason.length < 12) p.add("GST-SCHEMA", `${where}.reason`, "a waiver needs a stated reason (12+ characters)");
    for (const c of list(w.in)) if (!contexts[c]) p.add("GST-REF", `${where}.in`, `unknown context "${c}"`);
    waive.push({ code: w.code, reason: w.reason, in: list(w.in) });
  }

  // topology
  const topology = { tiers: {}, lead: { keeps: [] }, workers: [] };
  if (raw.topology != null && p.keys(raw.topology, KEYS.topology, "topology")) {
    const t = raw.topology;
    for (const [h, map] of Object.entries(t.tiers ?? {})) {
      if (!HARNESSES.includes(h)) p.add("GST-SCHEMA", `topology.tiers.${h}`, "unknown harness");
      else if (!isMap(map)) p.add("GST-SCHEMA", `topology.tiers.${h}`, "map tier → model id");
      else for (const tier of Object.keys(map)) if (!TIERS.includes(tier) || tier === "script") p.add("GST-SCHEMA", `topology.tiers.${h}.${tier}`, "tiers are lead, worker, critic (script needs no model)");
      topology.tiers[h] = isMap(map) ? map : {};
    }
    if (t.lead != null && p.keys(t.lead, KEYS.lead, "topology.lead")) topology.lead = { keeps: list(t.lead.keeps), note: t.lead.note };
    for (const id of topology.lead.keeps) if (!flowIds.has(id)) p.add("GST-REF", "topology.lead.keeps", `"${id}" is not a flow step`);
    const seen = new Set();
    for (const [i, wk] of list(t.workers).entries()) {
      const w = `topology.workers[${i}]`;
      if (!p.keys(wk, KEYS.worker, w)) continue;
      if (!ID_RE.test(wk.id ?? "")) p.add("GST-SCHEMA", `${w}.id`, "lowercase id required");
      if (seen.has(wk.id)) p.add("GST-SCHEMA", `${w}.id`, `duplicate worker ${wk.id}`);
      seen.add(wk.id);
      if (!TIERS.includes(wk.tier)) p.add("GST-SCHEMA", `${w}.tier`, `must be one of ${TIERS.join(", ")}`);
      if (!MECHANISMS.includes(wk.mechanism)) p.add("GST-SCHEMA", `${w}.mechanism`, `must be one of ${MECHANISMS.join(", ")}`);
      for (const u of list(wk.uses)) if (!stepIds.has(u)) p.add("GST-REF", `${w}.uses`, `"${u}" is not a step in this way`);
      for (const m of list(wk.mcp)) if (!connectors.some(c => c.id === m)) p.add("GST-REF", `${w}.mcp`, `"${m}" is not a connector in this way`);
      topology.workers.push({ ...wk, uses: list(wk.uses), mcp: list(wk.mcp), where: w });
    }
  }

  // taste
  const taste = [];
  const tasteRaw = list(raw.taste);
  if (tasteRaw.length !== 3) p.add("GST-SCHEMA", "taste", `exactly three taste prompts (found ${tasteRaw.length}): enough to cover different paths, few enough to actually run`);
  for (const [i, t] of tasteRaw.entries()) {
    const w = `taste[${i}]`;
    if (!p.keys(t, KEYS.taste, w)) continue;
    if (!ID_RE.test(t.id ?? "")) p.add("GST-SCHEMA", `${w}.id`, "lowercase id required");
    if (!isStr(t.prompt)) p.add("GST-SCHEMA", `${w}.prompt`, "required");
    if (!contexts[t.context]) p.add("GST-REF", `${w}.context`, `unknown context "${t.context}"`);
    for (const s of list(t.path)) if (!STAGES.includes(s)) p.add("GST-SCHEMA", `${w}.path`, `"${s}" is not an in-session stage`);
    for (const q of [...list(t.expect), ...list(t.expect_quiet)]) if (!flowIds.has(q)) p.add("GST-REF", `${w}.expect`, `"${q}" is not a flow step`);
    taste.push({ ...t, path: list(t.path), expect: list(t.expect), expect_quiet: list(t.expect_quiet) });
  }

  const way = {
    schema: raw.schema, person: { roles: [], pains: [], ...person, goals: list(person.goals) }, harnesses, writer,
    connectors, contexts, flow, reflect, stop_order: stopOrder, links, budgets, disable, topology, taste,
    catalog: list(raw.catalog), waive, offer, profiles: [],
  };

  // profiles: named variants of the way (a lean default and a fuller one, say). A profile adds
  // flow steps and rituals, may override budgets, and can turn on `offer`; it is the way with those
  // changes, validated and linted as a whole, and kitctl applies it as `gestalt-<x>:<name>`.
  if (raw.profiles != null && !isMap(raw.profiles)) p.add("GST-SCHEMA", "profiles", "must be a map of name → profile");
  else for (const [name, pr] of Object.entries(raw.profiles ?? {})) {
    const w = `profiles.${name}`;
    if (!ID_RE.test(name)) p.add("GST-SCHEMA", w, "profile names are lowercase ids");
    if (!p.keys(pr, KEYS.profile, w)) continue;
    if (!isStr(pr.description)) p.add("GST-SCHEMA", `${w}.description`, "say what this profile adds, in one line");
    if (pr.offer != null && typeof pr.offer !== "boolean") p.add("GST-SCHEMA", `${w}.offer`, "must be true or false");
    const merged = { ...raw, budgets: { ...(raw.budgets ?? {}), ...(pr.budgets ?? {}) } };
    delete merged.profiles;
    for (const [key, slots] of [["flow", STAGES], ["reflect", CADENCES]]) {
      if (pr[key] == null) continue;
      if (!p.keys(pr[key], slots, `${w}.${key}`)) continue;
      merged[key] = { ...(raw[key] ?? {}) };
      for (const s of slots) if (pr[key][s] != null) merged[key][s] = [...list(raw[key]?.[s]), ...list(pr[key][s])];
    }
    const sub = normaliseWay(merged, { catalogDir, offer: pr.offer === true });
    // Report only what the profile itself introduces; the base's own problems are already listed.
    const seen = new Set(p.items.map(x => `${x.code}|${x.where}|${x.message}`));
    for (const x of sub.problems) if (!seen.has(`${x.code}|${x.where}|${x.message}`)) p.add(x.code, `${w}: ${x.where}`, x.message, x.severity);
    if (sub.way) way.profiles.push({ name, description: pr.description, way: sub.way });
  }
  return { way, catalog, problems: p.items };
}

export function readWay(path, opts = {}) {
  if (!existsSync(path)) return { way: null, catalog: null, problems: [{ code: "GST-SCHEMA", severity: "error", where: path, message: "no way.yaml here; run /gestalt:way to create one" }] };
  let raw;
  try {
    raw = parseYaml(readFileSync(path, "utf8"));
  } catch (e) {
    return { way: null, catalog: null, problems: [{ code: "GST-SCHEMA", severity: "error", where: path, message: e.message }] };
  }
  return normaliseWay(raw, opts);
}

/**
 * Scenarios: the sets of contexts that can be active together. Every `always` context is
 * always on; each other context adds to them one at a time (a repo that matches two marker
 * files is a rare case lint does not try to enumerate).
 */
export function scenarios(way) {
  const always = Object.entries(way.contexts).filter(([, c]) => c.when === "always").map(([n]) => n);
  const others = Object.entries(way.contexts).filter(([, c]) => c.when !== "always").map(([n]) => n);
  return [{ name: always.join("+") || "base", active: always }, ...others.map(n => ({ name: n, active: [...always, n] }))];
}

/** Flow steps active in a scenario, in stage order (stable within a stage). */
export function activeSteps(way, scenario) {
  return way.flow.filter(f => f.in.some(c => scenario.active.includes(c)));
}

/** Catalog entries a scenario loads, honouring `disable` for its active contexts. */
export function activeEntries(way, scenario) {
  const disabled = new Set(scenario.active.flatMap(c => way.disable[c] ?? []));
  const entries = new Map();
  for (const f of activeSteps(way, scenario)) if (!disabled.has(f.entry.ref)) entries.set(f.entry.id, f.entry);
  for (const r of activeRituals(way, scenario)) if (!disabled.has(r.entry.ref)) entries.set(r.entry.id, r.entry);
  return [...entries.values()];
}

/** Reflect items that belong to a scenario's contexts. */
export function activeRituals(way, scenario) {
  return Object.values(way.reflect).flat().filter(r => r.in.some(c => scenario.active.includes(c)));
}

/** Which worker (if any) performs a step. */
export function workerFor(way, stepId) {
  return way.topology.workers.find(w => w.uses.includes(stepId)) ?? null;
}

/**
 * Entries the LEAD loads in a scenario. An entry whose every active step is performed by a
 * headless worker is not loaded in the lead at all (the worker loads it with --plugin-dir).
 * A subagent does not hide skills (they must be enabled to preload), so it saves nothing
 * here; it isolates MCP connections and the model tier instead.
 */
export function leadEntries(way, scenario) {
  const steps = activeSteps(way, scenario);
  return activeEntries(way, scenario).filter(entry => {
    if (entry.kind === "connector") return !way.topology.workers.some(w => w.mechanism !== "script" && w.mcp.includes(entry.id) && connectorIsolated(way, entry.id));
    const mine = [...steps.filter(f => f.entry.id === entry.id).map(f => f.use), ...activeRituals(way, scenario).filter(r => r.entry.id === entry.id).map(r => r.use)];
    if (mine.length === 0) return true;
    return !mine.every(id => workerFor(way, id)?.mechanism === "headless");
  });
}

/** A connector is isolated from the lead only when a worker defines its server inline. */
export function connectorIsolated(way, connectorId) {
  const c = way.connectors.find(x => x.id === connectorId);
  return Boolean(c?.server);
}
