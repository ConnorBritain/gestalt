# Setup for Sam (bid analyst)'s way

Gestalt writes only its own block and its own generated files. Everything else is here. Pilot one repo first; roll out the rest once its taste prompt passes.

## Start here: pilot one repo with `MODEL.md`

- [ ] Install org-finance (synced) (commands in §1).
- [ ] Place the block: `gestalt write --block AGENTS.md --yes` and `gestalt write --block AGENTS.md --context pricing --yes` in that repo.
- [ ] Run taste prompt 1 (cost-table) from TASTE-TEST.md in a fresh chat there, and score it from the transcript.

When it passes, roll out the rest below. When it fails, run /gestalt:taste on the result before changing anything else.

## 1. Install everything

- [ ] **org-brand (synced)** (plugin:org-brand)
- [ ] **org-finance (synced)** (plugin:org-finance)
- [ ] **org-rfp (synced)** (plugin:org-rfp)
- [ ] **atlassian** connector (mcp:atlassian, docs)
- [ ] **m365** connector (mcp:m365, files)

## 2. Wire the tools' own snippets

Protocol steps rely on each tool's wiring snippet in CLAUDE.md / AGENTS.md. Gestalt's block orders them; it does not restate them.

- Nothing to wire: no protocol steps carry a snippet.

## 3. Switch on the hooks this way relies on

- No opt-in hooks.

## 4. Apply

No kitctl: Gestalt writes its marked block itself, dry-run first.

- [ ] `gestalt write --block ~/.claude/CLAUDE.md` (and `~/.codex/AGENTS.md` for Codex), then again with `--yes`.
- [ ] In rfp repos (file-exists:RFP.md): `gestalt write --block AGENTS.md --context rfp`.
- [ ] In pricing repos (file-exists:MODEL.md): `gestalt write --block AGENTS.md --context pricing`.
- [ ] Switch plugins on or off per repo by hand (`/plugin` in Claude Code), following the disable list in WAY.md.

## 5. Workers

- [ ] `library`: `gestalt write --agents ~/.claude/agents` places `agents/claude/library.md` (a user agent, not a plugin agent, so its mcpServers apply).
- [ ] `reviewer`: uses the plugin's own agent; nothing to place.

## Then

- [ ] Run the three prompts in `TASTE-TEST.md`, each in a fresh chat, and paste the results into `/gestalt:taste`.

