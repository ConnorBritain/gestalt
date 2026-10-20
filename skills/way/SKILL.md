---
name: way
description: Design or update the person's way of working with their agent harness. Surveys what is installed and what it costs, interviews them about goals, data and cadence, composes a lean ordered flow (orient, intend, plan, make, check, record) with a lead and focused workers, then compiles WAY.md, the managed block, kitctl loadouts and a taste test. Use only when the person asks to set up, redesign or extend their harness, not for ordinary coding work.
---

# Gestalt: compose a way

You help one person decide what their harness runs and in what order, then compile it.
Scripts measure, check and write; you interview, propose and explain. Never estimate a
number a script computes, and never edit a harness's native config yourself.

**CLI.** `gestalt` below means `node PLUGIN/tools/cli.mjs`, where PLUGIN is two
directories above this file (`${CLAUDE_PLUGIN_ROOT}` in Claude Code). The way lives at
`~/.gestalt/way.yaml` (`GESTALT_HOME` overrides) and the build at `~/.gestalt/build/`.

Read [references/interview.md](references/interview.md) before the interview and
[references/compose.md](references/compose.md) before composing. The schema is
`PLUGIN/docs/way-schema.md`; the catalog of known primitives is `PLUGIN/catalog/`.

## 1. Survey first, ask second

Run `gestalt survey --out ~/.gestalt/survey` (add `--repo <path>` for each repo they
work in, and `--usage 30` only if they agree to transcript counts). Show five lines from
`SURVEY.md`: always-on tokens, skills and plugins live, Stop hooks that can block, the
collisions, and the top three plugins by cost. Never ask what the survey already knows.

If `~/.gestalt/way.yaml` exists, this is an update: read it, run `gestalt lint`, and ask
only about what changed.

## 2. Interview

One block at a time, with AskUserQuestion where the harness has it, pre-filled from the
survey (see the reference for the blocks and the questions). Keep each answer in their
words; you will quote them back.

## 3. Compose

Write a draft `way.yaml` following [references/compose.md](references/compose.md):
one generator per slot, the weakest mode that works, gates in a Stop order, a lead with
the smallest load and workers for heavy plugins or connections, three taste prompts that
travel different paths. For a gap with no installed tool, offer at most three candidates
(catalog first, then `kitctl scout` / `kitctl forge` if kitctl is installed, else web
research scored with [references/research-rubric.md](references/research-rubric.md)).
Primitives the catalog does not know get a way-local `catalog:` entry marked
`confidence: guess`; say so.

## 4. Lint until clean

Run `gestalt lint --way ~/.gestalt/way.yaml --survey ~/.gestalt/survey/survey.json`.
Fix every error. A waiver needs the person's own reason, in their words; never invent one.
Show the warnings that remain and what each means.

## 5. Challenge it

If elonify is installed, run `/elonify:review` on the draft way with the person's
original request verbatim. Relay the verdict as written; a CUT FIRST means cut or say why
each stays.

## 6. Show, then compile

Run `gestalt compile --survey ~/.gestalt/survey/survey.json` and show `WAY.md`'s flow,
lead and workers, and budget lines. Ask for approval before anything is written outside
`~/.gestalt/`.

## 7. Apply

- **writer: kitctl**: hand them the steps in `SETUP.md` §4 (`kitctl validate`, then
  `kitctl plan` per repo). Gestalt never runs `kitctl apply`.
- **writer: manual**: run `gestalt write --block <file>` as a dry run, show it, and only
  after they agree run it again with `--yes`. Same for `--agents`.

Everything else (installs, opt-in files, knob changes) is a checklist in `SETUP.md`; walk
them through it rather than doing it.

## 8. Hand over the taste test

Point them at `~/.gestalt/build/TASTE-TEST.md`: three prompts, each in a fresh chat, then
paste the results into `/gestalt:taste`. Tell them about `~/.gestalt/build/BOOTSTRAP.md`:
the one file to keep somewhere private (their kitctl warehouse, say) and hand to any agent
on any other machine or harness to set the same way up.
