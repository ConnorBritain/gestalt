// write is the one place Gestalt edits a person's files. Every refusal here is a way a
// careless writer would damage a CLAUDE.md, an AGENTS.md or a hand-written agent.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check, finish, group, run, tempDir, FIXTURES } from "./harness.mjs";
import { applyBlock, findBlock } from "../tools/lib/write.mjs";

const full = join(FIXTURES, "ways", "full.way.yaml");
const build = (() => { const out = tempDir(); const r = run(["compile", "--way", full, "--out", out]); assert.equal(r.status, 0, r.stderr); return out; })();
const BLOCK = "<!-- gestalt:begin way -->\n## Way\n- one\n<!-- gestalt:end way -->\n";

group("applyBlock");
check("inserts into an empty file", "first run on a fresh repo", () => {
  assert.equal(applyBlock("", BLOCK, "way"), BLOCK);
});
check("appends after existing text with one blank line, outside text untouched", "a person's own instructions must survive byte for byte", () => {
  const out = applyBlock("# Mine\n\nKeep it short.\n", BLOCK, "way");
  assert.equal(out, `# Mine\n\nKeep it short.\n\n${BLOCK}`);
});
check("replaces in place and is idempotent", "running write twice must change nothing the second time", () => {
  const first = applyBlock(`top\n${BLOCK}bottom\n`, BLOCK.replace("one", "two"), "way");
  assert.equal(first, `top\n${BLOCK.replace("one", "two")}bottom\n`);
  assert.equal(applyBlock(first, BLOCK.replace("one", "two"), "way"), first);
});
check("keeps CRLF line endings", "rewriting a Windows file with LF shows every line as changed", () => {
  const crlf = "a\r\nb\r\n";
  assert.equal(applyBlock(crlf, BLOCK, "way"), `a\r\nb\r\n\r\n${BLOCK.replace(/\n/g, "\r\n")}`);
});
check("rejects nested, unclosed and duplicate markers", "guessing where a broken block ends can delete the person's text", () => {
  assert.throws(() => findBlock(["<!-- gestalt:begin way -->", "<!-- gestalt:begin way.code -->"], "way"), /opens inside/);
  assert.throws(() => findBlock(["<!-- gestalt:begin way -->", "x"], "way"), /never closed/);
  assert.throws(() => findBlock(["<!-- gestalt:end way -->"], "way"), /without a matching begin/);
  const twice = [...BLOCK.trim().split("\n"), ...BLOCK.trim().split("\n")];
  assert.throws(() => findBlock(twice, "way"), /second gestalt:begin way/);
});
check("a context block sits beside the base block", "repos load both; replacing one must not touch the other", () => {
  const base = applyBlock("", BLOCK, "way");
  const ctx = "<!-- gestalt:begin way.code -->\n- code line\n<!-- gestalt:end way.code -->\n";
  const both = applyBlock(base, ctx, "way.code");
  assert.equal(applyBlock(both, BLOCK.replace("one", "uno"), "way"), `${BLOCK.replace("one", "uno")}\n${ctx}`);
});

group("cli");
check("dry run writes nothing; --yes writes; a second --yes is a no-op", "the person sees the change before it lands", () => {
  const dir = tempDir();
  const target = join(dir, "AGENTS.md");
  writeFileSync(target, "# Repo\n");
  const dry = run(["write", "--block", target, "--from", build]);
  assert.equal(dry.status, 0);
  assert.match(dry.stdout, /would add: block way/);
  assert.equal(readFileSync(target, "utf8"), "# Repo\n");
  assert.equal(run(["write", "--block", target, "--from", build, "--yes"]).status, 0);
  assert.match(readFileSync(target, "utf8"), /gestalt:begin way -->/);
  assert.match(run(["write", "--block", target, "--from", build, "--yes"]).stdout, /already up to date/);
});
check("--context writes the context block", "context lines belong in the repos of that kind", () => {
  const target = join(tempDir(), "AGENTS.md");
  assert.equal(run(["write", "--block", target, "--context", "code", "--from", build, "--yes"]).status, 0);
  assert.match(readFileSync(target, "utf8"), /gestalt:begin way\.code/);
});
check("settings.json, config.toml and other files are refused", "native config belongs to kitctl or the person, never to Gestalt", () => {
  for (const name of ["settings.json", "config.toml", "README.md"]) {
    const r = run(["write", "--block", join(tempDir(), name), "--from", build, "--yes"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /refusing/);
  }
});
check("a CLAUDE.md that points at AGENTS.md is refused with the fix", "writing into the pointer would fork the two files", () => {
  const dir = tempDir();
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n");
  const r = run(["write", "--block", join(dir, "CLAUDE.md"), "--from", build, "--yes"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /write the block into AGENTS\.md instead/);
});
check("agents: placed with --yes, hand-written files never overwritten", "a person's own agent with the same name must survive", () => {
  const dir = tempDir();
  assert.match(run(["write", "--agents", dir, "--from", build]).stdout, /would write: .*tracker\.md/);
  assert.ok(!existsSync(join(dir, "tracker.md")));
  assert.equal(run(["write", "--agents", dir, "--from", build, "--yes"]).status, 0);
  assert.ok(existsSync(join(dir, "tracker.md")));
  writeFileSync(join(dir, "tracker.md"), "---\nname: tracker\n---\nmine\n");
  const r = run(["write", "--agents", dir, "--from", build, "--yes"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not generated by gestalt/);
  assert.equal(readFileSync(join(dir, "tracker.md"), "utf8"), "---\nname: tracker\n---\nmine\n");
});
check("agents: a .codex directory gets the Codex agents, with Codex's required fields", "Codex rejects an agent file with an unknown key or without developer_instructions", () => {
  const dir = join(tempDir(), ".codex", "agents");
  assert.equal(run(["write", "--agents", dir, "--from", build, "--yes"]).status, 0);
  const text = readFileSync(join(dir, "tracker.toml"), "utf8");
  const keys = text.split("\n").filter(l => /^[a-z_]+ = /.test(l)).map(l => l.split(" = ")[0]);
  for (const k of ["name", "description", "developer_instructions"]) assert.ok(keys.includes(k), k);
  assert.deepEqual(keys.filter(k => !["name", "description", "developer_instructions", "model", "url", "bearer_token_env_var", "command", "args"].includes(k)), []);
  assert.ok(!existsSync(join(dir, "tracker.md")));
});
check("exactly one of --block or --agents", "an ambiguous write must not guess", () => {
  assert.equal(run(["write", "--from", build]).status, 2);
});

finish();
