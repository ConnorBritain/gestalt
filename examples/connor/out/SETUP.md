# Setup for Connor England's way

Gestalt writes only its own block and its own generated files. Everything else is here, in order. Tick as you go.

## 1. Install

- [ ] **brand-builder** (plugin:brand-builder): claude: /plugin marketplace add ConnorBritain/brand-builder && /plugin install brand-builder@brand-builder; codex: Codex marketplace; install-codex-hook.mjs only where plugin hooks are unavailable. _Not available on cursor._
- [ ] **cairn** (plugin:cairn): claude: /plugin marketplace add ConnorBritain/cairn && /plugin install cairn@cairn; codex: node install-cairn-codex.mjs (verify with --check). _Not available on cursor._
- [ ] **compounder** (plugin:compounder): claude: /plugin marketplace add ConnorBritain/compounder && /plugin install compounder@compounder, then /compounder:interview. _Not available on codex, cursor._
- [ ] **elonify** (plugin:elonify): claude: /plugin marketplace add ConnorBritain/elonify && /plugin install elonify@elonify; codex: Paste wiring/agents-md.md into AGENTS.md; run the critic as a fresh `codex exec`; cursor: Install the .cursor-plugin; no Stop hook, so the gate is a rule, not a block
- [ ] **gestalt** (plugin:gestalt): claude: /plugin marketplace add ConnorBritain/gestalt && /plugin install gestalt@gestalt; codex: Codex marketplace .agents/plugins/marketplace.json
- [ ] **humanizer (blader)** (skill:blader/humanizer): claude: Install the humanizer skill from github.com/blader/humanizer into ~/.claude/skills (MIT); codex: Copy SKILL.md into a Codex skills directory
- [ ] **kitctl** (tool:kitctl): claude: uv tool install kitctl (or npx kitctl); codex: uv tool install kitctl (or npx kitctl). _Not available on cursor._
- [ ] **prose-author (vonnegut)** (plugin:prose-author): claude: /plugin marketplace add ConnorBritain/vonnegut && /plugin install prose-author@vonnegut; codex: node install-prose-codex.mjs
- [ ] **prose-review (vonnegut)** (plugin:prose-review): claude: /plugin install prose-review@vonnegut; paste wiring/claude-md.md; codex: node install-prose-codex.mjs; paste wiring/agents-md.md
- [ ] **prose-tell-scan (vonnegut)** (plugin:prose-tell-scan): claude: /plugin install prose-tell-scan@vonnegut
- [ ] **roadmap** (plugin:roadmap): claude: claude plugin marketplace add ConnorBritain/roadmap && claude plugin install roadmap@roadmap; npm i -D @connorbritain/roadmap; codex: Register the graph MCP server through kitctl (an mcp: primitive), not `roadmap init --client codex --apply`. _Not available on cursor._
- [ ] **ui-magic** (plugin:ui-magic): claude: /plugin marketplace add ConnorBritain/ui-magic && /plugin install ui-magic@ui-magic; codex: Codex marketplace .agents/plugins/marketplace.json; plugin hooks need trust. _Not available on cursor._
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

- [ ] Copy `kit/loadouts/*.yaml` into your warehouse (`~/kits/loadouts/`) and add any primitive listed in `kit/gaps.md`.
- [ ] `kitctl validate`
- [ ] In each matching repo: copy `kit/kit.app.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] In each matching repo: copy `kit/kit.plugin.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] In each matching repo: copy `kit/kit.roadmap.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] In each matching repo: copy `kit/kit.site.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] In each matching repo: copy `kit/kit.writing.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] For repos with no other context: `kitctl use gestalt-flow`.

## 5. Workers

- [ ] `critics`: uses the plugin's own agent; nothing to place.
- [ ] `prose`: keep `workers/prose.sh` at `~/.gestalt/build/workers/` and export `GESTALT_PLUGIN_PROSE_AUTHOR` (the plugin directory). The lead's loadout disables the plugin so only the worker loads it. Check once that the worker still sees it (`sh workers/prose.sh "list your skills"`); if it does not, run the worker from a directory outside the repo.
- [ ] `linear`: `gestalt write --agents ~/.claude/agents` places `agents/claude/linear.md` (a user agent, not a plugin agent, so its mcpServers apply).
- [ ] Codex: `agents/codex/*.toml` go in `~/.codex/agents/`. Their fields are unverified; check with your Codex version first.

## 6. Harnesses kitctl does not reach

- [ ] Cursor: paste the block into `.cursor/rules/gestalt.mdc` with `alwaysApply: true`. No Stop hooks there: every gate is a rule, not a block.

## Found by the survey

- GST-C-STOP: 3 Stop hooks can block the same turn: elonify [opt-in .claude/elonify.json], compounder, verification-gate [opt-in .claude/gates.json]. They run together; nothing orders them.
- GST-C-START: 3 SessionStart hooks inject context: cairn, compounder, roadmap
- GST-C-COUNTER: 4 PostToolUse hooks watch edits: elonify, compounder, ui-magic, brand-builder

## Then

- [ ] Run the three prompts in `TASTE-TEST.md`, each in a fresh chat, and paste the results into `/gestalt:taste`.

