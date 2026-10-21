// Lint is the principle layer made executable. Each code has one planted-defect fixture;
// a fixture that produces a second code means a rule is over-reaching, and one that
// produces nothing means a rule is dead.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { check, finish, group, run, FIXTURES } from "./harness.mjs";
import { hookBlocks, normaliseWay, readWay } from "../tools/lib/way.mjs";
import { CODES, lintWay, blockingHooks, protocolRules, leadLoad, stopGates } from "../tools/lib/lint.mjs";
import { scenarios } from "../tools/lib/way.mjs";
import { parseYaml } from "../tools/lib/yaml.mjs";
import { blockLines } from "../tools/lib/block.mjs";

const lintFile = path => {
  const { way, catalog, problems } = readWay(path);
  const surveyPath = path.replace(/\.way\.yaml$/, ".survey.json");
  const survey = existsSync(surveyPath) ? JSON.parse(readFileSync(surveyPath, "utf8")) : null;
  return lintWay(way, catalog, { survey, problems });
};
const dir = join(FIXTURES, "lint");

group("planted defects");
const fixtures = readdirSync(dir).filter(f => f.endsWith(".way.yaml")).map(f => f.replace(".way.yaml", "")).sort();
check("every lint code has a fixture", "a code without a planted defect is a rule nobody has seen fire", () => {
  assert.deepEqual(fixtures, [...CODES].sort());
});
for (const code of fixtures) {
  check(`${code} fixture yields exactly ${code}`, "one defect, one code: anything else is a rule misfiring", () => {
    const result = lintFile(join(dir, `${code}.way.yaml`));
    const got = [...new Set(result.problems.filter(p => p.severity !== "info").map(p => p.code))];
    assert.deepEqual(got, [code], result.problems.map(p => `${p.code}: ${p.message}`).join("\n"));
  });
}

group("rules in detail");
check("the minimal way lints clean", "the base every fixture mutates must itself be clean", () => {
  assert.deepEqual(lintFile(join(FIXTURES, "ways", "minimal.way.yaml")).problems, []);
});
check("Stop gates are counted per context, and quiet outside it", "verification gates only exist where gates.json does; counting them everywhere would cry wolf", () => {
  const { way } = readWay(join(FIXTURES, "ways", "minimal.way.yaml"));
  const [base, code] = scenarios(way);
  assert.equal(blockingHooks(way, base).Stop, undefined);
  assert.deepEqual(blockingHooks(way, code).Stop.map(h => h.serves), ["verification-gate.gates"]);
});
check("a hook with no opt-in counts even when its step is left out of the flow", "compounder's Stop nudge fires whenever compounder is on; omitting the step must not hide the gate", () => {
  const { way, catalog, problems } = readWay(join(FIXTURES, "ways", "minimal.way.yaml"));
  way.flow.unshift({ ...way.flow[0], use: "compounder.brief", stage: "orient", mode: "ambient", in: ["everywhere", "code"], after: [], parallel_with: [], waive: [], step: catalog.steps.get("compounder.brief"), entry: catalog.entries.get("compounder"), where: "flow.orient[0]" });
  const gate = lintWay(way, catalog, { problems }).problems.find(p => p.code === "GST-GATE");
  assert.ok(gate, "expected GST-GATE");
  assert.match(gate.message, /compounder\.stop-lines fires whenever its plugin is on/);
  way.stop_order = ["verification-gate.gates", "compounder.stop-lines"];
  assert.ok(!lintWay(way, catalog, { problems }).problems.some(p => p.code === "GST-GATE"), "a stop_order naming the implicit gate clears it");
});
check("an opt-in hook counts only where the way switches it on", "SETUP says create the opt-in file only for hook-backed steps; lint must count the same hooks", () => {
  const { way, catalog, problems } = readWay(join(dir, "GST-GATE.way.yaml"));
  way.flow.find(f => f.use === "elonify.diff-review").enforce = "none";
  assert.ok(!lintWay(way, catalog, { problems }).problems.some(p => p.code === "GST-GATE"), "a protocol-only elonify has no Stop gate");
});
check("a headless worker cannot reach a connector without an inline server", "--strict-mcp-config gives it only what its own config names", () => {
  const { way, catalog, problems } = readWay(join(FIXTURES, "ways", "full.way.yaml"));
  way.topology.workers.find(w => w.id === "prose").mcp = ["github"];
  assert.ok(lintWay(way, catalog, { problems }).problems.some(p => p.code === "GST-WORKER" && /strict-mcp-config, so github/.test(p.message)));
});
check("ordering every Stop gate clears GST-GATE", "stop_order is the documented way to let several gates coexist", () => {
  const { way, catalog } = readWay(join(dir, "GST-GATE.way.yaml"));
  way.stop_order = ["verification-gate.gates", "elonify.diff-review"];
  const result = lintWay(way, catalog);
  assert.ok(!result.problems.some(p => p.code === "GST-GATE"));
  assert.ok(protocolRules(way, scenarios(way)[1]).some(r => r.kind === "stop-order"), "the order itself costs a block line");
});
check("a waiver turns its code into info, with the reason kept", "waivers must be visible in WAY.md, not silent", () => {
  const { way, catalog, problems } = readWay(join(dir, "GST-PROTOCOL.way.yaml"));
  way.flow.find(f => f.use === "prose-author.draft").waive = [{ code: "GST-PROTOCOL", reason: "drafting in my voice is mandatory for client letters" }];
  const result = lintWay(way, catalog, { problems });
  const p = result.problems.find(x => x.code === "GST-PROTOCOL");
  assert.equal(p.severity, "info");
  assert.match(p.waived, /client letters/);
});
check("delegating critics saves nothing while their plugin also fires a hook in the lead", "the lean-lead claim must not count savings the harness cannot deliver", () => {
  const { way } = readWay(join(FIXTURES, "ways", "minimal.way.yaml"));
  const sc = scenarios(way)[1];
  const before = leadLoad(way, sc).tokens;
  way.topology.workers.push({ id: "critics", tier: "critic", mechanism: "headless", uses: ["verification-gate.critics"], route: "x", mcp: [] });
  // gates are ambient and stay in the lead, so verification-gate stays loaded: no saving.
  assert.equal(leadLoad(way, sc).tokens, before);
});

check("a way-level waiver turns a context code into info, scoped and with its reason", "budgets as limits need a visible, reasoned exception, not a silently raised number", () => {
  const { way, catalog, problems } = readWay(join(dir, "GST-BUDGET.way.yaml"));
  way.waive = [{ code: "GST-BUDGET", reason: "two rules until the snippet merges upstream", in: ["everywhere"] }];
  assert.ok(lintWay(way, catalog, { problems }).problems.some(p => p.code === "GST-BUDGET" && p.severity === "error"), "scoped to another context: still an error");
  way.waive[0].in = ["code"];
  const waived = lintWay(way, catalog, { problems }).problems.find(p => p.code === "GST-BUDGET");
  assert.equal(waived.severity, "info");
  assert.match(waived.waived, /merges upstream/);
});

group("settings that unblock a hook");
const recorder = (harnesses, settings) => {
  const raw = parseYaml(readFileSync(join(dir, "GST-RECORDER-BLOCKS.way.yaml"), "utf8"));
  raw.harnesses = harnesses;
  if (settings) raw.settings = settings;
  const { way, catalog, problems } = normaliseWay(raw);
  return { way, catalog, result: lintWay(way, catalog, { problems }) };
};
const stopMode = { "compounder.rules.stop_mode": "context" };
check("hookBlocks follows unblocked_by: only the named harnesses, only at the named value", "a setting that unblocks Claude Code must not be read as unblocking Codex", () => {
  const { way, catalog } = recorder(["claude", "codex"], stopMode);
  const entry = catalog.entries.get("compounder");
  const stop = entry.hooks.find(h => h.event === "Stop");
  assert.equal(hookBlocks(way, entry, stop, "claude"), false);
  assert.equal(hookBlocks(way, entry, stop, "codex"), true);
  assert.equal(hookBlocks(way, entry, stop), false, "the primary harness is the first listed");
  assert.equal(hookBlocks(way, entry, stop, "any"), true);
  assert.equal(hookBlocks({ ...way, settings: {} }, entry, stop, "claude"), true, "the knob's default (block) keeps it blocking");
  assert.equal(hookBlocks({ ...way, settings: { "compounder.rules.stop_mode": "block" } }, entry, stop, "claude"), true);
});
check("a recorder unblocked on the primary harness is not GST-RECORDER-BLOCKS; the fallback is info", "compounder's stop_mode context removes the block in Claude Code, and WAY.md must still say Codex blocks", () => {
  const { result } = recorder(["claude", "codex"], stopMode);
  const hits = result.problems.filter(p => p.code === "GST-RECORDER-BLOCKS");
  assert.deepEqual(hits.map(p => p.severity), ["info"]);
  assert.match(hits[0].message, /does not block on claude \(compounder\.rules\.stop_mode: context\), and still blocks on codex as the fallback/);
  const alone = recorder(["claude"], stopMode).result.problems.filter(p => p.code === "GST-RECORDER-BLOCKS");
  assert.ok(alone.length === 1 && alone[0].severity === "info" && !/fallback/.test(alone[0].message), "no fallback to state on a Claude-only way");
});
check("unblocked on Claude Code but led from Codex: still GST-RECORDER-BLOCKS", "lint counts gates where the lead mainly runs", () => {
  const { result } = recorder(["codex", "claude"], stopMode);
  assert.ok(result.problems.some(p => p.code === "GST-RECORDER-BLOCKS" && p.severity === "warn"));
});
check("Stop gates drop an unblocked hook on the primary harness; the shared block keeps its order", "Claude Code no longer blocks, but Codex reads the same block and still blocks", () => {
  const { way, catalog } = recorder(["claude", "codex"], stopMode);
  const code = scenarios(way)[1];
  assert.deepEqual(stopGates(way, code), ["verification-gate.gates"]);
  assert.deepEqual(stopGates(way, code, "codex"), ["verification-gate.gates", "compounder.stop-lines"]);
  assert.deepEqual(blockingHooks(way, code, "any").Stop.map(h => h.serves), ["verification-gate.gates", "compounder.stop-lines"]);
  assert.ok(blockLines(way, catalog, code).some(l => /compounder stop-lines/.test(l.text)), "the block keeps compounder in the Stop order for Codex");
  assert.ok(protocolRules(way, code).some(r => r.kind === "stop-order"), "and still counts that line against the rule budget");
  const claudeOnly = recorder(["claude"], stopMode);
  assert.ok(!blockLines(claudeOnly.way, claudeOnly.catalog, scenarios(claudeOnly.way)[1]).some(l => /compounder/.test(l.text)), "on a Claude-only way nothing blocks beside the gates, so no order line names compounder");
});
check("GST-GATE no longer counts a hook a setting unblocks", "two Stop blockers become one, so the order is no longer required", () => {
  const raw = parseYaml(readFileSync(join(dir, "GST-RECORDER-BLOCKS.way.yaml"), "utf8"));
  raw.stop_order = ["verification-gate.gates"];
  raw.flow.record[0].waive = { code: "GST-RECORDER-BLOCKS", reason: "the hook is unblocked in this test, or not" };
  let { way, catalog, problems } = normaliseWay(raw);
  assert.ok(lintWay(way, catalog, { problems }).problems.some(p => p.code === "GST-GATE"), "two unordered Stop blockers without the setting");
  raw.settings = stopMode;
  ({ way, catalog, problems } = normaliseWay(raw));
  assert.ok(!lintWay(way, catalog, { problems }).problems.some(p => p.code === "GST-GATE"), "one blocker with it");
});

group("cli");
check("gestalt lint exits 1 on errors and prints the code", "skills branch on the exit status", () => {
  const r = run(["lint", "--way", join(dir, "GST-GATE.way.yaml")]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /GST-GATE/);
});
check("gestalt lint --json on a clean way", "the way skill reads the JSON result", () => {
  const r = run(["lint", "--way", join(FIXTURES, "ways", "minimal.way.yaml"), "--json"]);
  assert.equal(r.status, 0);
  assert.equal(r.json.ok, true);
});
check("a missing way says how to make one", "first-run users have no way.yaml yet", () => {
  const r = run(["lint", "--way", join(dir, "nope.yaml")]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /run \/gestalt:way/);
});
check("unknown options are usage errors (exit 2)", "a typo must not run with defaults", () => {
  assert.equal(run(["lint", "--wya", "x"]).status, 2);
});

finish();
