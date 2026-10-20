// compile: way.yaml → WAY.md, the managed blocks, kitctl loadouts, worker definitions,
// SETUP.md and TASTE-TEST.md. Deterministic (same inputs, same bytes) and refuses to emit
// while lint has errors, so nothing that contradicts the principles reaches a harness.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { defaultWayPath, gestaltHome, readWay } from "./way.mjs";
import { formatProblems, lintWay } from "./lint.mjs";
import { renderBlocks } from "./block.mjs";
import { emitKit } from "./kit-emit.mjs";
import { emitAgents } from "./agents-emit.mjs";
import { renderWay } from "./render-way.mjs";
import { renderSetup } from "./render-setup.mjs";
import { renderTaste } from "./render-taste.mjs";

const LEDGER = ".gestalt-build.json";

/** Pure: returns { ok, lint, files } where files maps relative path → text. */
export function compileWay(way, catalog, { survey = null, problems = [] } = {}) {
  const lint = lintWay(way, catalog, { survey, problems });
  if (!way) return { ok: false, lint, files: {} };
  const blocks = renderBlocks(way, catalog);
  const worst = Math.max(blocks.base.tokens, ...blocks.contexts.map(b => blocks.base.tokens + b.tokens));
  if (worst > way.budgets.block_tokens) {
    lint.problems.push({ code: "GST-BUDGET", severity: "error", where: "block", message: `the managed block is ≈${worst} tokens in its largest context (budget ${way.budgets.block_tokens}); cut protocol steps, links or workers` });
    lint.errors += 1;
    lint.ok = false;
  }
  if (!lint.ok) return { ok: false, lint, files: {} };
  const files = {};
  files["block.md"] = blocks.base.text;
  for (const b of blocks.contexts) files[`block.${b.context}.md`] = b.text;
  const kit = emitKit(way, blocks);
  for (const [p, t] of Object.entries(kit.files)) files[`kit/${p}`] = t;
  const agentFiles = emitAgents(way, catalog);
  Object.assign(files, agentFiles);
  files["WAY.md"] = renderWay(way, catalog, { lint, blocks, survey });
  files["SETUP.md"] = renderSetup(way, catalog, { blocks, kit, agentFiles, survey });
  files["TASTE-TEST.md"] = renderTaste(way, catalog);
  return { ok: true, lint, files, blocks };
}

export function writeBuild(out, files) {
  mkdirSync(out, { recursive: true });
  const ledgerPath = join(out, LEDGER);
  const previous = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, "utf8")).files ?? [] : [];
  for (const old of previous) if (!(old in files)) rmSync(join(out, old), { force: true });
  for (const [rel, text] of Object.entries(files)) {
    const path = join(out, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  writeFileSync(ledgerPath, `${JSON.stringify({ generator: "gestalt compile", files: Object.keys(files).sort() }, null, 2)}\n`);
}

/** Drift between a build directory and freshly compiled files. */
export function checkBuild(out, files) {
  const drift = [];
  for (const [rel, text] of Object.entries(files)) {
    const path = join(out, rel);
    if (!existsSync(path)) drift.push(`missing ${rel}`);
    else if (readFileSync(path, "utf8") !== text) drift.push(`changed ${rel}`);
  }
  const ledgerPath = join(out, LEDGER);
  if (existsSync(ledgerPath)) for (const old of JSON.parse(readFileSync(ledgerPath, "utf8")).files ?? []) if (!(old in files)) drift.push(`stale ${old}`);
  // A file the ledger does not list (hand-added, or left by an older compiler) is drift too.
  const walk = (dir, rel = "") => existsSync(dir) ? readdirSync(dir).flatMap(n => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${rel}${n}/`) : [`${rel}${n}`])) : [];
  for (const f of walk(out)) if (f !== LEDGER && !(f in files) && !drift.includes(`stale ${f}`)) drift.push(`extra ${f}`);
  return drift;
}

export function runCompile(argv, { parseArgs, loadSurvey }) {
  const a = parseArgs(argv, { way: "value", survey: "value", out: "value", check: "flag" });
  const wayPath = resolve(a.way ?? defaultWayPath());
  const out = resolve(a.out ?? join(gestaltHome(), "build"));
  const { way, catalog, problems } = readWay(wayPath);
  const result = compileWay(way, catalog, { survey: loadSurvey(a.survey), problems });
  if (!result.ok) {
    console.log(formatProblems(result.lint));
    console.error("gestalt compile: refused; fix the errors above (or waive them with a reason) and compile again.");
    return 1;
  }
  if (a.check) {
    const drift = checkBuild(out, result.files);
    if (drift.length) { console.log(drift.join("\n")); console.error(`gestalt compile --check: ${drift.length} file(s) differ from the way; recompile.`); return 1; }
    console.log(`gestalt compile --check: ${Object.keys(result.files).length} files match the way.`);
    return 0;
  }
  writeBuild(out, result.files);
  const { warnings, infos } = result.lint;
  console.log(`compiled ${Object.keys(result.files).length} files to ${out} (${warnings} warning(s), ${infos} info). Start with WAY.md, then SETUP.md.`);
  return 0;
}
