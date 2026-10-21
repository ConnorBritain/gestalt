// SETUP.md: everything Gestalt will not do itself, as one ordered checklist. Installs,
// wiring snippets, knob changes (with the owning tool's command), the kitctl commands or the
// manual writes, worker placement, and the harnesses kitctl cannot reach.
import { activeEntries, activeSteps, scenarios } from "./way.mjs";
import { label } from "./block.mjs";
import { pilotTaste } from "./render-taste.mjs";

export function renderSetup(way, catalog, { blocks, kit, agentFiles, survey = null, profiles = [] }) {
  const L = [];
  L.push(`# Setup for ${way.person.name}'s way`, "");
  L.push("Gestalt writes only its own block and its own generated files. Everything else is here. Pilot one repo first; roll out the rest once its taste prompt passes.", "");

  // 0. Pilot: the taste prompt that exercises the most steps, in its own context, end to end.
  const pilot = pilotTaste(way, catalog);
  if (pilot) {
    const sc = scenarios(way).find(x => x.name === pilot.tr.scenario);
    const ctx = pilot.t.context;
    // Only what the pilot prompt exercises, plus kitctl when kitctl places the block.
    const used = new Set(pilot.tr.fires.map(f => catalog.steps.get(f.id).entry.id));
    if (way.writer === "kitctl") used.add("kitctl");
    const entries = [...used].map(id => catalog.entries.get(id)).filter(Boolean);
    const snippets = [...new Set(activeSteps(way, sc).filter(f => f.mode === "protocol" && f.step.wiring_marker).map(f => `${f.entry.title}'s \`${f.step.wiring_marker}\``))];
    const opts = [...new Set(activeSteps(way, sc).flatMap(f => (f.entry.hooks ?? []).filter(h => h.serves === f.use && h.opt_in && (f.enforce === "hook" || f.mode === "ambient")).map(h => `\`${h.opt_in}\``)))];
    const marker = way.contexts[ctx].when === "always" ? "any repo" : `one repo with \`${way.contexts[ctx].when.replace(/^file-exists:/, "")}\``;
    L.push(`## Start here: pilot ${marker}`, "");
    L.push(`- [ ] Install ${entries.map(e => e.title ?? e.id).join(", ")} (commands in §1).`);
    if (snippets.length) L.push(`- [ ] Wire ${snippets.join(" and ")} snippet${snippets.length > 1 ? "s" : ""} into that repo's instruction file (§2).`);
    if (opts.length) L.push(`- [ ] Create ${opts.join(" and ")} there.`);
    const blockCmd = way.writer === "kitctl"
      ? `on a branch there, \`kitctl use gestalt-flow\`${kit.files[`loadouts/gestalt-${ctx}.yaml`] ? ` and \`kitctl use gestalt-${ctx}\`` : ""} (each shows its plan and asks first)`
      : `\`gestalt write --block AGENTS.md --yes\`${blocks.contexts.some(b => b.context === ctx) ? ` and \`gestalt write --block AGENTS.md --context ${ctx} --yes\`` : ""} in that repo`;
    L.push(`- [ ] Place the block: ${blockCmd}.`);
    L.push(`- [ ] Run taste prompt ${pilot.i + 1} (${pilot.t.id}) from TASTE-TEST.md in a fresh chat there, and score it from the transcript.`, "");
    L.push("When it passes, roll out the rest below. When it fails, run /gestalt:taste on the result before changing anything else.", "");
  }

  // 1. Install
  const all = new Map();
  for (const sc of scenarios(way)) for (const e of activeEntries(way, sc)) all.set(e.id, e);
  L.push("## 1. Install everything", "");
  for (const e of [...all.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const lines = way.harnesses.map(h => (e.install?.[h] ? `${h}: ${e.install[h].replace(/\.$/, "")}` : null)).filter(Boolean);
    const coverage = way.harnesses.filter(h => (e.harness?.[h] ?? "none") === "none");
    L.push(`- [ ] **${e.title ?? e.id}** (${e.ref})${lines.length ? `: ${lines.join("; ")}` : ""}${coverage.length ? `. _Not available on ${coverage.join(", ")}._` : ""}`);
  }
  for (const c of way.connectors) L.push(`- [ ] **${c.id}** connector (${c.ref}, ${c.role})${c.auth ? `: set \`${c.auth}\` in your environment, never in a file` : ""}${c.optional ? " (optional)" : ""}`);
  L.push("");

  // 2. Wire
  L.push("## 2. Wire the tools' own snippets", "");
  L.push("Protocol steps rely on each tool's wiring snippet in CLAUDE.md / AGENTS.md. Gestalt's block orders them; it does not restate them.", "");
  const markers = new Map();
  for (const sc of scenarios(way)) for (const f of activeSteps(way, sc)) if (f.mode === "protocol" && f.step.wiring_marker) markers.set(f.step.wiring_marker, f);
  const present = new Set((survey?.instructions ?? []).flatMap(i => i.markers));
  if (!markers.size) L.push("- Nothing to wire: no protocol steps carry a snippet.");
  for (const [marker, f] of markers) {
    const found = present.has(marker.replace(/<!--\s*|\s*-->/g, "").trim()) || present.has(f.entry.id);
    L.push(`- [${found ? "x" : " "}] ${f.entry.title}: its \`${marker}\` snippet${found ? " (found by the survey)" : ""}${f.in.length < Object.keys(way.contexts).length ? `, in ${f.in.join(", ")} repos` : ""}.`);
  }
  L.push("");

  // 3. Knobs and opt-ins
  L.push("## 3. Switch on the hooks this way relies on", "");
  const opt = new Map();
  for (const sc of scenarios(way)) {
    for (const f of activeSteps(way, sc)) {
      for (const h of (f.entry.hooks ?? []).filter(x => x.serves === f.use && x.opt_in)) {
        const key = `${h.opt_in}|${f.use}`;
        if (!opt.has(key)) opt.set(key, { f, h, contexts: new Set() });
        for (const c of f.in) if (sc.active.includes(c)) opt.get(key).contexts.add(c);
      }
    }
  }
  for (const { f, h, contexts } of opt.values()) {
    const wanted = f.enforce === "hook" || f.mode === "ambient";
    const where = contexts.size === Object.keys(way.contexts).length ? "everywhere" : `in ${[...contexts].join(", ")} repos`;
    L.push(`- [ ] ${wanted ? "Create" : "Leave off (the step is not hook-enforced in this way)"}: \`${h.opt_in}\` for ${label(f.use, catalog)} (${h.event}${h.blocking ? ", blocks" : ""}), ${where}.`);
  }
  for (const e of all.values()) for (const k of e.knobs ?? []) {
    if (!k.loosening) continue;
    const step = way.flow.find(f => f.entry.id === e.id && way.stop_order.includes(f.use));
    if (step) L.push(`- [ ] Leave \`${k.key}\` at ${JSON.stringify(k.default)} (${e.id}). The Stop order handles the overlap; if the taste test shows it does not, change it with ${k.change_with} (that tool treats it as loosening).`);
  }
  if (!opt.size) L.push("- No opt-in hooks.");
  L.push("");

  // 4. Apply
  L.push("## 4. Apply", "");
  if (way.writer === "kitctl") {
    L.push("kitctl writes native config; Gestalt only emitted the loadouts.", "");
    L.push("- [ ] Copy `kit/loadouts/*.yaml` into your warehouse (`~/kits/loadouts/`). Read `kit/gaps.md` for referenced loadouts.");
    L.push("- [ ] `kitctl validate`, and add a primitive for each one it reports missing (kitctl's docs/model.md).");
    for (const name of Object.keys(kit.files).filter(f => f.startsWith("kit.")).sort()) L.push(`- [ ] In each matching repo, on a branch: copy \`kit/${name}\` to \`kit.yaml\`, then \`kitctl apply\` (it shows the plan and asks first).`);
    L.push("- [ ] For repos with no other context: `kitctl use gestalt-flow`.", "- [ ] `kitctl off <loadout>` is the undo; it restores the original bytes. Kit warns, and does not refuse, on main or a dirty tree (kitctl's docs/apply.md#writing).");
    for (const pr of profiles) L.push(`- [ ] Profile **${pr.name}** (${pr.description.replace(/\.$/, "")}): use \`kit/profiles/${pr.name}/kit.<context>.yaml\` instead of \`kit/kit.<context>.yaml\`; it names every Gestalt loadout with \`:${pr.name}\`. With commands, switch each Gestalt loadout the repo uses: \`kitctl use gestalt-flow:${pr.name}\` and \`kitctl use gestalt-<context>:${pr.name}\`. Switch back the same way without \`:${pr.name}\`, or by copying \`kit/kit.<context>.yaml\` back.`);
  } else {
    L.push("No kitctl: Gestalt writes its marked block itself, dry-run first.", "");
    L.push(`- [ ] \`gestalt write --block ~/.claude/CLAUDE.md\` (and \`~/.codex/AGENTS.md\` for Codex), then again with \`--yes\`.`);
    for (const b of blocks.contexts) L.push(`- [ ] In ${b.context} repos (${b.when}): \`gestalt write --block AGENTS.md --context ${b.context}\`.`);
    for (const pr of profiles) L.push(`- [ ] Profile **${pr.name}** (${pr.description.replace(/\.$/, "")}): add \`--profile ${pr.name}\` to the writes above; writing without it switches back.`);
    L.push("- [ ] Switch plugins on or off per repo by hand (`/plugin` in Claude Code), following the disable list in WAY.md.");
  }
  L.push("");

  if (way.reflect.on_enter?.length) {
    L.push("### Then, in each repo you start working in, in order", "");
    for (const r of way.reflect.on_enter) L.push(`- [ ] ${label(r.use, catalog)}: ${r.step.invoke}${r.in.length < Object.keys(way.contexts).length ? ` (in ${r.in.join(", ")} repos)` : ""}`);
    L.push("");
  }

  // 5. Workers
  const workerFiles = Object.keys(agentFiles).sort();
  L.push("## 5. Workers", "");
  if (!way.topology.workers.length) L.push("- No workers.");
  for (const w of way.topology.workers) {
    if (w.mechanism === "subagent") L.push(`- [ ] \`${w.id}\`: \`gestalt write --agents ~/.claude/agents\` places \`agents/claude/${w.id}.md\` (a user agent, not a plugin agent, so its mcpServers apply).${way.harnesses.includes("codex") ? ` For Codex, \`gestalt write --agents ~/.codex/agents\` places \`agents/codex/${w.id}.toml\`.` : ""}`);
    if (w.mechanism === "headless") {
      const plugins = [...new Set(w.uses.map(u => catalog.steps.get(u)?.entry).filter(e => e?.ref.startsWith("plugin:")).map(e => e.id))];
      L.push(`- [ ] \`${w.id}\`: keep \`workers/${w.id}.sh\` at \`~/.gestalt/build/workers/\`${plugins.length ? ` and export ${plugins.map(id => `\`GESTALT_PLUGIN_${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}\``).join(", ")} (the plugin directory). The lead's loadout disables the plugin so only the worker loads it. Check once that the worker still sees it (\`sh workers/${w.id}.sh "list your skills"\`); if it does not, run the worker from a directory outside the repo` : ""}.`);
    }
    if (w.mechanism === "agent-file") L.push(`- [ ] \`${w.id}\`: uses the plugin's own agent; nothing to place.`);
    if (w.mechanism === "script") L.push(`- [ ] \`${w.id}\`: a script; no model.`);
  }
  if (way.harnesses.includes("codex") && way.topology.workers.some(w => w.mechanism === "headless")) L.push("- [ ] Codex: headless workers carry a `codex exec` line in their script.");
  L.push("");

  // 6. Other harnesses
  const manual = way.harnesses.filter(h => h === "cursor" || h === "agents-md");
  if (manual.length) {
    L.push(`## 6. ${way.writer === "kitctl" && manual.includes("cursor") ? "Cursor and harnesses kitctl does not reach" : "Harnesses kitctl does not reach"}`, "");
    if (manual.includes("cursor")) {
      if (way.writer === "kitctl") L.push("- [ ] Cursor: add `cursor` to each repo's `kit.yaml` harnesses; kitctl writes the block as `.cursor/rules/kit-<loadout>.mdc` (its Cursor facts are unverified, so check the first repo by hand). Plugins are installed from Cursor's marketplace, not by kitctl.");
      else L.push("- [ ] Cursor: paste the block into `.cursor/rules/gestalt.mdc` with `alwaysApply: true`.");
      L.push("- [ ] Cursor has no SessionStart or blocking Stop hook for these tools: every gate is a rule there, not a block.");
    }
    if (manual.includes("agents-md")) L.push("- [ ] Other AGENTS.md agents: `gestalt write --block AGENTS.md`. Reviewers run as fresh processes, not in the writer's context.");
    L.push("");
  }

  // 7. Survey findings
  if (survey?.collisions?.length) {
    L.push("## Found by the survey", "");
    for (const c of survey.collisions) L.push(`- ${c.code}: ${c.message}`);
    L.push("");
  }
  L.push("## Then", "", "- [ ] Run the three prompts in `TASTE-TEST.md`, each in a fresh chat, and paste the results into `/gestalt:taste`.", "");
  return `${L.join("\n")}\n`;
}
