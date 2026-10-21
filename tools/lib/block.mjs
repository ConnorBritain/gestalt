// The managed block: the only always-on text Gestalt adds. It carries order, not detail:
// which stage comes first, which gates run in what order when they fire together, the
// hand-offs, routes to Gestalt's own workers, and harness fallbacks. Each tool's own wiring
// snippet (its trigger, its skip clause, its agents) stays the tool's: restating it creates
// two copies that drift.
import { STAGES } from "./catalog.mjs";
import { activeRituals, activeSteps, scenarios, workerFor } from "./way.mjs";
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
  // Ordering lines: per stage with a protocol step, gates in the same stage shown in order.
  // A line that orders a single step carries no order; it is kept only when no tool snippet
  // already tells the model to run that step (a way-local step, say).
  const stop = stopGates(way, scenario);
  const order = stop.length >= 2 ? way.stop_order.filter(id => id.startsWith("platform:") || stop.includes(id)) : [];
  let stopPlaced = false;
  for (const stage of STAGES) {
    const atStage = steps.filter(f => f.stage === stage);
    if (!atStage.some(f => f.mode === "protocol")) continue;
    const shown = atStage.filter(f => f.mode === "protocol" || (stage === "check" && f.step.kind === "gate"));
    if (shown.length === 1 && shown[0].step.wiring_marker) continue;
    let text = protocolLine(stage, shown, catalog);
    if (stage === "check" && order.length) {
      // One line, not two: the Stop order extends the check order with what comes after it.
      const rest = order.filter(id => !shown.some(f => f.use === id));
      text = `${text.slice(0, -1)}; when Stop hooks fire together, answer in that order${rest.length ? `, then ${rest.map(id => label(id, catalog)).join(", then ")}` : ""}.`;
      stopPlaced = true;
    }
    lines.push({ key: `stage:${stage}:${shown.map(f => f.use).join(",")}:${stage === "check" ? order.join(",") : ""}`, text });
  }
  if (order.length && !stopPlaced) {
    lines.push({ key: `stop:${order.join(",")}`, text: `When several Stop hooks fire together, answer them in this order: ${order.map(id => label(id, catalog)).join(", then ")}.` });
  }
  const ids = new Set(steps.map(f => f.use));
  for (const l of way.links.filter(x => x.via === "instruction" && ids.has(x.from))) {
    const to = l.to === "user" ? null : catalog.steps.get(l.to);
    const action = to ? `offer ${command(to) ?? label(l.to, catalog)}${l.as ? ` to log it as a ${l.as}` : ""}` : null;
    const text = to ? `On ${label(l.from, catalog)} ${l.on}: once the user has decided, ${action}.` : `On ${label(l.from, catalog)} ${l.on}: stop and put the question to the user; do not decide it.`;
    lines.push({ key: `link:${l.from}:${l.on}:${l.to}`, text });
  }
  for (const f of steps) {
    for (const [h, text] of Object.entries(f.step.fallback ?? {})) {
      if (way.harnesses.includes(h)) lines.push({ key: `fallback:${f.use}:${h}`, text: `(${harnessName(h)}) ${text}` });
    }
  }
  // agent-file workers are the plugins' own agents, which their own snippets already route to.
  for (const w of way.topology.workers.filter(x => x.mechanism === "subagent" || x.mechanism === "headless")) {
    if (!w.uses.some(u => ids.has(u) || activeRituals(way, scenario).some(r => r.use === u))) continue;
    const here = new Set([...ids, ...activeRituals(way, scenario).map(r => r.use)]);
    lines.push({ key: `route:${w.id}:${w.uses.filter(u => here.has(u)).join(",")}`, text: `Route ${w.route} → ${how(w, catalog, here)}.` });
  }
  if (way.offer) lines.push(...offerLines(way, scenario, base));
  if (way.budgets.index) {
    // A context block indexes only what its context adds; the base block indexes the rest.
    const baseIds = new Set(base ? activeSteps(way, base).map(f => f.use) : []);
    const parts = STAGES.map(s => [s, steps.filter(f => f.stage === s && !baseIds.has(f.use)).map(f => f.entry.id)]).filter(([, e]) => e.length).map(([s, e]) => `${s} ${[...new Set(e)].join("·")}`);
    if (parts.length) lines.push({ key: `index:${parts.join("|")}`, text: `${base ? "Index, added here" : "Index"}: ${parts.join(" | ")}.` });
  }
  return lines;
}

/**
 * With `offer`, what runs by name. In-session explicit steps list themselves, yet skills the
 * model must remember to call often go uncalled (DESIGN.md, research); ritual skills hide
 * from the listing altogether, so the line carries what each one is for. Worker-routed steps
 * already have a route line, and on_enter is set-up, not a ritual. A context block names only
 * what its context adds.
 */
function offerLines(way, scenario, base) {
  const routed = id => ["subagent", "headless"].includes(workerFor(way, id)?.mechanism);
  const slash = step => (command(step) ?? "").startsWith("/");
  const pick = sc => ({
    session: activeSteps(way, sc).filter(f => f.mode === "explicit" && slash(f.step) && !routed(f.use)),
    rituals: activeRituals(way, sc).filter(r => !way.reflect.on_enter.includes(r) && slash(r.step) && !routed(r.use)),
  });
  const mine = pick(scenario);
  const theirs = base ? pick(base) : { session: [], rituals: [] };
  const session = mine.session.filter(f => !theirs.session.some(x => x.use === f.use));
  const rituals = mine.rituals.filter(r => !theirs.rituals.some(x => x.use === r.use));
  const cmds = [...new Set(session.map(f => command(f.step)))].join(", ");
  const due = rituals.map(r => r.step.invoke).join(" · ");
  const key = `offer:${[...session, ...rituals].map(x => x.use).join(",")}`;
  if (!session.length && !rituals.length) return [];
  if (base) return [{ key, text: `Added here, by name: ${[cmds, rituals.length ? `rituals ${due}` : ""].filter(Boolean).join("; ")}.` }];
  const lines = [];
  if (session.length) lines.push({ key: `${key}:session`, text: `By name, in session: ${cmds}.` });
  if (rituals.length) lines.push({ key: `${key}:rituals`, text: `Rituals, by name (offer one when it is due; never start it unasked): ${due}.` });
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

/**
 * Render the base block (always-on contexts) and one block per other context holding only
 * the lines that context adds. Returns { base: {name, body, text, tokens}, contexts: [...] }.
 */
export function renderBlocks(way, catalog) {
  const [base, ...rest] = scenarios(way);
  const baseLines = blockLines(way, catalog, base);
  const baseKeys = new Set(baseLines.map(l => l.key));
  const make = (name, title, lines, withFrame) => {
    const bodyLines = withFrame ? [HEAD, "", ORDER, ...lines.map(l => `- ${l.text}`)] : [title, ...lines.map(l => `- ${l.text}`)];
    const body = `${bodyLines.join("\n")}\n`;
    const text = `${BEGIN(name)}\n${body}${END(name)}\n`;
    return { name, body, text, tokens: estimateTokens(text) };
  };
  const out = { base: make("way", null, baseLines, true), contexts: [] };
  for (const sc of rest) {
    const ctx = sc.active[sc.active.length - 1];
    const lines = blockLines(way, catalog, sc, base).filter(l => !baseKeys.has(l.key));
    if (!lines.length) continue;
    const marker = way.contexts[ctx].when.replace(/^file-exists:/, "");
    out.contexts.push({ context: ctx, when: way.contexts[ctx].when, ...make(`way.${ctx}`, `### In ${ctx} (${marker} present)   <!-- gestalt -->`, lines, false) });
  }
  return out;
}
