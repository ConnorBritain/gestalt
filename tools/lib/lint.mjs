// Lint: the judgment rules over a normalised way. Pure function of (way, catalog, survey?).
// Every code is stable and has a planted-defect fixture in tests/fixtures/lint/.
//
//   GST-SCHEMA / GST-REF   structure (from way.mjs)
//   GST-ORDER              a step at the wrong stage, or `after` pointing downstream
//   GST-INVOKE             a checker or recorder hands control back to a generator
//   GST-LINK               a backward or cyclic hand-off inside the session
//   GST-RECORDER-BLOCKS    a record step whose hook blocks the turn
//   GST-GATE               unordered blocking hooks on one event in one context
//   GST-SLOT               two generators for one slot in one context
//   GST-PROTOCOL           protocol mode on a non-reviewer (sharpen the description instead)
//   GST-BUDGET             block, protocol-rule or session-start budget exceeded
//   GST-LEAD               the lead's always-on load over budget
//   GST-HARNESS            a gate the harness can only advise
//   GST-TIER               a tier with no model on a harness that needs one
//   GST-WORKER             a worker that cannot deliver what it claims
//   GST-TRIGGER            an aggressive description that will fire on everything (survey)
//   GST-PROFILE            a profile that loads a primitive the base way does not
//   GST-SETTING            a way setting no catalog knob declares, or a value it does not allow (from way.mjs)
//
// Blocking is judged on the lead's primary harness (the first the way lists): that is where
// GST-GATE and GST-RECORDER-BLOCKS count. A hook a way setting unblocks there no longer
// counts; where it still blocks on another harness, lint says so as info, and the block keeps
// it in its Stop order because the block is shared by every harness.
import { CHECKER_KINDS, GENERATOR_KINDS, STAGES } from "./catalog.mjs";
import { activeEntries, activeSteps, blockingHarnesses, hookBlocks, leadEntries, primaryHarness, scenarios, settingValue, workerFor } from "./way.mjs";

const stageIndex = s => (s === "reflect" ? STAGES.length : STAGES.indexOf(s));

export const CODES = ["GST-SCHEMA", "GST-REF", "GST-ORDER", "GST-INVOKE", "GST-LINK", "GST-RECORDER-BLOCKS", "GST-GATE", "GST-SLOT", "GST-PROTOCOL", "GST-BUDGET", "GST-LEAD", "GST-HARNESS", "GST-TIER", "GST-WORKER", "GST-TRIGGER", "GST-PROFILE", "GST-SETTING"];

/**
 * Whether a hook fires in a scenario. A hook with no opt-in fires wherever its plugin is
 * enabled, whether or not the way lists its step: leaving the step out does not switch it
 * off. A hook with an opt-in file fires only where the way switches it on, which is where
 * its step is active and hook-backed (enforce: hook, or an ambient step that is the hook).
 * SETUP.md says "create" for exactly these and "leave off" for the rest.
 */
export function hookFires(hook, active) {
  if (!hook.serves) return true;
  const f = active.get(hook.serves);
  if (!hook.opt_in) return true;
  return Boolean(f && (f.enforce === "hook" || f.mode === "ambient"));
}

/**
 * User-owned blocking hooks of the active entries in a scenario, by event, on one harness
 * (the lead's primary harness by default; "any" for those that block on at least one).
 */
export function blockingHooks(way, scenario, harness = primaryHarness(way)) {
  const steps = activeSteps(way, scenario);
  const active = new Map(steps.map(f => [f.use, f]));
  const out = {};
  for (const entry of activeEntries(way, scenario)) {
    for (const hook of entry.hooks ?? []) {
      if (!hookBlocks(way, entry, hook, harness)) continue;
      if (!hookFires(hook, active)) continue;
      if (hook.quiet_unless && !scenario.active.some(c => way.contexts[c].when === hook.quiet_unless)) continue;
      (out[hook.event] ??= []).push({ entry: entry.id, serves: hook.serves ?? null, mechanism: hook.mechanism, opt_in: hook.opt_in ?? null, implicit: Boolean(hook.serves && !active.has(hook.serves)) });
    }
  }
  return out;
}

/** Lines injected at session start in a scenario, per orienter. */
export function sessionStartLines(way, scenario) {
  const out = [];
  const active = new Map(activeSteps(way, scenario).map(f => [f.use, f]));
  for (const entry of activeEntries(way, scenario)) {
    for (const hook of entry.hooks ?? []) {
      if (hook.event !== "SessionStart" || !hook.lines) continue;
      if (!hookFires(hook, active)) continue;
      if (hook.quiet_unless && !scenario.active.some(c => way.contexts[c].when === hook.quiet_unless)) continue;
      out.push({ entry: entry.id, lines: hook.lines });
    }
  }
  return out;
}

/**
 * Protocol rules a scenario puts in the always-on instruction files: one per distinct
 * wiring snippet of a protocol-mode step, one per instruction link, one for the Stop order
 * when it orders two or more gates, one per harness fallback line.
 */
export function protocolRules(way, scenario) {
  const steps = activeSteps(way, scenario);
  const rules = [];
  const seen = new Set();
  for (const f of steps.filter(s => s.mode === "protocol")) {
    const key = `${f.entry.id}|${f.step.wiring_marker ?? f.use}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({ kind: "protocol", ref: f.use, text: f.step.wiring_marker ? `${f.entry.title} snippet` : f.use });
  }
  const ids = new Set(steps.map(s => s.use));
  for (const l of way.links.filter(x => x.via === "instruction")) if (ids.has(l.from)) rules.push({ kind: "link", ref: `${l.from}→${l.to}` });
  // The block is shared by every harness, so its Stop order counts gates that block on any.
  const stop = stopGates(way, scenario, "any");
  if (stop.length >= 2) rules.push({ kind: "stop-order", ref: "stop_order" });
  for (const f of steps) for (const h of Object.keys(f.step.fallback ?? {})) if (way.harnesses.includes(h)) rules.push({ kind: "fallback", ref: `${f.use}@${h}` });
  return rules;
}

/** Blocking Stop gates in a scenario (user-owned), as stop-order identifiers, on one harness. */
export function stopGates(way, scenario, harness = primaryHarness(way)) {
  return (blockingHooks(way, scenario, harness).Stop ?? []).map(h => h.serves ?? h.entry);
}

/** Always-on load of the lead in a scenario: listing tokens and skills, from the catalog. */
export function leadLoad(way, scenario, survey = null) {
  const entries = leadEntries(way, scenario);
  let tokens = 0;
  let skills = 0;
  const rows = [];
  for (const e of entries) {
    const measured = survey?.plugins?.find(p => p.ref === e.ref || p.name === e.id);
    const t = measured?.listing_tokens ?? e.cost?.listing_tokens ?? 0;
    const s = measured?.skills ?? e.cost?.skills ?? 0;
    tokens += t;
    skills += s;
    rows.push({ id: e.id, tokens: t, skills: s, source: measured ? "survey" : "catalog" });
  }
  if (survey?.instructions_tokens) tokens += survey.instructions_tokens;
  return { tokens, skills, rows };
}

export function lintWay(way, catalog, { survey = null, problems: initial = [] } = {}) {
  const problems = [...initial];
  if (!way) return summarise(problems);
  const add = (code, where, message, severity = "error", extra = {}) => problems.push({ code, severity, where, message, ...extra });
  const flowById = new Map(way.flow.map(f => [f.use, f]));
  const allSteps = new Map([...way.flow.map(f => [f.use, f.step]), ...Object.values(way.reflect).flat().map(r => [r.use, r.step])]);

  // GST-ORDER: `after` must point upstream or within the stage; parallel_with stays in-stage.
  for (const f of way.flow) {
    for (const a of f.after) {
      const other = flowById.get(a);
      if (other && stageIndex(other.stage) > stageIndex(f.stage)) add("GST-ORDER", f.where, `runs after ${a}, which is in a later stage (${other.stage})`);
    }
    for (const a of f.parallel_with) {
      const other = flowById.get(a);
      if (other && other.stage !== f.stage) add("GST-ORDER", f.where, `parallel_with ${a} crosses stages (${f.stage} vs ${other.stage})`);
    }
  }

  // GST-INVOKE and GST-LINK: control flows forward; findings go to reflect or the user.
  const edges = new Map();
  for (const l of way.links) {
    const from = allSteps.get(l.from);
    const to = l.to === "user" ? null : allSteps.get(l.to);
    if (!from || (l.to !== "user" && !to)) continue;
    if (l.to === "user" || to.stage === "reflect") continue;
    if ([...CHECKER_KINDS, "recorder"].includes(from.kind) && GENERATOR_KINDS.includes(to.kind)) {
      add("GST-INVOKE", l.where, `${l.from} (${from.kind}) hands control to ${l.to} (${to.kind}); checkers and recorders report, the person or a new pass decides`);
    } else if (stageIndex(to.stage) < stageIndex(from.stage)) {
      add("GST-LINK", l.where, `${l.from} (${from.stage}) links back to ${l.to} (${to.stage}); route findings to reflect or user`);
    }
    if (!edges.has(l.from)) edges.set(l.from, []);
    edges.get(l.from).push(l.to);
  }
  const cycle = findCycle(edges);
  if (cycle) add("GST-LINK", "links", `cycle: ${cycle.join(" → ")}`);

  // GST-PROTOCOL
  for (const f of way.flow) {
    if (f.mode === "protocol" && !CHECKER_KINDS.includes(f.step.kind)) {
      add("GST-PROTOCOL", f.where, `${f.use} is a ${f.step.kind}; protocol mode is for steps a model is tempted to skip (reviewers, gates). Sharpen its description instead`, "warn");
    }
  }

  // GST-WORKER (scenario-independent parts)
  const keeps = new Set(way.topology.lead.keeps);
  for (const w of way.topology.workers) {
    if (w.uses.length === 0) add("GST-WORKER", w.where, `worker ${w.id} performs no step`);
    if (w.mechanism !== "script" && !w.route) add("GST-WORKER", w.where, `worker ${w.id} has no route; the lead needs one line saying when to call it`);
    for (const u of w.uses) {
      const step = allSteps.get(u);
      if (!step) continue;
      if (keeps.has(u)) add("GST-WORKER", w.where, `${u} is both kept in the lead and given to worker ${w.id}`);
      if (step.mode === "ambient" && (flowById.get(u)?.mode ?? step.mode) === "ambient") add("GST-WORKER", w.where, `${u} is fired by a hook in the lead's session; a worker cannot perform it`);
    }
    if (w.mechanism === "agent-file" && w.mcp.length) add("GST-WORKER", w.where, `agent-file workers are plugin agents, which ignore mcpServers; use subagent or headless to hold ${w.mcp.join(", ")}`);
    if (w.mechanism === "subagent") {
      for (const m of w.mcp) if (!way.connectors.find(c => c.id === m)?.server) add("GST-WORKER", w.where, `${m} has no inline server, so the subagent shares the lead's connection (and the lead still lists its tools)`, "info");
    }
    if (w.mechanism === "headless") {
      for (const m of w.mcp) if (!way.connectors.find(c => c.id === m)?.server) add("GST-WORKER", w.where, `a headless worker runs with --strict-mcp-config, so ${m} reaches it only with an inline server; give the connector a server: block or drop it from the worker`);
    }
    if (w.mechanism === "script" && !["script"].includes(w.tier)) add("GST-WORKER", w.where, `a script worker needs tier: script (no model)`);
  }
  const owner = new Map();
  for (const w of way.topology.workers) for (const u of w.uses) {
    if (owner.has(u)) add("GST-WORKER", w.where, `${u} is claimed by workers ${owner.get(u)} and ${w.id}`);
    owner.set(u, w.id);
  }

  // GST-TIER
  const tiersUsed = new Set(way.topology.workers.filter(w => w.tier !== "script").map(w => w.tier));
  if (way.topology.workers.length || Object.keys(way.topology.tiers).length) tiersUsed.add("lead");
  for (const h of way.harnesses.filter(x => x === "claude" || x === "codex")) {
    for (const tier of tiersUsed) {
      if (!way.topology.tiers[h]?.[tier]) add("GST-TIER", `topology.tiers.${h}`, `no model for tier "${tier}" on ${h}`, "warn");
    }
  }

  // GST-HARNESS
  for (const f of way.flow) {
    if (f.mode !== "protocol" && f.enforce !== "hook") continue;
    for (const h of way.harnesses) {
      const level = f.entry.harness?.[h] ?? "none";
      if (level === "advisory" || level === "none") add("GST-HARNESS", f.where, `${f.use} is ${level} on ${h}: the rule is written down there but nothing makes it happen`, "warn");
    }
  }

  // Per-scenario rules
  const budgets = way.budgets;
  const ordered = new Set(way.stop_order);
  for (const sc of scenarios(way)) {
    const at = `context ${sc.name}`;
    const steps = activeSteps(way, sc);

    // GST-RECORDER-BLOCKS, on the primary harness. A hook a way setting unblocks there is
    // not counted; if it still blocks on another of the way's harnesses, that fallback is
    // reported as info so WAY.md states it.
    for (const f of steps.filter(s => s.stage === "record")) {
      const served = (f.entry.hooks ?? []).filter(h => h.serves === f.use);
      const blocking = served.filter(h => hookBlocks(way, f.entry, h));
      if (blocking.length) {
        const sev = ordered.has(f.use) ? "warn" : "error";
        add("GST-RECORDER-BLOCKS", f.where, `${f.use} records, yet its ${blocking.map(h => h.event).join("/")} hook blocks the turn${sev === "warn" ? " (ordered last in stop_order, so tolerated)" : ""}`, sev, { scenario: sc.name });
      }
      for (const h of served.filter(x => x.blocking && !blocking.includes(x))) {
        const still = blockingHarnesses(way, f.entry, h);
        const set = `${f.entry.id}.${h.unblocked_by.setting}: ${settingValue(way, f.entry, h.unblocked_by.setting)}`;
        add("GST-RECORDER-BLOCKS", f.where, `${f.use} records; its ${h.event} hook does not block on ${h.unblocked_by.harness.filter(x => way.harnesses.includes(x)).join(", ")} (${set})${still.length ? `, and still blocks on ${still.join(", ")} as the fallback` : ""}`, "info", { scenario: sc.name });
      }
    }

    // GST-GATE
    for (const [event, hooks] of Object.entries(blockingHooks(way, sc))) {
      if (hooks.length <= budgets.unordered_blocking_per_event) continue;
      const ids = hooks.map(h => h.serves ?? h.entry);
      if (event === "Stop" && ids.every(id => ordered.has(id))) continue;
      const missing = event === "Stop" ? ids.filter(id => !ordered.has(id)) : ids;
      const implicit = hooks.filter(h => h.implicit).map(h => h.serves);
      add("GST-GATE", at, `${hooks.length} blocking ${event} hooks (${ids.join(", ")})${event === "Stop" ? `; add ${missing.join(", ")} to stop_order` : "; they fire together with no order"}${implicit.length ? `. ${implicit.join(", ")} fires whenever its plugin is on, listed in the flow or not` : ""}`, "error", { scenario: sc.name });
    }

    // GST-SLOT (slot names and exclusive_of)
    const entries = activeEntries(way, sc);
    const bySlot = new Map();
    for (const e of entries) if (e.slot) bySlot.set(e.slot, [...(bySlot.get(e.slot) ?? []), e.id]);
    for (const [slot, ids] of bySlot) if (ids.length > 1) add("GST-SLOT", at, `slot ${slot} has ${ids.length} providers: ${ids.join(", ")}`, "error", { scenario: sc.name });
    const activeIds = new Set(steps.map(s => s.use));
    for (const f of steps) for (const x of f.entry.exclusive_of ?? []) {
      if (activeIds.has(x) && f.use < x) add("GST-SLOT", at, `${f.use} and ${x} generate the same thing; pick one per context`, "error", { scenario: sc.name });
    }

    // GST-BUDGET
    const rules = protocolRules(way, sc);
    if (rules.length > budgets.protocol_rules) add("GST-BUDGET", at, `${rules.length} always-on protocol rules (budget ${budgets.protocol_rules}): ${rules.map(r => r.ref).join(", ")}`, "error", { scenario: sc.name });
    const ss = sessionStartLines(way, sc);
    const lines = ss.reduce((n, x) => n + x.lines, 0);
    if (lines > budgets.session_start_lines) add("GST-BUDGET", at, `${lines} session-start lines (budget ${budgets.session_start_lines}): ${ss.map(x => `${x.entry} ${x.lines}`).join(", ")}`, "error", { scenario: sc.name });

    // GST-LEAD
    const load = leadLoad(way, sc, survey);
    if (load.tokens > budgets.always_on_tokens) add("GST-LEAD", at, `lead always-on ≈${load.tokens} tokens (budget ${budgets.always_on_tokens}); disable by context or move to a headless worker: ${load.rows.sort((a, b) => b.tokens - a.tokens).slice(0, 3).map(r => `${r.id} ${r.tokens}`).join(", ")}`, "error", { scenario: sc.name });
    if (load.skills > budgets.skills_per_context) add("GST-LEAD", at, `lead sees ${load.skills} skills (budget ${budgets.skills_per_context})`, "warn", { scenario: sc.name });

    // GST-WORKER: a subagent cannot preload skills of a plugin disabled in this context.
    const disabled = new Set(sc.active.flatMap(c => way.disable[c] ?? []));
    for (const f of steps) {
      const w = workerFor(way, f.use);
      if (w?.mechanism === "subagent" && disabled.has(f.entry.ref) && (f.entry.cost?.skills ?? 0) > 0) {
        add("GST-WORKER", w.where, `${f.entry.id} is disabled in ${sc.name}, and a subagent can only preload enabled skills; make worker ${w.id} headless`, "error", { scenario: sc.name });
      }
    }
  }

  // GST-TRIGGER (survey only)
  for (const t of survey?.triggers ?? []) add("GST-TRIGGER", t.where, `aggressive description (${t.match}): it will compete for every turn`, "warn");

  // Waivers turn a step's own code into info.
  for (const f of way.flow) for (const w of f.waive) {
    for (const pr of problems) if (pr.code === w.code && (pr.where === f.where || pr.where.startsWith(f.where) || pr.message.includes(f.use))) {
      pr.severity = "info";
      pr.waived = w.reason;
    }
  }
  // Way-level waivers: context codes no single step owns.
  for (const w of way.waive ?? []) {
    for (const pr of problems) {
      if (pr.code !== w.code || pr.severity === "info") continue;
      const ctx = pr.scenario ? pr.scenario.split("+").pop() : null;
      if (w.in.length && !(ctx && w.in.includes(ctx))) continue;
      pr.severity = "info";
      pr.waived = w.reason;
    }
  }
  // Profiles: each is a whole way, linted under its own budgets; only what it adds is reported.
  // kitctl profiles narrow a loadout and never add to it, so a profile may not load a
  // primitive the base way does not.
  const seen = new Set(problems.map(x => `${x.code}|${x.where}|${x.message}`));
  for (const pr of way.profiles ?? []) {
    for (const x of lintWay(pr.way, catalog, { survey }).problems) {
      if (!seen.has(`${x.code}|${x.where}|${x.message}`)) problems.push({ ...x, where: `profile ${pr.name}: ${x.where}`, profile: pr.name });
    }
    for (const sc of scenarios(way)) {
      const base = new Set(leadEntries(way, sc).map(e => e.id));
      const extra = leadEntries(pr.way, sc).filter(e => !base.has(e.id)).map(e => e.id);
      if (extra.length) add("GST-PROFILE", `profiles.${pr.name}`, `${extra.join(", ")} load only in this profile (context ${sc.name}); kitctl profiles cannot add to a loadout, so put a step of it in the base way or drop it here`, "error", { scenario: sc.name });
    }
  }
  return summarise(dedupe(problems));
}

function dedupe(problems) {
  const seen = new Set();
  return problems.filter(p => {
    const key = `${p.code}|${p.severity}|${p.where}|${p.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarise(problems) {
  const count = s => problems.filter(p => p.severity === s).length;
  return { problems, errors: count("error"), warnings: count("warn"), infos: count("info"), ok: count("error") === 0 };
}

function findCycle(edges) {
  const state = new Map();
  const stack = [];
  const visit = n => {
    state.set(n, 1);
    stack.push(n);
    for (const m of edges.get(n) ?? []) {
      if (state.get(m) === 1) return [...stack.slice(stack.indexOf(m)), m];
      if (!state.has(m)) { const c = visit(m); if (c) return c; }
    }
    stack.pop();
    state.set(n, 2);
    return null;
  };
  for (const n of edges.keys()) if (!state.has(n)) { const c = visit(n); if (c) return c; }
  return null;
}

export function formatProblems(result) {
  const icon = { error: "error", warn: "warn ", info: "info " };
  const lines = result.problems.map(p => `${icon[p.severity]} ${p.code.padEnd(20)} ${p.where}: ${p.message}${p.waived ? ` (waived: ${p.waived})` : ""}`);
  lines.push(`${result.errors} error(s), ${result.warnings} warning(s), ${result.infos} info`);
  return lines.join("\n");
}
