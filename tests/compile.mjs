// compile is what reaches a harness. It must be byte-stable (goldens and --check depend on
// it), refuse anything lint rejects, stay inside its token budget, and emit kitctl documents
// that kitctl itself accepts.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check, finish, group, run, skip, tempDir, FIXTURES, ROOT } from "./harness.mjs";
import { readWay } from "../tools/lib/way.mjs";
import { compileWay } from "../tools/lib/compile.mjs";
import { expectedTrace } from "../tools/lib/render-taste.mjs";
import { V2_LOADOUT_KEYS } from "../tools/lib/kit-emit.mjs";
import { parseYaml } from "../tools/lib/yaml.mjs";
import { frontmatter } from "../tools/lib/tokens.mjs";

const fullPath = join(FIXTURES, "ways", "full.way.yaml");
const minimalPath = join(FIXTURES, "ways", "minimal.way.yaml");
const compile = path => { const { way, catalog, problems } = readWay(path); return compileWay(way, catalog, { problems }); };

group("compile");
check("the full fixture compiles, twice, to identical bytes", "goldens and --check compare bytes; any nondeterminism is permanent drift", () => {
  const a = compile(fullPath);
  const b = compile(fullPath);
  assert.ok(a.ok, JSON.stringify(a.lint.problems.filter(p => p.severity === "error")));
  assert.deepEqual(a.files, b.files);
  for (const f of ["WAY.md", "SETUP.md", "TASTE-TEST.md", "block.md", "block.code.md", "block.writing.md", "kit/loadouts/gestalt-flow.yaml", "kit/kit.code.yaml", "agents/claude/tracker.md", "workers/prose.sh"]) assert.ok(f in a.files, f);
});
check("compile refuses a way lint rejects", "nothing that contradicts the principles may reach a harness", () => {
  const r = compile(join(FIXTURES, "lint", "GST-GATE.way.yaml"));
  assert.equal(r.ok, false);
  assert.deepEqual(r.files, {});
});
check("compile refuses a block over its token budget", "the block is the one always-on cost Gestalt adds; it must hold its own line", () => {
  const { way, catalog, problems } = readWay(fullPath);
  way.budgets.block_tokens = 120;
  const r = compileWay(way, catalog, { problems });
  assert.equal(r.ok, false);
  assert.ok(r.lint.problems.some(p => p.code === "GST-BUDGET" && p.where === "block"));
});

group("the block");
check("base and context blocks are marked, and a context adds only its own lines", "a repo loads the base block and its context block together; repeats would double-charge every turn", () => {
  const { files } = compile(fullPath);
  assert.match(files["block.md"], /^<!-- gestalt:begin way -->\n[\s\S]*<!-- gestalt:end way -->\n$/);
  assert.match(files["block.code.md"], /^<!-- gestalt:begin way\.code -->/);
  const base = new Set(files["block.md"].split("\n").filter(l => l.startsWith("- ")));
  for (const line of files["block.code.md"].split("\n").filter(l => l.startsWith("- "))) assert.ok(!base.has(line), line);
});
check("the Stop order, hand-off, fallback and routes are in the block", "these are the lines that sequence the tools; without them the block is decoration", () => {
  const { files } = compile(fullPath);
  assert.match(files["block.code.md"], /verification-gate gates \(hook\) → elonify diff-review \(hook\) ∥ verification-gate critics; when Stop hooks fire together, answer in that order, then compounder stop-lines, then platform git-check\./);
  assert.ok(!/plan-review/.test(files["block.code.md"]), "a single step its own snippet already triggers is not restated");
  assert.ok(!/Trivial turns/.test(files["block.md"]), "the skip clause is each tool's own");
  assert.match(files["block.code.md"], /On elonify diff-review REFRAME: .*offer \/cairn to log it as a choice/);
  assert.match(files["block.md"], /\(Codex\) At session start run `cairn debt`/);
  assert.match(files["block.writing.md"], /Route drafting prose in my voice → `sh ~\/\.gestalt\/build\/workers\/prose\.sh/);
  assert.ok(!/critics/.test(files["block.writing.md"].split("\n").filter(l => l.startsWith("- Route")).join("")), "plugin agents are routed by their own snippets");
});
check("the block never restates a tool's own snippet", "two copies of elonify's gate drift apart (vonnegut wiring rule)", () => {
  const { files } = compile(fullPath);
  const all = Object.entries(files).filter(([k]) => k.startsWith("block")).map(([, v]) => v).join("\n");
  assert.ok(!all.includes("<!-- elonify -->") && !all.includes("Self-verification gate"));
});
check("rituals stay out of the block", "cadence in every turn's context is exactly the bloat Gestalt removes", () => {
  const { files } = compile(fullPath);
  assert.ok(!/checkin|cairn review|trim/.test(files["block.md"] + files["block.code.md"]));
  assert.match(files["WAY.md"], /\*\*daily\*\*: compounder checkin/);
});

group("kitctl output");
check("loadout keys are kitctl V2 keys; kit.yaml has exactly three keys", "kitctl rejects unknown keys (engine.py read_intent)", () => {
  const { files } = compile(fullPath);
  for (const [path, text] of Object.entries(files)) {
    if (path.startsWith("kit/loadouts/")) for (const k of Object.keys(parseYaml(text))) assert.ok(V2_LOADOUT_KEYS.includes(k), `${path}: ${k}`);
    if (/^kit\/kit\..+\.yaml$/.test(path)) {
      const intent = parseYaml(text);
      assert.deepEqual(Object.keys(intent), ["schema_version", "loadouts", "harnesses"]);
      assert.ok(intent.harnesses.every(h => ["claude", "codex"].includes(h)));
    }
  }
});
check("existing loadouts are referenced, never rewritten", "brand-studio is the owner's own loadout; Gestalt only points at it", () => {
  const { files } = compile(fullPath);
  assert.deepEqual(parseYaml(files["kit/kit.code.yaml"]).loadouts, ["gestalt-flow", "gestalt-code", "brand-studio"]);
  assert.ok(!Object.keys(files).some(f => f.includes("brand-studio")));
  assert.match(files["kit/gaps.md"], /brand-studio" is referenced, not generated/);
});
check("the block body travels as loadout instructions", "with kitctl present, kitctl owns and writes the block text", () => {
  const { files } = compile(fullPath);
  assert.match(parseYaml(files["kit/loadouts/gestalt-flow.yaml"]).instructions, /^## Way of work/);
  assert.match(parseYaml(files["kit/loadouts/gestalt-code.yaml"]).instructions, /In code \(package\.json present\)/);
});

const kitctl = (() => {
  if (spawnSync("kitctl", ["--version"], { encoding: "utf8" }).status === 0) return ["kitctl"];
  const sibling = join(ROOT, "..", "kitctl");
  if (existsSync(join(sibling, "pyproject.toml")) && spawnSync("uv", ["--version"]).status === 0) return ["uv", "run", "--quiet", "--project", sibling, "kitctl"];
  return null;
})();
// Shape check only: every ref is stubbed from itself (no real warehouse here), and MCP
// stubs are http so they avoid kitctl's crash on external MCP (docs/upstream.md).
function kitctlValidate(loadoutTexts) {
  const wh = tempDir();
  mkdirSync(join(wh, "loadouts"), { recursive: true });
  const refs = new Set();
  const provides = {};
  for (const [name, text] of Object.entries(loadoutTexts)) {
    writeFileSync(join(wh, "loadouts", name), text);
    const doc = parseYaml(text);
    for (const [slot, ref] of Object.entries(doc.slots ?? {})) (provides[ref] ??= []).push(slot);
    for (const r of [...(doc.plugins ?? []), ...(doc.skills ?? []), ...(doc.disable ?? []), ...Object.values(doc.mcp ?? {}).map(m => m.primitive)]) refs.add(r);
  }
  for (const ref of refs) {
    const [kind, name] = ref.split(":");
    const dir = join(wh, "primitives", { plugin: "plugins", skill: "skills", mcp: "mcp" }[kind], ...name.split("/").slice(0, -1));
    mkdirSync(dir, { recursive: true });
    const stub = kind === "mcp"
      ? `schema_version: 2\nkind: mcp\nname: ${name}\ndescription: stub\ntransport: http\nurl: https://example.com/mcp\n`
      : `schema_version: 2\nkind: ${kind}\nname: ${name}\ndescription: stub\nexternal: true\nharnesses: { claude: {}, codex: {} }\n${provides[ref] ? `provides: [${provides[ref].join(", ")}]\n` : ""}`;
    writeFileSync(join(dir, `${name.split("/").pop()}.yaml`), stub);
  }
  const r = spawnSync(kitctl[0], [...kitctl.slice(1), "validate", wh, "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).problems, []);
}
const loadoutsOf = files => Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith("kit/loadouts/")).map(([p, t]) => [p.split("/").pop(), t]));
const exampleKits = [];
for (const base of [join(ROOT, "examples", "connor"), ...(existsSync(join(ROOT, "examples", "personas")) ? readdirSync(join(ROOT, "examples", "personas")).map(d => join(ROOT, "examples", "personas", d)) : [])]) {
  const dir = join(base, "out", "kit", "loadouts");
  if (existsSync(dir)) exampleKits.push([base.slice(ROOT.length + 1), Object.fromEntries(readdirSync(dir).map(f => [f, readFileSync(join(dir, f), "utf8")]))]);
}
if (!kitctl) {
  skip("kitctl validate accepts the emitted loadouts", "kitctl not on PATH and no sibling checkout with uv");
} else {
  check("kitctl validate accepts the emitted loadouts (schema; refs stubbed)", "the loadouts are only useful if the real compiler accepts their shape", () => kitctlValidate(loadoutsOf(compile(fullPath).files)));
  for (const [name, kit] of exampleKits) check(`kitctl validate accepts ${name}'s committed loadouts (schema; refs stubbed)`, "the examples are what people copy", () => kitctlValidate(kit));
}

group("workers");
check("a subagent is a user agent file with model and inline MCP", "plugin agents ignore mcpServers, so isolation needs a user agent file", () => {
  const { files } = compile(fullPath);
  const { data, body } = frontmatter(files["agents/claude/tracker.md"]);
  assert.equal(data.model, "sonnet");
  assert.deepEqual(data.mcpServers, ["github", { linear: { type: "http", url: "https://mcp.linear.app/mcp" } }]);
  assert.match(body, /original request, verbatim/);
});
check("a headless worker script parses and isolates its plugin", "the lead must not load what the worker loads", () => {
  const out = tempDir();
  const { files } = compile(fullPath);
  writeFileSync(join(out, "prose.sh"), files["workers/prose.sh"]);
  assert.equal(spawnSync("sh", ["-n", join(out, "prose.sh")]).status, 0);
  assert.match(files["workers/prose.sh"], /claude -p --model sonnet --strict-mcp-config --plugin-dir "\$\{GESTALT_PLUGIN_PROSE_AUTHOR/);
  assert.match(files["workers/prose.prompt.md"], /original request, verbatim/);
});
check("no Codex agent files until their fields are verified", "config that may not load must not look finished", () => {
  const { files } = compile(fullPath);
  assert.ok(!Object.keys(files).some(f => f.startsWith("agents/codex/")));
  assert.match(files["workers/prose.sh"], /# Codex alternative \(unverified flags\): codex exec -m gpt-worker/);
});

group("taste");
check("expected traces follow the context and path", "the taste test is only fair if the expected trace is computed, not guessed", () => {
  const { way, catalog } = readWay(fullPath);
  const build = expectedTrace(way, catalog, way.taste[1]);
  assert.equal(build.scenario, "code");
  assert.deepEqual(build.fires.map(f => f.id), ["cairn.debt", "compounder.brief", "elonify.plan-review", "verification-gate.gates", "elonify.diff-review", "verification-gate.critics", "compounder.stop-lines"]);
  assert.deepEqual(build.onAsk.map(f => f.id), ["cairn.capture"]);
  assert.equal(build.stopOrder.length, 4);
  const orient = expectedTrace(way, catalog, way.taste[0]);
  assert.deepEqual(orient.quiet, ["compounder stop-lines"]);
  assert.ok(!orient.fires.some(f => f.stage === "check"));
  const write = expectedTrace(way, catalog, way.taste[2]);
  assert.deepEqual(write.workers.map(w => w.id), ["prose", "critics"]);
});

group("cli");
check("compile writes, --check passes, a hand edit is caught, a stale file is removed", "--check is the drift test the plan relies on", () => {
  const out = tempDir();
  assert.equal(run(["compile", "--way", fullPath, "--out", out]).status, 0);
  assert.equal(run(["compile", "--way", fullPath, "--out", out, "--check"]).status, 0);
  writeFileSync(join(out, "WAY.md"), "hand edit\n");
  const r = run(["compile", "--way", fullPath, "--out", out, "--check"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /changed WAY\.md/);
  writeFileSync(join(out, "notes.md"), "mine\n");
  assert.match(run(["compile", "--way", fullPath, "--out", out, "--check"]).stdout, /extra notes\.md/);
  assert.equal(run(["compile", "--way", minimalPath, "--out", out]).status, 0);
  assert.ok(!existsSync(join(out, "workers", "prose.sh")), "files from the previous way are removed");
  assert.ok(existsSync(join(out, "block.code.md")));
});
check("compile on a rejected way exits 1 and prints the codes", "the skill shows the codes to the person", () => {
  const r = run(["compile", "--way", join(FIXTURES, "lint", "GST-SLOT.way.yaml"), "--out", tempDir()]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /GST-SLOT/);
});

finish();
