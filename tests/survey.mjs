// The survey is the only part of Gestalt that reads a person's real machine. It must never
// leak a secret, never execute anything, and report the same bytes for the same inputs
// (goldens), because trim and lint reason from its numbers.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check, finish, group, run, skip, tempDir, FIXTURES, ROOT } from "./harness.mjs";
import { survey, renderSurvey, triggerIn } from "../tools/lib/survey.mjs";
import { scanToml } from "../tools/lib/toml-scan.mjs";

const NOW = new Date("2026-10-20T12:00:00Z");
const homes = join(FIXTURES, "homes");
const app = join(FIXTURES, "repos", "app");
const connor = () => survey({ home: join(homes, "connor"), repos: [app], usageDays: 30, now: NOW });
const cowork = () => survey({ home: join(homes, "cowork-analyst"), now: NOW });

function golden(name, value) {
  const file = join(FIXTURES, "homes", `${name}.survey.json`);
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (process.env.GESTALT_UPDATE_SURVEY_GOLDENS) writeFileSync(file, text);
  assert.ok(existsSync(file), `${name} golden is missing; create it with GESTALT_UPDATE_SURVEY_GOLDENS=1 and review it`);
  assert.equal(text, readFileSync(file, "utf8"), `${name} survey drifted from its golden (GESTALT_UPDATE_SURVEY_GOLDENS=1 to accept, then review the diff)`);
}

group("survey goldens");
check("connor home + app repo matches its golden", "lint and the trim skill read these numbers; a silent change re-ranks what to cut", () => golden("connor", connor()));
check("cowork analyst home matches its golden", "synced org plugins are the enterprise case", () => golden("cowork-analyst", cowork()));

group("safety");
check("no planted secret appears in JSON or markdown", "env values, args, headers, URLs, account data and trust entries must never leave the machine through a survey", () => {
  const s = connor();
  const text = JSON.stringify(s) + renderSurvey(s);
  assert.equal(text.match(/SECRET/g), null, text.match(/.{40}SECRET.{20}/)?.[0]);
  assert.ok(!text.includes("lin_api_") && !text.includes("sk-ant"));
});
check("symlinked skills and plugin dirs are skipped", "a symlink can point outside the home being surveyed", () => {
  const home = tempDir();
  cpSync(join(homes, "connor"), home, { recursive: true });
  mkdirSync(join(home, "elsewhere", "evil"), { recursive: true });
  writeFileSync(join(home, "elsewhere", "evil", "SKILL.md"), "---\nname: evil\ndescription: should not be read\n---\n");
  symlinkSync(join(home, "elsewhere", "evil"), join(home, ".claude", "skills", "evil"));
  const s = survey({ home, now: NOW });
  assert.ok(!JSON.stringify(s).includes("should not be read"));
  assert.ok(!s.loose.some(u => u.name === "evil"));
});
check("an empty home is silent and zero", "first-run users and fresh containers must get a clean report, not an error", () => {
  const s = survey({ home: join(homes, "empty"), now: NOW });
  assert.equal(s.totals.always_on_tokens, 0);
  assert.deepEqual([s.plugins.length, s.collisions.length, s.triggers.length], [0, 0, 0]);
  assert.match(renderSurvey(s), /None found/);
});
check("invalid JSON settings are reported, not thrown", "one broken file must not hide the rest of the harness", () => {
  const home = tempDir();
  mkdirSync(join(home, ".claude"), { recursive: true });
  writeFileSync(join(home, ".claude", "settings.json"), "{ not json");
  const s = survey({ home, now: NOW });
  assert.ok(s.notes.some(n => /not valid JSON/.test(n)));
});

group("what it finds");
check("Stop blockers include plugins, unknowns and the platform gate", "the four-way Stop collision is the first thing Gestalt resolves", () => {
  const s = connor();
  assert.deepEqual(s.stop_blockers, ["elonify", "compounder", "acme-guard", "platform:stop-hook-git-check"]);
  assert.ok(s.collisions.some(c => c.code === "GST-C-STOP"));
});
check("project settings override user settings for enabled plugins", "roadmap is off at user scope and on in this repo; the repo wins", () => {
  assert.equal(connor().plugins.find(p => p.name === "roadmap").enabled, true);
  assert.equal(survey({ home: join(homes, "connor"), now: NOW }).plugins.find(p => p.name === "roadmap").enabled, false);
});
check("a disabled plugin costs nothing", "trim's first move is often disable-in-context; the survey must reflect it", () => {
  const without = survey({ home: join(homes, "connor"), now: NOW });
  const withRepo = connor();
  assert.ok(withRepo.totals.by_kind.skills > without.totals.by_kind.skills);
});
check("managed-block markers: duplicates found, prose mentions ignored", "a second installer run duplicating a snippet is a real defect; a backticked mention is not", () => {
  const s = connor();
  assert.ok(s.collisions.some(c => c.code === "GST-C-MARKER" && /elonify/.test(c.message)));
  assert.ok(!s.instructions.some(i => i.markers.some(m => m.startsWith("gestalt"))));
});
check("a skill that runs by name is counted apart and costs no listing", "the skills budget counts what the model is shown; a hidden ritual is not shown", () => {
  const roadmap = connor().plugins.find(p => p.name === "roadmap");
  assert.equal(roadmap.hidden_skills, 1);
  assert.equal(roadmap.skills, 4);
  assert.equal(roadmap.units.find(u => u.name === "retro").listing_tokens, 0);
  const t = connor().totals;
  assert.equal(t.hidden_skills, 1);
  assert.match(renderSurvey(connor()), / listed skills \(and 1 that run by name only\)/);
});
check("Trail's AGENTS.md section is recognised as a marker", "the survey must show which tool wrote which block", () => {
  const codex = connor().instructions.find(i => i.harness === "codex" && /\.codex/.test(i.path));
  assert.deepEqual(codex.markers.filter(m => m.startsWith("trail")), ["trail:start", "trail:end"]);
});
check("CLAUDE.md = @AGENTS.md is costed once, through the import", "double-counting would overstate the lead's load", () => {
  const s = connor();
  assert.equal(s.instructions.filter(i => i.path === "<repo>/AGENTS.md").length, 1);
});
check("synced org plugins are found and aggressive triggers flagged", "Cowork pushes org plugins the user never chose; their cost and grabs must be visible", () => {
  const s = cowork();
  assert.equal(s.plugins.length, 3);
  assert.equal(s.totals.skills, 22);
  assert.equal(s.triggers.length, 1);
  assert.ok(s.plugins.every(p => p.enabled === true && p.scope === "synced"));
});
check("usage: plugin counters and transcript counts, names only", "trim weighs cost against use; prompts and inputs must not be read into the report", () => {
  const s = connor();
  assert.equal(s.usage.plugin_counters["compounder@compounder"], 40);
  assert.deepEqual(s.usage.transcripts.skills, { "compounder:checkin": 2 });
  assert.deepEqual(s.usage.transcripts.mcp, { linear: 1 });
  assert.deepEqual(s.usage.transcripts.commands, { "elonify:review": 1 });
  assert.equal(survey({ home: join(homes, "connor"), now: NOW }).usage.transcripts, null, "transcripts only with --usage");
});
check("trigger heuristic: shouting is case-sensitive", "\"mandatory citations\" in prose is not a grab for every turn", () => {
  assert.equal(triggerIn("The citation rules: mandatory [N] citations"), null);
  assert.equal(triggerIn("MANDATORY: run first"), "MANDATORY");
  assert.equal(triggerIn("Use proactively after any edit"), "Use proactively");
});

check("MCP name collisions across scopes are reported", "the same server defined twice connects twice", () => {
  assert.ok(connor().collisions.some(c => c.code === "GST-C-MCP" && /linear/.test(c.message)));
});
check("two generators for the same job collide (GST-C-SLOT)", "ui-magic and brand-builder in one repo make two edit hooks and two opinions", () => {
  const dir = tempDir();
  for (const name of ["ui-magic", "brand-builder"]) {
    mkdirSync(join(dir, name, ".claude-plugin"), { recursive: true });
    writeFileSync(join(dir, name, ".claude-plugin", "plugin.json"), JSON.stringify({ name, version: "0.0.0" }));
  }
  const s = survey({ home: join(homes, "empty"), plugins: [join(dir, "ui-magic"), join(dir, "brand-builder")], now: NOW });
  assert.equal(s.collisions.filter(c => c.code === "GST-C-SLOT").length, 1);
});
check("the survey code never spawns a process", "the survey must not execute a hook, a server or a script", () => {
  for (const f of ["survey.mjs", "survey-cli.mjs", "toml-scan.mjs", "tokens.mjs", "catalog.mjs"]) {
    assert.ok(!/child_process|\bspawn|\bexec(File)?Sync\b/.test(readFileSync(join(ROOT, "tools", "lib", f), "utf8")), f);
  }
});

group("the author's survey");
{
  const H = join(ROOT, "..");
  const V = join(H, "vonnegut", "bundles");
  const dirs = [join(H, "elonify"), join(H, "cairn"), join(H, "compounder"), join(H, "roadmap"), join(H, "ui-magic", "plugins", "ui-magic"), join(H, "brand-builder", "plugins", "brand-builder"), join(V, "prose-author"), join(V, "prose-review"), join(V, "prose-tell-scan"), join(H, "connorbritain", "agent-primitives", "bundles", "verification-gate"), ROOT];
  if (!dirs.every(d => existsSync(d))) skip("examples/connor/survey is re-derived from the checkouts", "sibling checkouts not present");
  else check("examples/connor/survey is re-derived from the checkouts", "the example claims to be measured; a hand edit or a stale file would not be", () => {
    const fresh = survey({ home: H, plugins: dirs, now: NOW });
    const committed = JSON.parse(readFileSync(join(ROOT, "examples", "connor", "survey", "survey.json"), "utf8"));
    delete fresh.generated_at; delete committed.generated_at;
    assert.deepEqual(fresh, committed, "re-run the survey command in examples/connor/README.md and commit the result");
  });
}

group("toml scanner");
check("quoted keys, array tables, inline values kept raw, trust state skipped", "Codex config is TOML; the survey reads names and booleans from it, nothing else", () => {
  const t = scanToml(readFileSync(join(homes, "connor", ".codex", "config.toml"), "utf8"));
  assert.deepEqual(Object.keys(t.mcp_servers), ["linear", "docs.search"]);
  assert.equal(t.mcp_servers["docs.search"].enabled, false);
  assert.equal(t.plugins["cairn@cairn"].enabled, true);
  assert.equal(t.hooks, undefined);
  assert.equal(t.skills.config[0].name, "big-skill");
});

group("cli");
check("survey --out writes survey.json and SURVEY.md", "the way skill reads the JSON and shows the markdown", () => {
  const out = tempDir();
  const r = run(["survey", "--home", join(homes, "connor"), "--repo", app, "--out", out]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(out, "survey.json")) && existsSync(join(out, "SURVEY.md")));
});
check("--usage needs a number", "a typo must not silently skip usage", () => {
  assert.equal(run(["survey", "--home", join(homes, "empty"), "--usage", "lots"]).status, 2);
});

finish();
