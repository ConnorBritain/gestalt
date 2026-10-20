// The way is the one input everything else compiles from. A schema that accepts a goal-less
// way, a literal API key, or a step at the wrong stage would let the compiler produce a
// confident, wrong harness, so each rule is exercised here.
import assert from "node:assert/strict";
import { join } from "node:path";
import { check, finish, group, FIXTURES } from "./harness.mjs";
import { activeEntries, activeSteps, leadEntries, normaliseWay, readWay, scenarios } from "../tools/lib/way.mjs";
import { parseYaml } from "../tools/lib/yaml.mjs";
import { readFileSync } from "node:fs";

const minimalPath = join(FIXTURES, "ways", "minimal.way.yaml");
const base = () => parseYaml(readFileSync(minimalPath, "utf8"));
const codes = raw => normaliseWay(raw).problems.filter(p => p.severity === "error").map(p => p.code);
const messages = raw => normaliseWay(raw).problems.map(p => `${p.code} ${p.where}: ${p.message}`).join("\n");

group("way schema");
check("the minimal fixture is valid", "every other test mutates it; it must start clean", () => {
  const { way, problems } = readWay(minimalPath);
  assert.deepEqual(problems, []);
  assert.equal(way.flow.length, 2);
  assert.equal(way.budgets.block_tokens, 450);
});
check("unknown top-level keys are rejected", "a typo like `stop-order` would silently drop the Stop ordering", () => {
  assert.deepEqual(codes({ ...base(), "stop-order": [] }), ["GST-SCHEMA"]);
});
check("goals are required and capped at three", "a way with no goal cannot be judged; ten goals are a list, not a direction", () => {
  assert.match(messages({ ...base(), person: { name: "x", goals: [] } }), /at least one goal/);
  const four = [1, 2, 3, 4].map(i => ({ id: `g${i}`, text: "t" }));
  assert.match(messages({ ...base(), person: { name: "x", goals: four } }), /at most three goals/);
});
check("credentials are env names only", "a literal token in way.yaml would be committed and compiled into files", () => {
  assert.match(messages({ ...base(), connectors: [{ id: "linear", ref: "mcp:linear", role: "tracker", auth: "lin_api_123abc" }] }), /environment variable NAME/);
  assert.match(messages({ ...base(), connectors: [{ id: "x", ref: "mcp:x", role: "data", server: { type: "http", url: "https://x", env: { TOKEN: "abc" } } }] }), /never a literal/);
});
check("unknown steps are GST-REF with a way to fix it", "a step the catalog does not know must say how to add it, not just fail", () => {
  const raw = base(); raw.flow.check.push({ use: "nope.thing" });
  assert.match(messages(raw), /GST-REF .*add a catalog: entry/);
});
check("a step placed at the wrong stage is GST-ORDER", "a reviewer listed under make would run before the work exists", () => {
  const raw = base(); raw.flow.make = [{ use: "verification-gate.critics" }]; raw.flow.check = [{ use: "verification-gate.gates" }];
  raw.stop_order = []; raw.taste[1].expect_quiet = [];
  assert.ok(codes(raw).includes("GST-ORDER"));
});
check("exactly three taste prompts", "two cannot cover the paths; ten never get run", () => {
  const raw = base(); raw.taste.pop();
  assert.match(messages(raw), /exactly three taste prompts/);
});
check("a way-local catalog entry makes an unknown primitive usable", "tabula-rasa users have plugins the catalog has never seen", () => {
  const raw = base();
  raw.catalog = [{ id: "acme-lint", ref: "plugin:acme-lint", kind: "plugin", confidence: "guess", harness: { claude: "enforced" }, steps: [{ id: "acme-lint.run", stage: "check", kind: "gate", mode: "explicit" }] }];
  raw.flow.check.push({ use: "acme-lint.run", in: ["code"] });
  assert.deepEqual(normaliseWay(raw).problems, []);
});
check("waivers need a reason", "an unexplained waiver is how a gate quietly disappears", () => {
  const raw = base(); raw.flow.check[0].waive = { code: "GST-GATE", reason: "meh" };
  assert.match(messages(raw), /stated reason/);
});

group("scenarios and the lead");
check("scenarios are the always-contexts plus one other at a time", "lint and compile evaluate each kind of repo separately", () => {
  const { way } = readWay(minimalPath);
  assert.deepEqual(scenarios(way).map(s => s.active), [["everywhere"], ["everywhere", "code"]]);
  assert.equal(activeSteps(way, scenarios(way)[0]).length, 0);
  assert.equal(activeSteps(way, scenarios(way)[1]).length, 2);
});
check("a headless worker takes its plugin out of the lead; a subagent does not", "the topology claim (lean lead) must follow the harness facts, not wishful thinking", () => {
  const raw = base();
  raw.flow.make = [{ use: "prose-author.draft" }];
  raw.topology = { workers: [{ id: "prose", tier: "worker", mechanism: "headless", uses: ["prose-author.draft"], route: "drafting prose" }] };
  let { way } = normaliseWay(raw);
  const sc = scenarios(way)[1];
  assert.ok(activeEntries(way, sc).some(e => e.id === "prose-author"));
  assert.ok(!leadEntries(way, sc).some(e => e.id === "prose-author"));
  raw.topology.workers[0].mechanism = "subagent";
  ({ way } = normaliseWay(raw));
  assert.ok(leadEntries(way, sc).some(e => e.id === "prose-author"));
});
check("disable removes an entry from a context", "trim's disable-in-context must change what lint and compile count", () => {
  const raw = base(); raw.disable = { code: ["plugin:verification-gate"] };
  const { way } = normaliseWay(raw);
  assert.equal(activeEntries(way, scenarios(way)[1]).length, 0);
});

finish();
