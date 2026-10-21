---
name: trim
description: Find what the person's harness pays for in always-on context but rarely uses, and propose at most five reversible cuts (disable in a context, move to a worker, demote a mode, sharpen a description). Use only when the person asks to trim, slim down or declutter their harness, or when the harness feels noisy or slow to route.
---

# Gestalt: trim

Fewer, sharper primitives route better than many overlapping ones. You rank what the
harness carries by cost against use and propose small, reversible cuts. The numbers come
from the CLI; your job is the judgment and the explanation.

**CLI.** `gestalt` means `node PLUGIN/tools/cli.mjs` (PLUGIN is two directories above
this file). Read [references/trim.md](references/trim.md) before proposing cuts.

## 1. Measure

Run `gestalt survey --out ~/.gestalt/survey` with `--repo` for the repos they work in.
Add `--usage 30` only if they agree to transcript counts; otherwise use the plugin
counters the survey reads anyway, and ask them which of the top ten they used last week.

## 2. Rank

Build the table from `survey.json`: each plugin and loose skill, its listing tokens, its
usage, and cost × (1 − usage share). **Protect** the gates and reviewers their way
relies on: critics fire rarely by design, so low usage is not a reason to cut them.

## 3. Classify and propose

For each candidate pick one move (see the reference): remove, disable in a context, move
to a headless worker, demote its mode, sharpen its description, or keep. Propose **at
most five**, each with what it saves, how to undo it, and the signal that should bring it
back.

## 4. Apply through the way

On approval, change `~/.gestalt/way.yaml` (`disable:`, `topology.workers`, `mode`), run
`gestalt lint`, then `gestalt compile`, and show the `SETUP.md` steps that changed.
Never disable a plugin in native config yourself.

## 5. Re-taste

Ask them to rerun `TASTE-TEST.md`. A cut that breaks a taste prompt comes back.
