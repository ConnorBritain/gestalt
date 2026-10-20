---
name: taste
description: Generate or score the three-prompt taste test for the person's compiled way of working. With no results, writes TASTE-TEST.md; with pasted results or transcripts, diagnoses each miss (installed, enabled, wired, firing) and proposes the smallest fix. Use only when the person asks to test, check or score their harness setup.
---

# Gestalt: taste test

The taste test is how a person finds out whether their way actually runs: three prompts,
each in a fresh chat, scored against a trace the compiler computed. Agents describe what
they meant to do; transcripts show what happened. Score from the transcript.

**CLI.** `gestalt` means `node PLUGIN/tools/cli.mjs` (PLUGIN is two directories above
this file).

## Without results: hand over the test

1. If `~/.gestalt/way.yaml` has no `taste:` entries or the person wants new ones, propose
   three prompts from their goals, each down a different path (orient only; build and
   check in their main context; a second context or a worker). Write them into the way.
2. Run `gestalt compile` and point them at `~/.gestalt/build/TASTE-TEST.md`.
3. Tell them: fresh chat for each prompt, in the kind of repo named, without naming any
   tool; then paste back the filled tables or the transcripts.

## With results: diagnose

For each expected step that did not fire, or fired out of order, walk the chain and stop
at the first broken link:

1. **Installed?** Is the plugin in the survey at all?
2. **Enabled?** Enabled in this repo's scope (project settings win over user)?
3. **Wired?** For protocol steps: is the tool's snippet and the Gestalt block in the
   instruction file this harness reads? For hook steps: does the opt-in file exist
   (`.claude/elonify.json`, `.claude/gates.json`)?
4. **Firing?** Did the hook run (transcript hook messages, the tool's heartbeat log)? Did
   the condition hold (enough edits, a non-trivial turn)?

For each step that fired but should have stayed quiet: is its description too broad
(survey triggers), or is it enabled in a context that should disable it?

Propose the **smallest** fix for each miss, as a change to the way (a disable, a mode, a
Stop order, a sharper route), then `gestalt lint` and `gestalt compile`, and ask them to
rerun only the prompts that failed. Never mark a step as passed because the agent said it
ran.
