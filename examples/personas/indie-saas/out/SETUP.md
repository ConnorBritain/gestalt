# Setup for Jordan (solo SaaS developer)'s way

Gestalt writes only its own block and its own generated files. Everything else is here, in order. Tick as you go.

## 1. Install

- [ ] **compounder** (plugin:compounder): claude: /plugin marketplace add ConnorBritain/compounder && /plugin install compounder@compounder, then /compounder:interview. _Not available on cursor._
- [ ] **verification-gate (agent-primitives)** (plugin:verification-gate): claude: Install the verification-gate bundle from agent-primitives; paste wiring/claude-md.md; add .claude/gates.json per repo
- [ ] **linear** connector (mcp:linear, tracker): set `LINEAR_API_KEY` in your environment, never in a file
- [ ] **github** connector (mcp:github, code)

## 2. Wire the tools' own snippets

Protocol steps rely on each tool's wiring snippet in CLAUDE.md / AGENTS.md. Gestalt's block orders them; it does not restate them.

- [ ] verification-gate (agent-primitives): its `## Self-verification gate` snippet, in app repos.

## 3. Switch on the hooks this way relies on

- [ ] Create: `.claude/gates.json` for verification-gate gates (Stop, blocks), in app repos.
- [ ] Leave `rules.stop_nudge` at true (compounder). The Stop order handles the overlap; if the taste test shows it does not, change it with /compounder:update (that tool treats it as loosening).
- [ ] Leave `rules.stop_nudge_min_edits` at 3 (compounder). The Stop order handles the overlap; if the taste test shows it does not, change it with /compounder:update (that tool treats it as loosening).

## 4. Apply

No kitctl: Gestalt writes its marked block itself, dry-run first.

- [ ] `gestalt write --block ~/.claude/CLAUDE.md` (and `~/.codex/AGENTS.md` for Codex), then again with `--yes`.
- [ ] In app repos (file-exists:package.json): `gestalt write --block AGENTS.md --context app`.
- [ ] Switch plugins on or off per repo by hand (`/plugin` in Claude Code), following the disable list in WAY.md.

## 5. Workers

- [ ] `critics`: uses the plugin's own agent; nothing to place.
- [ ] `linear`: `gestalt write --agents ~/.claude/agents` places `agents/claude/linear.md` (a user agent, not a plugin agent, so its mcpServers apply).

## 6. Harnesses kitctl does not reach

- [ ] Cursor: paste the block into `.cursor/rules/gestalt.mdc` with `alwaysApply: true`. No Stop hooks there: every gate is a rule, not a block.

## Then

- [ ] Run the three prompts in `TASTE-TEST.md`, each in a fresh chat, and paste the results into `/gestalt:taste`.

