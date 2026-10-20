# Changelog

## Unreleased

- **Portability session** ([docs/followups/portability-session.md](docs/followups/portability-session.md)):
  dated Codex, Cursor and Trail facts in [docs/harness-facts.md](docs/harness-facts.md).
- **Codex worker agents are back**: a subagent worker also compiles to
  `agents/codex/<id>.toml` with the fields Codex 0.163 accepts, and `gestalt write --agents
  ~/.codex/agents` places it.
- **`on_enter`**, a reflect cadence that runs once per repo, in order (`kitctl.use` →
  `gestalt.block`), rendered in WAY.md and SETUP.md.
- **Survey**: `skills` (per plugin and in the totals) counts listed skills only;
  `hidden_skills` counts those that run by name. Trail's AGENTS.md marker is recognised.
- **Catalog**: compounder 0.2.0 (three-line brief, rituals hidden, Codex and Cursor), cairn
  0.3.0, Codex and Cursor coverage for roadmap, ui-magic and brand-builder, kitctl's Cursor
  harness, `kitctl.use`, `gestalt.block`, and a measured `trail` entry.
- **Connor's way** lints with no waivers. Listed skills in roadmap, app and site repos stay
  over 12, kept as warnings by his choice. Trail is piloted first (his choice); the first run
  is in `examples/connor/trail-pilot.md`. Catalog costs are measured from the sibling repos'
  open portability PRs; if one closes unmerged, its entry goes back.

## 0.1.0 — 2026-10-20

First vertical slice.

- **Survey**: a read-only inventory of Claude Code (settings precedence, installed, synced and
  platform plugins, usage counters), Codex (TOML, trust state never read) and Cursor
  (`alwaysApply` rules), with always-on cost estimates, collisions (Stop, SessionStart,
  edit counters, slots and alternative generators, duplicate markers, MCP names) and
  aggressive-trigger detection.
  Planted secrets are asserted absent from every output.
- **Way model** (`gestalt-way/1`): contexts by marker file; a flow over six fixed stages; a
  Stop order; hand-offs; scoped rituals; budgets; a lead/worker topology with tiers per
  harness.
- **Lint**: fifteen stable codes, each with a planted-defect fixture.
- **Compile**: WAY.md, base and per-context blocks, kitctl loadouts (their schema checked
  by `kitctl validate` with stubbed primitives, when kitctl is available), subagent files
  with inline MCP, headless worker scripts (with a `codex exec` line), SETUP.md that starts
  with a one-repo pilot, and a taste test with computed traces. `--check` detects drift.
  Codex custom-agent files wait until their fields are verified. BOOTSTRAP.md carries the
  way and every generated file, so any agent in any harness can set the way up.
- **Waivers** at way level for budget and lead-load codes no single step owns, each with a
  required reason printed in WAY.md: budgets stay limits, exceptions stay visible.
- **Write**: the only writer, dry-run first, limited to Gestalt's markers and its own files.
- **Skills**: `/gestalt:way`, `/gestalt:trim`, `/gestalt:taste` (about 280 always-on tokens).
- **Catalog**: 19 primitives. The 13 with checkouts have costs measured exactly and
  re-checked; humanizer's is an estimate; the connectors carry no listing cost.
- **Examples**: the author's way, surveyed from eleven real plugin checkouts (re-derived
  in the gate when they are present), and four personas starting from nothing. Their
  compiled output is golden-tested; the interview, trim and taste skills are prompts, not
  tested code.
- **Eval**: designed (docs/eval.md) and printed per way (`gestalt eval --plan`); the CLI
  cannot run it.
