# Roadmap

Gestalt v0.1 is one vertical slice: survey what a person has, interview them, compose a
lean and ordered way of working, compile it into files the harness reads, and hand them a
three-prompt taste test. Items are taken in order; [STATUS](roadmap/STATUS.md) is the
checklist and the version pin.

| # | Item | Delivers |
|---|---|---|
| 01 | scaffold | Four manifests and two marketplaces at one version, `node tools/check.mjs`, test harness |
| 02 | yaml | A pinned copy of ui-magic's zero-dependency YAML reader, plus a small emitter |
| 03 | catalog | Sequencing facts for known primitives, keyed by kitctl ref |
| 04 | way | The `gestalt-way/1` model, including the lead/worker topology |
| 05 | lint | Stable `GST-*` codes; one planted-defect fixture per code |
| 06 | survey | Read-only inventory of Claude Code, Codex and Cursor, with always-on cost and collisions |
| 07 | compile | WAY.md, the managed block, kitctl loadouts, worker definitions, SETUP.md, TASTE-TEST.md |
| 08 | write | The only writer: Gestalt-marked blocks and Gestalt-generated agent files, dry-run first |
| 09 | skills | `/gestalt:way`, `/gestalt:trim`, `/gestalt:taste` |
| 10 | connor | The author's own way, measured from his real plugin checkouts |
| 11 | personas | Four people from a blank slate, as golden tests |
| 12 | release | Eval design and stub, research notes, upstream asks, README, 0.1.0 |

## After 0.1.0

- **Portability across the family** (next session): bring compounder, cairn, roadmap,
  ui-magic, brand-builder and kitctl to Claude Code, Codex and Cursor parity, then update the
  catalog. The brief is [followups/portability-session.md](followups/portability-session.md).

- `gestalt taste score <transcript>`: score a taste run from the transcript, not from
  the agent's report.
- Usage from Codex sessions.
- Cloud bootstrap: a Claude Code cloud setup script and SessionStart install hook, and a
  Codex Cloud setup script, as documentation or a kitctl target.
- Validate emitted loadouts against the real kitctl warehouse.
- Verify the Codex custom-agent fields against the installed CLI.
- Run the eval ([docs/eval.md](eval.md)) once its spend is authorised.
