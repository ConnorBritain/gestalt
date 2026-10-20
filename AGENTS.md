# AGENTS.md

Instructions for an agent working on `gestalt` itself. To use Gestalt, see the
[README](README.md).

## What this repo is

Gestalt decides **what a harness runs and in what order**. It surveys what a person has
installed, interviews them, and compiles a way of working (`way.yaml` → `WAY.md`, a managed
instruction block, kitctl loadouts, worker definitions, a taste test). It is a compiler, not
a daemon: three skills, no hooks, no agents, and nothing it produces needs it to stay loaded.

The user's state lives in `~/.gestalt` (`GESTALT_HOME` overrides), never in this repo.

## Before doing anything

Read [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`docs/roadmap/STATUS.md`](docs/roadmap/STATUS.md).
Take the first unchecked item; tick it in the same commit that lands it. The principles in
[`DESIGN.md`](DESIGN.md) override any item.

## Working agreements

- **kitctl writes native config; Gestalt never does.** Gestalt writes only text between its
  own `<!-- gestalt:begin way -->` markers in CLAUDE.md/AGENTS.md and files it generated
  (each carries a generated-by header). It never edits `settings.json`, `config.toml`, or a
  trust store. Everything else becomes a line in `SETUP.md`.
- **Scripts count; models judge.** Token estimates, collisions, lint codes and traces come
  from `tools/`. Skills cite them and never estimate them.
- **Survey is read-only and never executes** a hook, an MCP server, or a plugin script.
  It never serializes an env value, header, or argument.
- **Compile is deterministic.** Same inputs, same bytes. `compile --check` is the drift test.
- **Every lint code has a planted-defect fixture** in `tests/fixtures/lint/`, and every
  example way lints without errors (its warnings print in its WAY.md).
- **No dependencies. No GitHub Actions.** `node tools/check.mjs` is the gate. `tools/lib/yaml.mjs`
  is a byte-pinned copy of ui-magic's reader; change it upstream, then refresh the pin.
- **Sibling repos are read-only from here.** Asks for them go in [`docs/upstream.md`](docs/upstream.md).
- Skill frontmatter carries only `name` and `description`. Skills refer to the plugin root
  as `PLUGIN` (two directories above the SKILL.md), `${CLAUDE_PLUGIN_ROOT}` in Claude Code.

## Useful commands

- `node tools/check.mjs` (`GESTALT_STRICT=1` turns skipped checks, such as kitctl validate, into failures)
- `GESTALT_UPDATE_EXAMPLES=1 node tests/examples.mjs`, `GESTALT_UPDATE_SURVEY_GOLDENS=1 node tests/survey.mjs`: accept new goldens, then review the diff
- `node tools/cli.mjs help`
- `node tools/cli.mjs compile --way examples/connor/way.yaml --out /tmp/out`
