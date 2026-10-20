// The managed block: the only always-on text Gestalt adds. It carries order, not detail:
// which stage comes first, which gates run in what order when they fire together, the
// hand-offs, the routing index for workers, harness fallbacks and the skip clause. Each
// tool's own wiring snippet stays the tool's (restating it creates two copies that drift).
import { STAGES } from "./catalog.mjs";
import { activeRituals, activeSteps, scenarios } from "./way.mjs";
import { stopGates } from "./lint.mjs";
import { estimateTokens } from "./tokens.mjs";

export const BEGIN = name => `<!-- gestalt:begin ${name} -->`;
export const END = name => `<!-- gestalt:end ${name} -->`;
export const WORKER_DIR = "~/.gestalt/build/workers";

const STAGE_CUE = {
  orient: "At session start",
  intend: "Before starting new work",
  plan: "Before building from a plan",
  make: "While making",
  check: "Before calling non-trivial work done",
  record: "At the end of a session",
};

/** A short human label for a step or platform gate: "elonify diff-review", "platform git-check". */
export function label(id, catalog) {
  if (id.startsWith("platform:")) return `platform ${id.slice(9)}`;
  const step = catalog.steps.get(id);
  if (!step) return id;
  return `${step.entry.id} ${id.slice(step.entry.id.length + 1)}`;
}

/** The slash command (or CLI) a step is invoked by, if its invoke text names one. */
export function command(step) {
  const m = /(^|\s)(\/[\w:.-]+|`[^`]+`)/.exec(step.invoke ?? "");
  return m ? m[2].replace(/`/g, "") : null;
}

function protocolLine(stage, steps, catalog) {
  // Group parallel steps: a step listing parallel_with joins its partner's group.
  const groups = [];
  for (const f of steps) {
    const partner = groups.find(g => g.some(x => f.parallel_with.includes(x.use) || x.parallel_with.includes(f.use)));
    if (partner) partner.push(f);
    else groups.push([f]);
  }
  const text = groups.map(g => g.map(f => label(f.use, catalog) + (f.enforce === "hook" || f.mode === "ambient" ? " (hook)" : "")).join(" ∥ ")).join(" → ");
  return `${STAGE_CUE[stage]}: ${text}.`;
}

/** Block lines for one scenario, each with a stable key so context blocks can diff against base. */
export function blockLines(way, catalog, scenario, base = null) {
  const steps = activeSteps(way, scenario);
  const lines = [];
  // Ordering lines: per stage that has a protocol step; gates in the same stage are shown in order.
  for (const stage of STAGES) {
    const atStage = steps.filter(f => f.stage === stage);
    if (!atStage.some(f => f.mode === "protocol")) continue;
    const shown = atStage.filter(f => f.mode === "protocol" || (stage === "check" && f.step.kind === "gate"));
    lines.push({ key: `stage:${stage}:${shown.map(f => f.use).join(",")}`, text: protocolLine(stage, shown, catalog) });
  }
  const stop = stopGates(way, scenario);
  if (stop.length >= 2) {
    const order = way.stop_order.filter(id => id.startsWith("platform:") || stop.includes(id));
    lines.push({ key: `stop:${order.join(",")}`, text: `When several Stop hooks fire together, answer them in this order: ${order.map(id => label(id, catalog)).join(", then ")}.` });
  }
  const ids = new Set(steps.map(f => f.use));
  for (const l of way.links.filter(x => x.via === "instruction" && ids.has(x.from))) {
    const to = l.to === "user" ? null : catalog.steps.get(l.to);
    const action = to ? `offer ${command(to) ?? label(l.to, catalog)}${l.as ? ` to log it as a ${l.as}` : ""}` : "stop and put the question to the user";
    lines.push({ key: `link:${l.from}:${l.on}:${l.to}`, text: `On ${label(l.from, catalog)} ${l.on}: once the user has decided, ${action}.` });
  }
  for (const f of steps) {
    for (const [h, text] of Object.entries(f.step.fallback ?? {})) {
      if (way.harnesses.includes(h)) lines.push({ key: `fallback:${f.use}:${h}`, text: `(${harnessName(h)}) ${text}` });
    }
  }
  for (const w of way.topology.workers.filter(x => x.mechanism !== "script")) {
    if (!w.uses.some(u => ids.has(u) || activeRituals(way, scenario).some(r => r.use === u))) continue;
    const here = new Set([...ids, ...activeRituals(way, scenario).map(r => r.use)]);
    lines.push({ key: `route:${w.id}:${w.uses.filter(u => here.has(u)).join(",")}`, text: `Route ${w.route} → ${how(w, catalog, here)}.` });
  }
  if (way.budgets.index) {
    // A context block indexes only what its context adds; the base block indexes the rest.
    const baseIds = new Set(base ? activeSteps(way, base).map(f => f.use) : []);
    const parts = STAGES.map(s => [s, steps.filter(f => f.stage === s && !baseIds.has(f.use)).map(f => f.entry.id)]).filter(([, e]) => e.length).map(([s, e]) => `${s} ${[...new Set(e)].join("·")}`);
    if (parts.length) lines.push({ key: `index:${parts.join("|")}`, text: `${base ? "Index, added here" : "Index"}: ${parts.join(" | ")}.` });
  }
  return lines;
}

export function how(worker, catalog, active = null) {
  if (worker.mechanism === "subagent") return `the \`${worker.id}\` subagent`;
  if (worker.mechanism === "headless") return `\`sh ${WORKER_DIR}/${worker.id}.sh "<task>"\``;
  // agent-file workers are the plugins' own agents: name the steps, each in fresh context.
  if (worker.mechanism === "agent-file") {
    const uses = worker.uses.filter(u => !active || active.has(u));
    const plugins = [...new Set(uses.map(u => catalog?.steps.get(u)?.entry.id ?? u))];
    return `the ${plugins.join(" / ")} ${uses.length > 1 ? "critics, each" : "critic,"} as its own agent in fresh context`;
  }
  return `\`${worker.id}\``;
}

function harnessName(h) {
  return { claude: "Claude Code", codex: "Codex", cursor: "Cursor", "agents-md": "AGENTS.md agents" }[h] ?? h;
}

const HEAD = "## Way of work   <!-- gestalt -->";
const ORDER = "Order: orient → intend → plan → make → check → record. Checkers report; they never fix. Give every worker and critic the user's original request verbatim and the decisions made since.";
const SKIP = "Trivial turns (typo, version bump, a one-line fix) skip these gates; say so when you do.";

/**
 * Render the base block (always-on contexts) and one block per other context holding only
 * the lines that context adds. Returns { base: {name, body, text, tokens}, contexts: [...] }.
 */
export function renderBlocks(way, catalog) {
  const [base, ...rest] = scenarios(way);
  const baseLines = blockLines(way, catalog, base);
  const baseKeys = new Set(baseLines.map(l => l.key));
  const make = (name, title, lines, withFrame) => {
    const bodyLines = withFrame ? [HEAD, "", ORDER, ...lines.map(l => `- ${l.text}`), SKIP] : [title, ...lines.map(l => `- ${l.text}`)];
    const body = `${bodyLines.join("\n")}\n`;
    const text = `${BEGIN(name)}\n${body}${END(name)}\n`;
    return { name, body, text, tokens: estimateTokens(text) };
  };
  const out = { base: make("way", null, baseLines, true), contexts: [] };
  for (const sc of rest) {
    const ctx = sc.active[sc.active.length - 1];
    const lines = blockLines(way, catalog, sc, base).filter(l => !baseKeys.has(l.key));
    if (!lines.length) continue;
    out.contexts.push({ context: ctx, when: way.contexts[ctx].when, ...make(`way.${ctx}`, `### In ${ctx} repos   <!-- gestalt -->`, lines, false) });
  }
  return out;
}
