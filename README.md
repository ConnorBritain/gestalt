# Gestalt

**Decides what your agent harness runs, and in what order.**

A harness accumulates: plugins, skills, connectors, hooks, critics, each sensible alone. Put
twenty of them in one session and two blocking hooks fire on the same turn with nothing to
order them, three tools inject text at session start, and the model routes among forty
skill descriptions to find the one it needs. Gestalt treats the harness as a whole, which
is what the name means: the whole is not the sum of its parts.

It surveys what you have, measures what it costs in always-on context, interviews you about
your goals, data and cadence, and compiles a short, ordered **way of working**. The result
runs in Claude Code, Codex, Cursor and AGENTS.md agents:

```
orient → intend → plan → make → check → record          in every session
                                                  reflect  daily / weekly / monthly
```

Control moves forward. Checkers report and never fix; recorders never block. One generator
per job, many checkers. Gates fire in a stated order. The lead model carries little and
hands heavy or connected work to focused workers on the right tier. Then a three-prompt
**taste test** checks that it actually runs.

## What you get

| File | What it is |
|---|---|
| `~/.gestalt/way.yaml` | Your way, as data ([schema](docs/way-schema.md)) |
| `WAY.md` | The way, readable: the flow, each kind of repo, lead and workers, honesty per harness |
| `block.md`, `block.<context>.md` | The only always-on text Gestalt adds: order, Stop order, hand-offs, routes. In the examples, 70–140 tokens plus at most ≈120 for a context: under 300 in any repo. |
| `kit/` | kitctl loadouts and per-repo `kit.yaml`. kitctl writes native config; Gestalt never does. |
| `agents/`, `workers/` | Worker definitions: subagents with their own model and MCP, headless launch scripts |
| `SETUP.md` | Everything Gestalt will not do itself, as a checklist |
| `TASTE-TEST.md` | Three prompts with the trace each should produce, computed from the way |
| `BOOTSTRAP.md` | One portable file: hand it to any coding agent, anywhere, and it sets your harness up from your way (with Gestalt, or by copying every generated file verbatim) |

See the [author's way](examples/connor/) and [four people starting from
nothing](examples/personas/): a Cowork analyst trimming org plugins, a solo developer, a
writer, an engineering manager.

## Install

```bash
# Claude Code
/plugin marketplace add ConnorBritain/gestalt
/plugin install gestalt@gestalt
# Codex: the repo is also a Codex marketplace (.agents/plugins/marketplace.json)
# CLI only: node tools/cli.mjs (Node ≥ 18, no dependencies)
```

Then ask for it: *"set up my way of working"* runs `/gestalt:way`.

## Skills

- **`/gestalt:way`**: survey, interview, compose, lint, compile, apply. The first run and
  every redesign.
- **`/gestalt:trim`**: rank what you pay for against what you use; at most five reversible
  cuts.
- **`/gestalt:taste`**: hand over the taste test, or diagnose its results along installed →
  enabled → wired → firing.

That is the whole always-on footprint: three descriptions, about 280 tokens, no hooks, no
agents. Nothing Gestalt compiles needs it loaded, so you can disable it after setup.

## CLI

```bash
gestalt survey  [--home DIR] [--repo DIR]... [--plugin DIR]... [--usage DAYS] [--out DIR]
gestalt lint    [--way FILE] [--survey FILE]
gestalt compile [--way FILE] [--survey FILE] [--out DIR] [--check]
gestalt write   --block FILE [--context NAME] | --agents DIR   [--yes]
gestalt eval    --plan
```

- **survey** is read-only. It never runs a hook or a server, and never prints a value that
  could hold a secret.
- **lint** checks the principles as stable codes (`GST-GATE`, `GST-LEAD`, `GST-INVOKE`…),
  each with a planted-defect test.
- **compile** is deterministic and refuses anything lint rejects.
- **write** is dry-run first. It touches only Gestalt's own markers and its own generated
  files, never `settings.json` or `config.toml`.
- **eval** prints the experiment (`lean` vs `loaded` vs `lead-loaded`) and never runs it:
  that needs an authorised budget ([docs/eval.md](docs/eval.md)).

## With kitctl, and without

With [kitctl](https://github.com/ConnorBritain/kitctl), Gestalt emits loadouts and kitctl
plans, applies, ledgers and ejects. The block travels as a loadout's instructions, so kitctl
owns that text too. Without kitctl, `gestalt write` places the block and the agent files,
and SETUP.md lists the switches to flip by hand. Either way there is one writer per file.

## Read more

- [DESIGN.md](DESIGN.md): the principles, and the research behind the budgets.
- [docs/way-schema.md](docs/way-schema.md): every key, with what each worker mechanism can
  isolate.
- [catalog/](catalog/): what Gestalt knows about each primitive. Add your own.
- [docs/upstream.md](docs/upstream.md): what composing these tools turned up in each of them.
- [docs/eval.md](docs/eval.md): how to check that a lean way actually helps.

MIT © Connor England
