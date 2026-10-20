# Setup for Morgan (engineering manager)'s way

Gestalt writes only its own block and its own generated files. Everything else is here. Pilot one repo first; roll out the rest once its taste prompt passes.

## Start here: pilot one repo with `Makefile`

- [ ] Install cairn, verification-gate (agent-primitives), elonify, kitctl (commands in §1).
- [ ] Wire elonify's `<!-- elonify -->` and verification-gate (agent-primitives)'s `## Self-verification gate` snippets into that repo's instruction file (§2).
- [ ] Create `.claude/gates.json` there.
- [ ] Place the block: `kitctl use gestalt-flow` and `kitctl use gestalt-service` in that repo.
- [ ] Run taste prompt 2 (fix) from TASTE-TEST.md in a fresh chat there, and score it from the transcript.

When it passes, roll out the rest below. When it fails, run /gestalt:taste on the result before changing anything else.

## 1. Install everything

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

- [ ] Copy `kit/loadouts/*.yaml` into your warehouse (`~/kits/loadouts/`). Read `kit/gaps.md` for referenced loadouts.
- [ ] `kitctl validate`, and add a primitive for each one it reports missing (kitctl's docs/model.md).
- [ ] In each matching repo: copy `kit/kit.rfc.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] In each matching repo: copy `kit/kit.service.yaml` to `kit.yaml`, then `kitctl plan` and `kitctl apply`.
- [ ] For repos with no other context: `kitctl use gestalt-flow`.

## 5. Workers

- [ ] `critics`: uses the plugin's own agent; nothing to place.
- [ ] `reporter`: `gestalt write --agents ~/.claude/agents` places `agents/claude/reporter.md` (a user agent, not a plugin agent, so its mcpServers apply).
- [ ] Codex: headless workers carry a `codex exec` line in their script. Codex custom-agent files are not generated until their fields are verified.

## Then

- [ ] Run the three prompts in `TASTE-TEST.md`, each in a fresh chat, and paste the results into `/gestalt:taste`.

