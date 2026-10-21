# Setup for Connor England's way

Gestalt writes only its own block and its own generated files. Everything else is here. Pilot one repo first; roll out the rest once its taste prompt passes.

## Start here: pilot one repo with `.claude-plugin/plugin.json`

- [ ] Install cairn, compounder, elonify, verification-gate (agent-primitives), kitctl (commands in §1).
- [ ] Wire elonify's `<!-- elonify -->` and verification-gate (agent-primitives)'s `## Self-verification gate` snippets into that repo's instruction file (§2).
- [ ] Create `.claude/gates.json` and `.claude/elonify.json` there.
- [ ] Place the block: on a branch there, commit `live: true` in its kit.yaml, then `kitctl use gestalt-flow --live --yes` and `kitctl use gestalt-plugin --live --yes`, committing after each.
- [ ] Run taste prompt 2 (build) from TASTE-TEST.md in a fresh chat there, and score it from the transcript.

When it passes, roll out the rest below. When it fails, run /gestalt:taste on the result before changing anything else.

## 1. Install everything

- [ ] **brand-builder** (plugin:brand-builder): claude: /plugin marketplace add ConnorBritain/brand-builder && /plugin install brand-builder@brand-builder; codex: Codex marketplace; install-codex-hook.mjs only where plugin hooks are unavailable; cursor: add ConnorBritain/brand-builder as a plugin marketplace and install brand-builder (skills, agents; the edit-time scan is not ported)
- [ ] **cairn** (plugin:cairn): claude: /plugin marketplace add ConnorBritain/cairn && /plugin install cairn@cairn; codex: node install-cairn-codex.mjs (verify with --check); trust the plugin's hooks (/hooks); cursor: add ConnorBritain/cairn as a plugin marketplace and install cairn (reads .cursor-plugin; debt is a rule)
- [ ] **compounder** (plugin:compounder): claude: /plugin marketplace add ConnorBritain/compounder && /plugin install compounder@compounder, then /compounder:interview; codex: codex plugin marketplace add ConnorBritain/compounder, install compounder from /plugins, then trust its hooks (/hooks); cursor: add ConnorBritain/compounder as a plugin marketplace and install compounder (reads .cursor-plugin)
- [ ] **elonify** (plugin:elonify): claude: /plugin marketplace add ConnorBritain/elonify && /plugin install elonify@elonify; codex: Paste wiring/agents-md.md into AGENTS.md; run the critic as a fresh `codex exec`; cursor: Install the .cursor-plugin; no Stop hook, so the gate is a rule, not a block
- [ ] **gestalt** (plugin:gestalt): claude: /plugin marketplace add ConnorBritain/gestalt && /plugin install gestalt@gestalt; codex: Codex marketplace .agents/plugins/marketplace.json
- [ ] **humanizer (blader)** (skill:blader/humanizer): claude: Install the humanizer skill from github.com/blader/humanizer into ~/.claude/skills (MIT); codex: Copy SKILL.md into a Codex skills directory
- [ ] **kitctl** (tool:kitctl): claude: uv tool install kitctl (or npx kitctl); codex: uv tool install kitctl (or npx kitctl); cursor: uv tool install kitctl (or npx kitctl); add cursor to kit.yaml harnesses
- [ ] **prose-author (vonnegut)** (plugin:prose-author): claude: /plugin marketplace add ConnorBritain/vonnegut && /plugin install prose-author@vonnegut; codex: node install-prose-codex.mjs
- [ ] **prose-review (vonnegut)** (plugin:prose-review): claude: /plugin install prose-review@vonnegut; paste wiring/claude-md.md; codex: node install-prose-codex.mjs; paste wiring/agents-md.md
- [ ] **prose-tell-scan (vonnegut)** (plugin:prose-tell-scan): claude: /plugin install prose-tell-scan@vonnegut
- [ ] **roadmap** (plugin:roadmap): claude: claude plugin marketplace add ConnorBritain/roadmap && claude plugin install roadmap@roadmap; npm i -D @connorbritain/roadmap; codex: codex plugin marketplace add ConnorBritain/roadmap and install roadmap; register the MCP server with `roadmap init --client codex --apply` (runs codex mcp add) or a kitctl mcp: primitive; cursor: add ConnorBritain/roadmap as a plugin marketplace and install roadmap (skills, agents); add the MCP server to .cursor/mcp.json
- [ ] **ui-magic** (plugin:ui-magic): claude: /plugin marketplace add ConnorBritain/ui-magic && /plugin install ui-magic@ui-magic; codex: Codex marketplace .agents/plugins/marketplace.json; plugin hooks need trust; cursor: add ConnorBritain/ui-magic as a plugin marketplace and install ui-magic (skills, agents; the edit-time scan is not ported)
- [ ] **verification-gate (agent-primitives)** (plugin:verification-gate): claude: Install the verification-gate bundle from agent-primitives; paste wiring/claude-md.md; add .claude/gates.json per repo; codex: Paste wiring/agents-md.md; run each reviewer as a fresh `codex exec`
- [ ] **linear** connector (mcp:linear, tracker): set `LINEAR_API_KEY` in your environment, never in a file
- [ ] **github** connector (mcp:github, code)
- [ ] **m365** connector (mcp:m365, mail) (optional)

## 2. Wire the tools' own snippets

Protocol steps rely on each tool's wiring snippet in CLAUDE.md / AGENTS.md. Gestalt's block orders them; it does not restate them.

- [ ] elonify: its `<!-- elonify -->` snippet, in plugin, roadmap, app, site repos.
- [ ] verification-gate (agent-primitives): its `## Self-verification gate` snippet, in plugin, roadmap, app, site repos.
- [ ] prose-review (vonnegut): its `<!-- vonnegut: prose-review -->` snippet, in writing repos.

## 3. Switch on the hooks this way relies on

- [ ] Leave off (the step is not hook-enforced in this way): `settings capture_hook=true` for cairn capture (Stop), everywhere.
- [ ] Create: `.claude/gates.json` for verification-gate gates (Stop, blocks), in plugin, roadmap, app, site repos.
- [ ] Create: `.claude/elonify.json` for elonify diff-review (Stop, blocks), in plugin, roadmap, app, site repos.
- [ ] Leave `rules.stop_nudge` at true (compounder). The Stop order handles the overlap; if the taste test shows it does not, change it with /compounder:update (that tool treats it as loosening).
- [ ] Leave `rules.stop_nudge_min_edits` at 3 (compounder). The Stop order handles the overlap; if the taste test shows it does not, change it with /compounder:update (that tool treats it as loosening).

## 4. Apply

kitctl writes native config; Gestalt only emitted the loadouts.

- [ ] Copy `kit/loadouts/*.yaml` into your warehouse (`~/kits/loadouts/`). Read `kit/gaps.md` for referenced loadouts.
- [ ] `kitctl validate`, and add a primitive for each one it reports missing (kitctl's docs/model.md).
- [ ] In each matching repo, on a branch: copy `kit/kit.app.yaml` to `kit.yaml`, add `live: true` and commit it, then `kitctl plan` and `kitctl apply --live --yes`.
- [ ] In each matching repo, on a branch: copy `kit/kit.plugin.yaml` to `kit.yaml`, add `live: true` and commit it, then `kitctl plan` and `kitctl apply --live --yes`.
- [ ] In each matching repo, on a branch: copy `kit/kit.roadmap.yaml` to `kit.yaml`, add `live: true` and commit it, then `kitctl plan` and `kitctl apply --live --yes`.
- [ ] In each matching repo, on a branch: copy `kit/kit.site.yaml` to `kit.yaml`, add `live: true` and commit it, then `kitctl plan` and `kitctl apply --live --yes`.
- [ ] In each matching repo, on a branch: copy `kit/kit.writing.yaml` to `kit.yaml`, add `live: true` and commit it, then `kitctl plan` and `kitctl apply --live --yes`.
- [ ] For repos with no other context: the same opt-in, then `kitctl use gestalt-flow --live --yes`.
- [ ] Live apply refuses on main, on a dirty tree or without the committed opt-in (kitctl's docs/apply.md#live-apply). `kitctl off <loadout> --live --yes` is the undo.

### Then, in each repo you start working in, in order

- [ ] kitctl use: put the repo's kit.yaml in place (or `kitctl use <loadouts>`), then `kitctl plan` and `kitctl apply`; the loadouts carry the Gestalt context block

## 5. Workers

- [ ] `critics`: uses the plugin's own agent; nothing to place.
- [ ] `prose`: keep `workers/prose.sh` at `~/.gestalt/build/workers/` and export `GESTALT_PLUGIN_PROSE_AUTHOR` (the plugin directory). The lead's loadout disables the plugin so only the worker loads it. Check once that the worker still sees it (`sh workers/prose.sh "list your skills"`); if it does not, run the worker from a directory outside the repo.
- [ ] `linear`: `gestalt write --agents ~/.claude/agents` places `agents/claude/linear.md` (a user agent, not a plugin agent, so its mcpServers apply). For Codex, `gestalt write --agents ~/.codex/agents` places `agents/codex/linear.toml`.
- [ ] Codex: headless workers carry a `codex exec` line in their script.

## 6. Cursor and harnesses kitctl does not reach

- [ ] Cursor: add `cursor` to each repo's `kit.yaml` harnesses; kitctl writes the block as `.cursor/rules/kit-<loadout>.mdc` (its Cursor facts are unverified, so check the first repo by hand). Plugins are installed from Cursor's marketplace, not by kitctl.
- [ ] Cursor has no SessionStart or blocking Stop hook for these tools: every gate is a rule there, not a block.

## Found by the survey

- GST-C-STOP: 3 Stop hooks can block the same turn: elonify [opt-in .claude/elonify.json], compounder, verification-gate [opt-in .claude/gates.json]. They run together; nothing orders them.
- GST-C-START: 3 SessionStart hooks inject context: cairn, compounder, roadmap
- GST-C-COUNTER: 4 PostToolUse hooks watch edits: elonify, compounder, ui-magic, brand-builder
- GST-C-SLOT: ui-magic and brand-builder generate the same thing; enable one per context

## Then

- [ ] Run the three prompts in `TASTE-TEST.md`, each in a fresh chat, and paste the results into `/gestalt:taste`.

