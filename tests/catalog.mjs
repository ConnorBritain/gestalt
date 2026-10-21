// The catalog is the only place Gestalt states facts about other tools. A wrong stage or a
// missing "blocking: true" makes lint wave through a real collision, so entries are checked
// here and, when a sibling checkout is present, re-measured against it.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { check, finish, group, skip } from "./harness.mjs";
import { loadCatalog, indexCatalog, validateEntry, REF_RE, STAGE_KINDS } from "../tools/lib/catalog.mjs";
import { frontmatter, listingCost } from "../tools/lib/tokens.mjs";

const cat = loadCatalog();

group("catalog");
check("every shipped entry validates", "an invalid entry would make lint silently skip a primitive", () => {
  assert.deepEqual(cat.problems, []);
  assert.ok(cat.entries.size >= 16, `only ${cat.entries.size} entries`);
});
check("refs are kitctl refs and unique", "compile emits these refs into kitctl loadouts; a bad ref fails kitctl validate", () => {
  for (const e of cat.entries.values()) assert.match(e.ref, REF_RE, e.id);
  assert.equal(cat.byRef.size, cat.entries.size);
});
check("every step's kind may sit at its stage", "a generator at the check stage is the flow error lint exists to catch", () => {
  for (const s of cat.steps.values()) assert.ok(STAGE_KINDS[s.stage].includes(s.kind), s.id);
});
check("blocking hooks name a mechanism and what they serve", "GST-GATE counts blocking hooks per event; an unattributed one cannot be ordered", () => {
  for (const e of cat.entries.values()) for (const h of e.hooks ?? []) {
    if (h.blocking) { assert.ok(h.mechanism, `${e.id} ${h.event}`); if (h.event === "Stop") assert.ok(h.serves, `${e.id} Stop`); }
  }
});
check("known Stop blockers are recorded", "the elonify / compounder / gate-runner / trail collision is the first thing Gestalt resolves", () => {
  const stopBlockers = [...cat.entries.values()].filter(e => (e.hooks ?? []).some(h => h.event === "Stop" && h.blocking)).map(e => e.id).sort();
  assert.deepEqual(stopBlockers, ["compounder", "elonify", "trail", "verification-gate"]);
});
check("validator rejects planted defects", "a validator that accepts anything protects nothing", () => {
  const bad = { id: "x", ref: "plugin:X!", kind: "plugin", harness: { claude: "sometimes" }, steps: [{ id: "x.a", stage: "check", kind: "author", mode: "loud" }], hooks: [{ event: "Stop", blocking: true }] };
  const problems = validateEntry(bad).join("\n");
  for (const want of [/not a kitctl ref/, /cannot sit at stage check/, /mode must be/, /names its mechanism/, /harness.claude/]) assert.match(problems, want);
  assert.deepEqual(validateEntry({ id: "y", ref: "plugin:y", kind: "plugin" }), ["y: harness enforcement is required (never leave portability implicit)"]);
});
check("knob values and unblocked_by are checked against the entry", "an unblocked_by naming a missing knob would silently unblock nothing (or everything)", () => {
  const entry = {
    id: "z", ref: "plugin:z", kind: "plugin", harness: { claude: "enforced" },
    steps: [{ id: "z.r", stage: "record", kind: "recorder", mode: "ambient" }],
    knobs: [{ key: "mode", default: "loud", values: ["block", "quiet"] }],
    hooks: [
      { event: "Stop", blocking: true, mechanism: "decision-block", serves: "z.r", unblocked_by: { setting: "mood", value: "quiet", harness: ["claude"] } },
      { event: "Stop", blocking: true, mechanism: "decision-block", serves: "z.r", unblocked_by: { setting: "mode", value: "silent", harness: ["vim"], extra: 1 } },
      { event: "PostToolUse", blocking: false, mechanism: "context", unblocked_by: { setting: "mode", value: "quiet", harness: ["claude"] } },
    ],
  };
  const problems = validateEntry(entry).join("\n");
  for (const want of [/default "loud" is not one of its values/, /setting "mood" is not a knob of z/, /value "silent" is not one of the knob's values/, /harness must list/, /unknown key "extra"/, /only a blocking hook can be unblocked/]) assert.match(problems, want);
  const stop = cat.entries.get("compounder").hooks.find(h => h.event === "Stop");
  assert.deepEqual(stop.unblocked_by, { setting: "rules.stop_mode", value: "context", harness: ["claude"] }, "compounder 0.3.0's stop_mode context unblocks Claude Code only");
});
check("a way-local entry may override a shipped one", "the user's installed version can differ from what the catalog last saw", () => {
  const e = cat.entries.get("cairn");
  const idx = indexCatalog([{ ...e, origin: "catalog/cairn.yaml" }, { ...e, version_seen: "9.9.9", origin: "way" }]);
  assert.deepEqual(idx.problems, []);
  assert.equal(idx.entries.get("cairn").version_seen, "9.9.9");
});

// Re-measure against sibling checkouts when they exist (the author's machine and this
// build's session); a fresh clone of gestalt alone skips this with a note.
const SIBLINGS = {
  elonify: "../elonify", cairn: "../cairn", compounder: "../compounder", roadmap: "../roadmap",
  "ui-magic": "../ui-magic/plugins/ui-magic", "brand-builder": "../brand-builder/plugins/brand-builder",
  "prose-author": "../vonnegut/bundles/prose-author", "prose-review": "../vonnegut/bundles/prose-review",
  "prose-tell-scan": "../vonnegut/bundles/prose-tell-scan", "prose-outline": "../vonnegut/bundles/prose-outline",
  "prose-research": "../vonnegut/bundles/prose-research",
  "verification-gate": "../connorbritain/agent-primitives/bundles/verification-gate",
  gestalt: ".",
};
group("catalog cost vs sibling checkouts");
for (const [id, rel] of Object.entries(SIBLINGS)) {
  const dir = join(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..", rel);
  if (!existsSync(dir)) { skip(`${id} cost matches its checkout`, `no checkout at ${rel}`); continue; }
  check(`${id} cost matches its checkout exactly`, "lint and trim rank by cost; a stale number misranks what to cut", () => {
    let tok = 0;
    const count = { skills: 0, agents: 0, commands: 0 };
    for (const [sub, isSkill] of [["skills", true], ["agents", false], ["commands", false]]) {
      const p = join(dir, sub); if (!existsSync(p)) continue;
      for (const e of readdirSync(p)) {
        const f = isSkill ? join(p, e, "SKILL.md") : join(p, e);
        if (!existsSync(f) || (!isSkill && !e.endsWith(".md"))) continue;
        const { data } = frontmatter(readFileSync(f, "utf8"));
        if (data["disable-model-invocation"] === true) continue; // runs by name; not listed
        tok += listingCost(data.name ?? e, data.description);
        count[sub] += 1;
      }
    }
    const c = cat.entries.get(id).cost;
    assert.deepEqual({ listing_tokens: tok, skills: count.skills, agents: count.agents }, { listing_tokens: c.listing_tokens, skills: c.skills, agents: c.agents }, `update catalog/${id}.yaml`);
  });
}

finish();
