// TASTE-TEST.md: three prompts to run in fresh chats, each with the trace the way says
// should happen, computed from the way (never guessed by a model). The person scores what
// actually fired from the transcript, not from the agent's account of itself.
import { STAGES } from "./catalog.mjs";
import { activeSteps, scenarios, workerFor } from "./way.mjs";
import { label } from "./block.mjs";
import { stopGates } from "./lint.mjs";

/** The expected trace for one taste prompt. Deterministic. */
export function expectedTrace(way, catalog, taste) {
  const sc = scenarios(way).find(s => s.active.includes(taste.context) && (s.active.length === 1 || s.active[s.active.length - 1] === taste.context)) ?? scenarios(way)[0];
  const steps = activeSteps(way, sc);
  const quiet = new Set(taste.expect_quiet);
  const fires = [];
  const onAsk = [];
  for (const stage of STAGES) {
    for (const f of steps.filter(x => x.stage === stage)) {
      if (quiet.has(f.use)) continue;
      const onPath = stage === "orient" || taste.path.includes(stage);
      if (!onPath) continue;
      const entry = { id: f.use, label: label(f.use, catalog), stage, how: f.mode === "ambient" ? "hook" : f.mode, worker: workerFor(way, f.use)?.id ?? null };
      if (f.mode === "explicit") onAsk.push(entry);
      else fires.push(entry);
    }
  }
  const stop = stopGates(way, sc);
  const stopOrder = taste.path.some(s => s === "check" || s === "record") && stop.length >= 2
    ? way.stop_order.filter(id => id.startsWith("platform:") || stop.includes(id)).map(id => label(id, catalog))
    : [];
  const workers = [...new Set(fires.map(f => f.worker).filter(Boolean))].map(id => way.topology.workers.find(w => w.id === id));
  return { scenario: sc.name, fires, onAsk, quiet: [...quiet].map(id => label(id, catalog)), stopOrder, workers };
}

export function renderTaste(way, catalog) {
  const L = [];
  L.push(`# Taste test for ${way.person.name}'s way`, "");
  L.push("Three prompts. Run each in a **fresh chat**, in a repo of the kind named, without naming any tool or skill. Then check the transcript (tool calls, hook messages), not the agent's description of what it did: installed is not wired, and wired is not firing.", "");
  for (const [i, t] of way.taste.entries()) {
    const tr = expectedTrace(way, catalog, t);
    L.push(`## ${i + 1}. ${t.id}`, "");
    L.push(`**Open in:** a ${t.context} repo (${way.contexts[t.context].when === "always" ? "any" : way.contexts[t.context].when}).`, "");
    L.push("**Prompt:**", "", "```text", t.prompt, "```", "");
    L.push("**Should happen, in order:**", "");
    if (!tr.fires.length) L.push("- Nothing beyond a direct answer.");
    for (const f of tr.fires) L.push(`- ${f.stage}: ${f.label} (${f.how}${f.worker ? `, via the ${f.worker} worker` : ""})`);
    if (tr.stopOrder.length) L.push(`- At Stop, answered in this order: ${tr.stopOrder.join(" → ")}`);
    L.push("");
    if (tr.workers.length) L.push(`**Workers that should spawn:** ${tr.workers.map(w => `${w.id} (${w.tier}, ${w.mechanism})`).join(", ")}. Each should receive the prompt above verbatim.`, "");
    if (tr.onAsk.length) L.push(`**Only if you ask:** ${tr.onAsk.map(f => f.label).join(", ")}.`, "");
    if (tr.quiet.length) L.push(`**Should stay quiet:** ${tr.quiet.join(", ")}.`, "");
    L.push("| Step | Expected | Fired? | In order? | Note |", "|---|---|---|---|---|");
    for (const f of tr.fires) L.push(`| ${f.label} | yes |  |  |  |`);
    for (const q of tr.quiet) L.push(`| ${q} | no |  |  |  |`);
    L.push("", `**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.`, "");
  }
  L.push("## Then", "", "Paste the three tables (or the transcripts) into `/gestalt:taste`. Each miss is diagnosed along installed → enabled → wired → firing, and the smallest fix goes back into your way.", "");
  return `${L.join("\n")}\n`;
}
