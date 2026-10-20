#!/usr/bin/env node
// Packaging invariants. Each assertion is a way an installed copy could silently differ from
// the checkout: a version that disagrees between harnesses, a skill with harness-specific
// frontmatter, a drifted copy of a shared library, a doc link that no longer resolves.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(join(root, p), "utf8");
const json = p => JSON.parse(read(p));

// One version everywhere: package.json is the pin, STATUS.md mirrors it (check-status).
const { version } = json("package.json");
const manifests = [".claude-plugin/plugin.json", ".codex-plugin/plugin.json", ".cursor-plugin/plugin.json", ".plugin/plugin.json"];
for (const m of manifests) {
  const manifest = json(m);
  assert.equal(manifest.name, "gestalt", `${m} name`);
  assert.equal(manifest.version, version, `${m} version`);
  assert.equal(manifest.repository, "https://github.com/ConnorBritain/gestalt", `${m} repository`);
}
const market = json(".claude-plugin/marketplace.json");
assert.equal(market.plugins.length, 1);
assert.equal(market.plugins[0].name, "gestalt");
assert.equal(market.plugins[0].version, version, "marketplace entry version");
assert.equal(market.plugins[0].source, "./");
const codexMarket = json(".agents/plugins/marketplace.json");
assert.equal(codexMarket.plugins[0].name, "gestalt");
assert.equal(json(".codex-plugin/plugin.json").skills, "skills");

// CLAUDE.md is a pointer, so the two instruction files cannot drift.
assert.equal(read("CLAUDE.md"), "@AGENTS.md\n", "CLAUDE.md must be exactly @AGENTS.md");
assert.ok(!existsSync(join(root, ".github/workflows")), "No GitHub Actions workflows: node tools/check.mjs is the gate");
assert.deepEqual(Object.keys(json("package.json").dependencies ?? {}), [], "No runtime dependencies");

// Skills: frontmatter is name + description only, so one SKILL.md serves every harness.
// Every PLUGIN/<path> a skill names must exist, or an installed skill points at nothing.
let skills = 0;
if (existsSync(join(root, "skills"))) {
  for (const name of readdirSync(join(root, "skills"))) {
    const file = `skills/${name}/SKILL.md`;
    if (!existsSync(join(root, file))) continue;
    skills += 1;
    const text = read(file);
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
    assert.ok(fm, `${file}: frontmatter`);
    const keys = fm[1].split("\n").filter(l => /^[a-z-]+:/.test(l)).map(l => l.split(":")[0]);
    assert.deepEqual(keys, ["name", "description"], `${file}: frontmatter keys`);
    assert.match(fm[1], new RegExp(`^name: ${name}$`, "m"), `${file}: name matches folder`);
    for (const m of text.matchAll(/PLUGIN\/([A-Za-z0-9_./-]+[A-Za-z0-9_-])/g)) {
      assert.ok(existsSync(join(root, m[1])), `${file}: PLUGIN/${m[1]} does not exist`);
    }
  }
}

// Byte-pinned copies of the author's own libraries (never cross-plugin imports: installed
// plugins cannot import each other). A deliberate upstream refresh updates the hash here.
const PINNED = [
  { path: "tools/lib/yaml.mjs", from: "ConnorBritain/ui-magic plugins/ui-magic/scripts/lib/yaml.mjs", sha256: "261e1372" },
];
for (const pin of PINNED) {
  if (!existsSync(join(root, pin.path))) continue;
  const sha = createHash("sha256").update(readFileSync(join(root, pin.path))).digest("hex");
  assert.ok(sha.startsWith(pin.sha256), `${pin.path} drifted from ${pin.from} (sha256 ${sha.slice(0, 12)})`);
}

// Maintained documentation links resolve (golden outputs under examples/ included).
const documents = [];
function visit(dir) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "fixtures") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (entry.name.endsWith(".md")) documents.push(path);
  }
}
visit("");
for (const file of documents) {
  const text = read(file).replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, "");
  for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    const link = match[1].split("#")[0];
    if (!link || /^[a-z]+:|[<> ]/.test(link)) continue;
    assert.ok(existsSync(resolve(root, dirname(file), decodeURIComponent(link))), `${file}: broken link ${link}`);
  }
}

console.log(`Packaging passed: ${manifests.length} manifests and 2 marketplaces at ${version}, ${skills} skills with portable frontmatter, ${documents.length} documents with resolving links, no Actions, no dependencies.`);
