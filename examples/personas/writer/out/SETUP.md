# Setup for Ade (newsletter writer)'s way

Gestalt writes only its own block and its own generated files. Everything else is here, in order. Tick as you go.

## 1. Install

- [ ] **cairn** (plugin:cairn): claude: /plugin marketplace add ConnorBritain/cairn && /plugin install cairn@cairn
- [ ] **humanizer (blader)** (skill:blader/humanizer): claude: Install the humanizer skill from github.com/blader/humanizer into ~/.claude/skills (MIT)
- [ ] **prose-author (vonnegut)** (plugin:prose-author): claude: /plugin marketplace add ConnorBritain/vonnegut && /plugin install prose-author@vonnegut
- [ ] **prose-outline (vonnegut)** (plugin:prose-outline): claude: /plugin install prose-outline@vonnegut
- [ ] **prose-research (vonnegut)** (plugin:prose-research): claude: /plugin install prose-research@vonnegut
- [ ] **prose-review (vonnegut)** (plugin:prose-review): claude: /plugin install prose-review@vonnegut; paste wiring/claude-md.md
- [ ] **prose-tell-scan (vonnegut)** (plugin:prose-tell-scan): claude: /plugin install prose-tell-scan@vonnegut
- [ ] **drive** connector (mcp:gdrive, files)
- [ ] **cms** connector (mcp:newsletter, publish): set `NEWSLETTER_API_KEY` in your environment, never in a file (optional)

## 2. Wire the tools' own snippets

Protocol steps rely on each tool's wiring snippet in CLAUDE.md / AGENTS.md. Gestalt's block orders them; it does not restate them.

- [ ] prose-review (vonnegut): its `<!-- vonnegut: prose-review -->` snippet.

## 3. Switch on the hooks this way relies on

- [ ] Leave off (the step is not hook-enforced in this way): `settings capture_hook=true` for cairn capture (Stop), everywhere.

## 4. Apply

No kitctl: Gestalt writes its marked block itself, dry-run first.

- [ ] `gestalt write --block ~/.claude/CLAUDE.md` (and `~/.codex/AGENTS.md` for Codex), then again with `--yes`.
- [ ] Switch plugins on or off per repo by hand (`/plugin` in Claude Code), following the disable list in WAY.md.

## 5. Workers

- [ ] `research`: keep `workers/research.sh` at `~/.gestalt/build/workers/` and export `GESTALT_PLUGIN_PROSE_RESEARCH` (the plugin directory). The lead's loadout disables the plugin so only the worker loads it. Check once that the worker still sees it (`sh workers/research.sh "list your skills"`); if it does not, run the worker from a directory outside the repo.
- [ ] `critics`: uses the plugin's own agent; nothing to place.

## Then

- [ ] Run the three prompts in `TASTE-TEST.md`, each in a fresh chat, and paste the results into `/gestalt:taste`.

