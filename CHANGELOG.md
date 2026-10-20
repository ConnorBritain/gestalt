# Changelog

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
  Codex custom-agent files wait until their fields are verified.
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
