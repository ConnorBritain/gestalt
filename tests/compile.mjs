// compile is what reaches a harness. It must be byte-stable (goldens and --check depend on
// it), refuse anything lint rejects, stay inside its token budget, and emit kitctl documents
// that kitctl itself accepts.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { check, finish, group, run, skip, tempDir, FIXTURES, ROOT } from "./harness.mjs";
import { normaliseWay, readWay } from "../tools/lib/way.mjs";
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
  for (const f of ["WAY.md", "SETUP.md", "TASTE-TEST.md", "BOOTSTRAP.md", "block.md", "block.code.md", "block.writing.md", "kit/loadouts/gestalt-flow.yaml", "kit/kit.code.yaml", "agents/claude/tracker.md", "workers/prose.sh"]) assert.ok(f in a.files, f);
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

check("a subagent worker is a kitctl agent primitive, carried by gestalt-flow", "kitctl writes every native file, agent files included; Gestalt's own copies must be the same bytes", () => {
  const { files } = compile(fullPath);
  const prim = parseYaml(files["kit/primitives/agents/tracker.yaml"]);
  assert.deepEqual(prim, { schema_version: 2, kind: "agent", name: "tracker", description: "Use for logging a decision and linking its Linear issue.", harnesses: ["claude", "codex"] });
  assert.match(files["kit/primitives/agents/tracker.yaml"], /^# Generated by gestalt compile/);
  assert.equal(files["kit/primitives/agents/tracker/claude.md"], files["agents/claude/tracker.md"]);
  assert.equal(files["kit/primitives/agents/tracker/codex.toml"], files["agents/codex/tracker.toml"]);
  assert.equal(frontmatter(files["kit/primitives/agents/tracker/claude.md"]).data.name, "tracker", "kitctl requires the frontmatter name to be the primitive's");
  assert.ok(!Object.keys(files).some(f => /^kit\/primitives\/agents\/(prose|critics)/.test(f)), "headless and agent-file workers are not agent primitives");
  assert.deepEqual(parseYaml(files["kit/loadouts/gestalt-flow.yaml"]).agents, ["agent:tracker"]);
  assert.ok(!("agents" in parseYaml(files["kit/loadouts/gestalt-code.yaml"])), "workers are global: only gestalt-flow lists them");
});
check("an agent primitive lists only the harnesses it has a file for", "kitctl fails a listed harness whose file is missing", () => {
  const raw = parseYaml(readFileSync(fullPath, "utf8"));
  raw.harnesses = ["claude", "cursor"];
  const { way, catalog, problems } = normaliseWay(raw);
  const r = compileWay(way, catalog, { problems });
  assert.deepEqual(parseYaml(r.files["kit/primitives/agents/tracker.yaml"]).harnesses, ["claude"]);
  assert.ok(!("kit/primitives/agents/tracker/codex.toml" in r.files));
  assert.match(r.files["kit/gaps.md"], /agent primitives for Claude Code and Codex only; `agent:tracker` has no Cursor file/);
});
check("the lead's always-on budget travels to kitctl, and a profile that changes it carries its own", "kitctl doctor holds the same limits lint does", () => {
  const raw = parseYaml(readFileSync(fullPath, "utf8"));
  raw.profiles = { full: { description: "More room.", budgets: { skills_per_context: 14 } }, same: { description: "Same limits.", budgets: { block_tokens: 500 } } };
  const { way, catalog, problems } = normaliseWay(raw);
  const r = compileWay(way, catalog, { problems });
  assert.ok(r.ok, JSON.stringify(r.lint.problems.filter(p => p.severity === "error")));
  const flow = parseYaml(r.files["kit/loadouts/gestalt-flow.yaml"]);
  assert.deepEqual(flow.budget, { tokens: 12000, skills: 8 });
  assert.deepEqual(flow.profiles.full.budget, { tokens: 12000, skills: 14 });
  assert.ok(!("budget" in flow.profiles.same), "a profile that keeps the lead's limits adds no budget");
  assert.ok(!("budget" in parseYaml(r.files["kit/loadouts/gestalt-code.yaml"])), "the budget is the lead's, stated once on gestalt-flow");
});
check("SETUP and BOOTSTRAP let kitctl place agents when kitctl writes, and gestalt write otherwise", "one writer per file: with kitctl, gestalt write --agents would be a second writer", () => {
  const { files } = compile(fullPath);
  assert.match(files["SETUP.md"], /Copy `kit\/primitives\/` into the warehouse too \(`~\/kits\/primitives\/`\)/);
  assert.match(files["SETUP.md"], /`tracker`: nothing to place by hand\. `gestalt-flow` lists `agent:tracker`, so kitctl writes `\.claude\/agents\/tracker\.md` and `\.codex\/agents\/tracker\.toml`/);
  assert.ok(!files["SETUP.md"].includes("write --agents"));
  assert.match(files["BOOTSTRAP.md"], /`~\/kits\/primitives\/agents\/tracker\.yaml`, with `~\/kits\/primitives\/agents\/tracker\/claude\.md`/);
  assert.match(files["BOOTSTRAP.md"], /With kitctl, skip the subagent files below/);
  const raw = parseYaml(readFileSync(fullPath, "utf8"));
  raw.writer = "manual";
  const { way, catalog, problems } = normaliseWay(raw);
  const manual = compileWay(way, catalog, { problems }).files;
  assert.match(manual["SETUP.md"], /`gestalt write --agents ~\/\.claude\/agents` places `agents\/claude\/tracker\.md`/);
  assert.ok(!manual["SETUP.md"].includes("kit/primitives"));
  assert.ok(!manual["BOOTSTRAP.md"].includes("With kitctl, skip"));
});
check("SETUP and BOOTSTRAP list each way setting with the owning tool's command", "Gestalt never edits another tool's config; the person changes it with that tool", () => {
  const raw = parseYaml(readFileSync(fullPath, "utf8"));
  raw.settings = { "compounder.rules.stop_mode": "context" };
  const { way, catalog, problems } = normaliseWay(raw);
  const r = compileWay(way, catalog, { problems });
  assert.match(r.files["SETUP.md"], /- \[ \] Set `rules\.stop_mode` to `context` in ~\/\.compounder\/charter\.json with the charter CLI \(`cli\.mjs charter show`, edit the JSON, then `cli\.mjs charter set --file <path>`\) \(compounder\)\./);
  assert.match(r.files["BOOTSTRAP.md"], /compounder: set `rules\.stop_mode` to `context` in ~\/\.compounder\/charter\.json with the charter CLI \(`cli\.mjs charter show`, edit the JSON, then `cli\.mjs charter set --file <path>`\)\./);
  assert.match(r.files["WAY.md"], /Stop gates on claude: verification-gate gates → elonify diff-review → platform git-check; compounder stop-lines still blocks on codex\./);
  assert.match(r.files["WAY.md"], /info \*\*GST-RECORDER-BLOCKS\*\* .*still blocks on codex as the fallback/);
});

const kitctl = (() => {
  if (spawnSync("kitctl", ["--version"], { encoding: "utf8" }).status === 0) return ["kitctl"];
  const sibling = join(ROOT, "..", "kitctl");
  if (existsSync(join(sibling, "pyproject.toml")) && spawnSync("uv", ["--version"]).status === 0) return ["uv", "run", "--quiet", "--project", sibling, "kitctl"];
  return null;
})();
// Shape check only: every ref is stubbed from itself (no real warehouse here), and MCP
// stubs are http so they avoid kitctl's crash on external MCP (docs/upstream.md).
// Agent primitives are not stubbed: the emitted ones (with their files) go in as they are.
function kitctlValidate(loadoutTexts, primitiveFiles = {}) {
  const wh = tempDir();
  mkdirSync(join(wh, "loadouts"), { recursive: true });
  for (const [rel, text] of Object.entries(primitiveFiles)) {
    mkdirSync(dirname(join(wh, rel)), { recursive: true });
    writeFileSync(join(wh, rel), text);
  }
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
    if (kind === "agent") continue;
    const dir = join(wh, "primitives", { plugin: "plugins", skill: "skills", mcp: "mcp" }[kind], ...name.split("/").slice(0, -1));
    mkdirSync(dir, { recursive: true });
    const stub = kind === "mcp"
      ? `schema_version: 2\nkind: mcp\nname: ${name}\ndescription: stub\ntransport: http\nurl: https://example.com/mcp\n`
      : `schema_version: 2\nkind: ${kind}\nname: ${name}\ndescription: stub\nexternal: true\nharnesses: { claude: {}, codex: {} }\n${provides[ref] ? `provides: [${provides[ref].join(", ")}]\n` : ""}`;
    writeFileSync(join(dir, `${name.split("/").pop()}.yaml`), stub);
  }
  const r = spawnSync(kitctl[0], [...kitctl.slice(1), "validate", wh, "--json"], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr, problems: (() => { try { return JSON.parse(r.stdout).problems; } catch { return null; } })() };
}
function assertValid(loadoutTexts, primitiveFiles) {
  const r = kitctlValidate(loadoutTexts, primitiveFiles);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(r.problems, []);
}
// A kitctl from before the agent kind and loadout budget rejects both; say so instead of failing.
const kitctlAgents = kitctl && (() => {
  const loadout = "schema_version: 2\nname: probe\ndescription: probe\nagents: [agent:probe]\nbudget: { tokens: 1, skills: 1 }\n";
  const prim = { "primitives/agents/probe.yaml": "schema_version: 2\nkind: agent\nname: probe\ndescription: probe\nharnesses: [claude]\n", "primitives/agents/probe/claude.md": "---\nname: probe\ndescription: probe\n---\n\nprobe\n" };
  const r = kitctlValidate({ "probe.yaml": loadout }, prim);
  return r.status === 0 && Array.isArray(r.problems) && r.problems.length === 0;
})();
const loadoutsOf = files => Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith("kit/loadouts/")).map(([p, t]) => [p.split("/").pop(), t]));
const primitivesOf = files => Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith("kit/primitives/")).map(([p, t]) => [p.slice(4), t]));
const walk = (dir, rel = "") => existsSync(dir) ? readdirSync(dir).flatMap(n => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${rel}${n}/`) : [`${rel}${n}`])) : [];
const exampleKits = [];
for (const base of [join(ROOT, "examples", "connor"), ...(existsSync(join(ROOT, "examples", "personas")) ? readdirSync(join(ROOT, "examples", "personas")).map(d => join(ROOT, "examples", "personas", d)) : [])]) {
  const dir = join(base, "out", "kit", "loadouts");
  const prims = join(base, "out", "kit", "primitives");
  if (existsSync(dir)) exampleKits.push([base.slice(ROOT.length + 1), Object.fromEntries(readdirSync(dir).map(f => [f, readFileSync(join(dir, f), "utf8")])), Object.fromEntries(walk(prims).map(f => [`primitives/${f}`, readFileSync(join(prims, f), "utf8")]))]);
}
if (!kitctl) {
  skip("kitctl validate accepts the emitted loadouts", "kitctl not on PATH and no sibling checkout with uv");
} else if (!kitctlAgents) {
  skip("kitctl validate accepts the emitted loadouts", "this kitctl predates the agent primitive kind and loadout budget");
} else {
  check("kitctl validate accepts the emitted loadouts and agent primitives (schema; other refs stubbed)", "the loadouts are only useful if the real compiler accepts their shape", () => { const { files } = compile(fullPath); assertValid(loadoutsOf(files), primitivesOf(files)); });
  for (const [name, kit, prims] of exampleKits) check(`kitctl validate accepts ${name}'s committed loadouts and agent primitives (schema; other refs stubbed)`, "the examples are what people copy", () => assertValid(kit, prims));
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
check("a subagent worker gets a Codex agent with only the fields Codex 0.163 accepts", "Codex ignores an agent file with an unknown key or without developer_instructions", () => {
  const { files } = compile(fullPath);
  const toml = files["agents/codex/tracker.toml"];
  assert.match(toml, /^name = "tracker"$/m);
  assert.match(toml, /^developer_instructions = "You are a worker\./m);
  assert.match(toml, /^model = "gpt-worker"$/m);
  assert.match(toml, /^\[mcp_servers\.linear\]\nurl = "https:\/\/mcp\.linear\.app\/mcp"\nbearer_token_env_var = "LINEAR_API_KEY"$/m);
  assert.ok(!Object.keys(files).some(f => f.startsWith("agents/codex/prose")), "headless workers stay scripts");
  assert.match(files["workers/prose.sh"], /# Codex alternative: codex exec -m gpt-worker/);
});

check("on_enter renders numbered in WAY.md and as an ordered checklist in SETUP.md", "the per-repo setup only works in its order", () => {
  const raw = parseYaml(readFileSync(fullPath, "utf8"));
  raw.reflect = { ...(raw.reflect ?? {}), on_enter: ["kitctl.use", "gestalt.block"] };
  const { problems } = readWay(fullPath);
  const dir = tempDir();
  const path = join(dir, "way.yaml");
  writeFileSync(path, JSON.stringify(raw));
  const r = readWay(path);
  assert.deepEqual(r.problems, problems);
  const { files } = compileWay(r.way, r.catalog);
  assert.match(files["WAY.md"], /\*\*on entering a repo, in order\*\*: 1\. kitctl use .* 2\. gestalt block/);
  const setup = files["SETUP.md"];
  assert.ok(setup.indexOf("- [ ] kitctl use:") < setup.indexOf("- [ ] gestalt block:") && setup.includes("### Then, in each repo you start working in, in order"));
});

group("bootstrap");
check("BOOTSTRAP.md carries the way and every generated file, verbatim", "it must set a harness up without Gestalt and without improvising", () => {
  const wayText = readFileSync(fullPath, "utf8");
  const { way, catalog, problems } = readWay(fullPath);
  const { files } = compileWay(way, catalog, { problems, wayText });
  const b = files["BOOTSTRAP.md"];
  assert.ok(b.includes(wayText.trimEnd()), "path A embeds the way");
  for (const f of ["block.md", "block.code.md", "agents/claude/tracker.md", "workers/prose.sh", "kit/loadouts/gestalt-flow.yaml"]) assert.ok(b.includes(files[f].trimEnd()), f);
  assert.match(b, /Never write a secret/);
  assert.match(b, /environment variable `LINEAR_API_KEY`/);
  assert.ok(!/lin_api_|sk-ant/.test(b));
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

group("profiles");
const withProfile = () => {
  const { way, catalog, problems } = readWay(fullPath);
  const raw = parseYaml(readFileSync(fullPath, "utf8"));
  raw.profiles = { full: { description: "Offer the rituals by name.", reflect: { as_needed: ["compounder.focus"] }, offer: true } };
  return { raw, catalog, problems, way };
};
check("a profile becomes a kitctl profile on every Gestalt loadout, carrying only the lines it adds", "kitctl profiles narrow and never add, so the base loadouts must already hold every plugin", () => {
  const { raw } = withProfile();
  const { way, catalog, problems } = normaliseWay(raw);
  const r = compileWay(way, catalog, { problems });
  assert.ok(r.ok, JSON.stringify(r.lint.problems.filter(p => p.severity === "error")));
  for (const [path, text] of Object.entries(r.files).filter(([p]) => /^kit\/loadouts\/gestalt-/.test(p))) {
    const doc = parseYaml(text);
    assert.ok(doc.profiles?.full, `${path} lacks the full profile`);
    assert.deepEqual(Object.keys(doc.profiles.full).filter(k => !["description", "instructions_append"].includes(k)), [], path);
  }
  const flow = parseYaml(r.files["kit/loadouts/gestalt-flow.yaml"]);
  assert.match(flow.profiles.full.instructions_append, /\/compounder:focus/);
  assert.ok(!flow.instructions.includes("/compounder:focus"), "the default block stays lean");
  assert.ok(r.files["profiles/full/block.md"].includes("<!-- gestalt:begin way -->"), "a profile block is whole, under the same marker");
  assert.deepEqual(parseYaml(r.files["kit/profiles/full/kit.code.yaml"]).loadouts, ["gestalt-flow:full", "gestalt-code:full", "brand-studio"], "a warehouse loadout keeps its own name");
  assert.match(r.files["WAY.md"], /## Profiles/);
  assert.match(r.files["SETUP.md"], /gestalt-flow:full/);
});
check("a profile is held to its own block budget", "a fuller profile must not quietly outgrow the leanness contract", () => {
  const { raw } = withProfile();
  raw.profiles.full.budgets = { block_tokens: 150 };
  const { way, catalog, problems } = normaliseWay(raw);
  const r = compileWay(way, catalog, { problems });
  assert.equal(r.ok, false);
  assert.ok(r.lint.problems.some(p => p.code === "GST-BUDGET" && p.where === "profile full: block"));
});

check("a profile that changes a line the default block has is refused (GST-PROFILE)", "kitctl profiles only append; a second, longer check line would leave two orders", () => {
  const raw = parseYaml(readFileSync(minimalPath, "utf8"));
  raw.flow.plan = [{ use: "elonify.plan-review", in: ["code"] }]; // elonify is loaded by default
  raw.profiles = { full: { description: "Adds the diff review.", flow: { check: [{ use: "elonify.diff-review", in: ["code"], after: ["verification-gate.gates"] }] } } };
  const { way, catalog, problems } = normaliseWay(raw);
  const r = compileWay(way, catalog, { problems });
  assert.equal(r.ok, false);
  assert.ok(r.lint.problems.some(p => p.code === "GST-PROFILE" && p.where === "profile full: block code"), JSON.stringify(r.lint.problems));
});
check("SETUP tells a context repo to switch every Gestalt loadout", "switching only gestalt-flow leaves the context block on the old profile", () => {
  const { raw } = withProfile();
  raw.writer = "kitctl";
  const { way, catalog, problems } = normaliseWay(raw);
  const r = compileWay(way, catalog, { problems });
  assert.match(r.files["SETUP.md"], /gestalt-<context>:full/);
});

finish();
