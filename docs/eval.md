# Eval: does a lean, ordered way actually help?

Gestalt's claim is that sequencing beats accumulation. A harness that loads less, orders
its gates and gives heavy work to focused workers should do a person's real tasks at
least as well as one with everything on, and more cheaply. The research in
[DESIGN.md](../DESIGN.md#research) makes that plausible, but none of it measured this
person's harness. This eval is how a person checks their own way. v0.1 designs it and
prints it (`gestalt eval --plan`); running it spends model time, so the CLI has no way to start it
until the run is authorised.

## Conditions

| Condition | What is loaded |
|---|---|
| `loaded` | Everything the survey found, enabled everywhere, with no Gestalt block. The baseline is the harness as it is. |
| `lean` | The compiled way: its loadouts and its block. |
| `indexed` | `lean`, plus a one-line stage index in the block. This tests the finding that an always-present index beats skills the model must remember to invoke. |
| `lead-loaded` | `lean`, but every worker-owned plugin and connection is loaded in the lead, with no routes. This tests the lead/worker claim on its own. It only applies to ways with workers. |

## Matrix

The way's three taste prompts × the conditions × 3 runs, each in a throwaway copy of a
repo of the prompt's context. Each run uses an isolated `CLAUDE_CONFIG_DIR` and that
condition's settings, run as `claude -p --output-format stream-json --verbose`. Connor's
way is 3 × 4 × 3 = 36 runs.

## What is measured, and how

- **Expected steps fired.** Read from the transcript's tool calls (`Skill`, `Agent` with its
  `subagent_type`, `mcp__…`) and hook messages, never from the agent's own account. The
  expected trace is the one `TASTE-TEST.md` prints: computed from the way, not guessed.
- **Order violations** against the trace and `stop_order`.
- **Quiet violations:** a step listed in `expect_quiet` that fired anyway.
- **Cost:** input and output tokens and `total_cost_usd` from the final `result` event, plus
  wall time.
- **Quality:** a blind pairwise judgment of the final answers (`lean` vs `loaded`, then
  `lean` vs `lead-loaded`). The judge never sees the condition names. It runs both orders
  to cancel position bias, and its rubric is written before any run, as elonify's
  `GATE.md` is.

## The gate, written before the first run

A way passes when, on its own taste prompts:

1. `lean` fires at least as many expected steps as `loaded`, and no more quiet steps.
2. `lean` is not judged worse than `loaded` on more than one of three prompts.
3. `lean` costs less than `loaded` (median input tokens per run).
4. For ways with workers: `lead-loaded` is not judged better than `lean`. If it is, the
   workers cost more than they save; move them back.

If a way fails, the fix is a change to the way, never to the gate.

## Before it is worth running

- **Mapping steps to transcript signals.** Each catalog step needs the signal that proves it
  ran: a skill name, a subagent type, a hook's message or heartbeat. This is the
  `gestalt taste score <transcript>` follow-up, and the eval reuses it.
- **A spend budget, authorised by the person.** `--per-run-usd` prints an estimate, labelled
  as an assumption.
- **Three runs is a smoke test, not a study.** Treat a difference that does not survive a
  second batch as noise.
