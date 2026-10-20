# Setup for Morgan (engineering manager)'s way

Gestalt writes only its own block and its own generated files. Everything else is here, in order. Tick as you go.

## 1. Install

- [ ] **cairn** (plugin:cairn): claude: /plugin marketplace add ConnorBritain/cairn && /plugin install cairn@cairn; codex: node install-cairn-codex.mjs (verify with --check)
- [ ] **elonify** (plugin:elonify): claude: /plugin marketplace add ConnorBritain/elonify && /plugin install elonify@elonify; codex: Paste wiring/agents-md.md into AGENTS.md; run the critic as a fresh `codex exec`
- [ ] **gestalt** (plugin:gestalt): claude: /plugin marketplace add ConnorBritain/gestalt && /plugin install gestalt@gestalt; codex: Codex marketplace .agents/plugins/marketplace.json
- [ ] **team-update (Morgan's own skill)** (skill:team-update)
- [ ] **verification-gate (agent-primitives)** (plugin:verification-gate): claude: Install the verification-gate bundle from agent-primitives; paste wiring/claude-md.md; add .claude/gates.json per repo; codex: Paste wiring/agents-md.md; run each reviewer as a fresh `codex exec`
- [ ] **atlassian** connector (mcp:atlassian, tracker)
- [ ] **github** connector (mcp:github, code)
- [ ] **m365** connector (mcp:m365, mail)

## 2. Wire the tools' own snippets

Protocol steps rely on each tool's wiring snippet in CLAUDE.md / AGENTS.md. Gestalt's block orders them; it does not restate them.

- [ ] elonify: its `<!-- elonify -->` snippet, in rfc, service repos.
- [ ] verification-gate (agent-primitives): its `## Self-verification gate` snippet, in service repos.

## 3. Switch on the hooks this way relies on

- [ ] Leave off (the step is not hook-enforced in this way): `settings capture_hook=true` for cairn capture (Stop), everywhere.
- [ ] Create: `.claude/gates.json` for verification-gate gates (Stop, blocks), in service repos.
- [ ] Leave off (the step is not hook-enforced in this way): `.claude/elonify.json` for elonify diff-review (Stop, blocks), in service repos.

## 4. Apply

kitctl writes native config; Gestalt only emitted the loadouts.

- [ ] Copy `kit/loadouts/*.yaml` into your warehouse (`~/kits/loadouts/`) and add any primitive listed in `kit/gaps.md`.
- [ ] `kitctl validate`
- [ ] In each matching repo: copy `kit/kit.rfc.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] In each matching repo: copy `kit/kit.service.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] For repos with no other context: `kitctl use gestalt-flow`.

## 5. Workers

- [ ] `critics`: uses the plugin's own agent; nothing to place.
- [ ] `reporter`: `gestalt write --agents ~/.claude/agents` places `agents/claude/reporter.md` (a user agent, not a plugin agent, so its mcpServers apply).
- [ ] Codex: `agents/codex/*.toml` go in `~/.codex/agents/`. Their fields are unverified; check with your Codex version first.

## Then

- [ ] Run the three prompts in `TASTE-TEST.md`, each in a fresh chat, and paste the results into `/gestalt:taste`.

