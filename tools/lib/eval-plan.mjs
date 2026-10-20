// eval --plan: the experiment that tests whether a way helps, printed but never run.
// The question it answers is the one behind Gestalt: does a lean, ordered harness (and a
// lean lead with workers) do the person's real tasks better than everything loaded at once?
// Running it spends model time, so v0.1 only plans it.
import { resolve } from "node:path";
import { defaultWayPath, readWay } from "./way.mjs";
import { expectedTrace } from "./render-taste.mjs";

export const CONDITIONS = [
  { id: "loaded", what: "Everything the survey found, enabled everywhere; no Gestalt block. The baseline: the harness as it is." },
  { id: "lean", what: "The compiled way: its loadouts and its block. No index line." },
  { id: "indexed", what: "lean plus the one-line stage index (budgets.index: true), to test the AGENTS.md-index finding." },
];
export const TOPOLOGY_CONDITION = { id: "lead-loaded", what: "lean, but every worker-owned plugin and connection loaded in the lead and no routes: isolates the lead/worker claim." };

export const METRICS = [
  "expected steps that fired, from the transcript's tool calls and hook messages (never the agent's account)",
  "order violations against the computed trace and stop_order",
  "steps that should have stayed quiet but fired",
  "input and output tokens and cost (result.usage, total_cost_usd)",
  "wall time",
  "a blind pairwise judgment of the final answer (lean vs loaded), by a model that sees neither condition name",
];

export function evalPlan(way, catalog, { runs = 3, perRunUsd = 0.4 } = {}) {
  const conditions = [...CONDITIONS, ...(way.topology.workers.length ? [TOPOLOGY_CONDITION] : [])];
  const lead = way.topology.tiers.claude?.lead ?? "<lead model>";
  const cells = [];
  for (const t of way.taste) {
    const trace = expectedTrace(way, catalog, t);
    for (const c of conditions) {
      cells.push({
        taste: t.id,
        context: t.context,
        condition: c.id,
        runs,
        expected: trace.fires.map(f => f.id),
        quiet: t.expect_quiet,
        command: `CLAUDE_CONFIG_DIR=$RUN/${c.id}/config claude -p --output-format stream-json --verbose --model ${lead} --settings $RUN/${c.id}/settings.json ${JSON.stringify(t.prompt)}`,
      });
    }
  }
  const total = cells.length * runs;
  return {
    conditions,
    metrics: METRICS,
    cells,
    total_runs: total,
    estimate_usd: Math.round(total * perRunUsd * 100) / 100,
    estimate_basis: `${total} runs × $${perRunUsd} per run (an assumption, not a measurement: pass --per-run-usd)`,
  };
}

export function renderEvalPlan(plan, way) {
  const L = [`Eval plan for ${way.person.name}'s way (not run)`, ""];
  L.push("Conditions:");
  for (const c of plan.conditions) L.push(`  ${c.id.padEnd(12)} ${c.what}`);
  L.push("", "Metrics:");
  for (const m of plan.metrics) L.push(`  - ${m}`);
  L.push("", "Matrix (taste × condition × runs):");
  for (const c of plan.cells) L.push(`  ${c.taste.padEnd(16)} ${c.condition.padEnd(12)} ×${c.runs}  expects ${c.expected.length} steps${c.quiet.length ? `, ${c.quiet.length} quiet` : ""}`);
  L.push("", "Each run, in a throwaway copy of a repo of the taste prompt's context, with an isolated config directory:", `  ${plan.cells[0]?.command ?? ""}`);
  L.push("", `${plan.total_runs} runs, ≈$${plan.estimate_usd}: ${plan.estimate_basis}.`);
  L.push("Running it is not in v0.1. See docs/eval.md for the design and what would make it worth the spend.");
  return `${L.join("\n")}\n`;
}

export function runEval(argv, { parseArgs }) {
  const a = parseArgs(argv, { plan: "flag", way: "value", runs: "value", "per-run-usd": "value", json: "flag" });
  if (!a.plan) throw Object.assign(new Error("eval needs --plan (v0.1 plans the experiment; it never runs it)"), { name: "UsageError" });
  const { way, catalog, problems } = readWay(resolve(a.way ?? defaultWayPath()));
  if (!way || problems.some(p => p.severity === "error")) {
    console.error("gestalt eval: the way has errors; run gestalt lint first.");
    return 1;
  }
  const plan = evalPlan(way, catalog, { runs: a.runs ? Number(a.runs) : 3, perRunUsd: a["per-run-usd"] ? Number(a["per-run-usd"]) : 0.4 });
  if (a.json) console.log(JSON.stringify(plan, null, 2));
  else process.stdout.write(renderEvalPlan(plan, way));
  return 0;
}
