# Changelog

## 0.1.0 — 2026-10-20

First vertical slice.

- **Survey**: a read-only inventory of Claude Code (settings precedence, installed, synced and
  platform plugins, usage counters), Codex (TOML, trust state never read) and Cursor
  (`alwaysApply` rules), with always-on cost estimates, collisions (Stop, SessionStart,
  edit counters, slots, duplicate markers, MCP names) and aggressive-trigger detection.
  Planted secrets are asserted absent from every output.
- **Way model** (`gestalt-way/1`): contexts by marker file; a flow over six fixed stages; a
  Stop order; hand-offs; scoped rituals; budgets; a lead/worker topology with tiers per
  harness.
- **Lint**: fifteen stable codes, each with a planted-defect fixture.
- **Compile**: WAY.md, base and per-context blocks, kitctl loadouts (accepted by
  `kitctl validate`), subagent files with inline MCP, headless worker scripts, Codex agents
  (labelled unverified), SETUP.md, and a taste test with computed traces. `--check` detects
  drift.
- **Write**: the only writer, dry-run first, limited to Gestalt's markers and its own files.
- **Skills**: `/gestalt:way`, `/gestalt:trim`, `/gestalt:taste` (about 280 always-on tokens).
- **Catalog**: 19 primitives, with costs measured from their checkouts.
- **Examples**: the author's way, measured from eleven real plugins, and four personas
  starting from nothing, all golden-tested.
- **Eval**: designed and planned (`gestalt eval --plan`); running it needs an authorised
  budget.
