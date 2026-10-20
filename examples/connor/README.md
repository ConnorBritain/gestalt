# Connor's way

The stack Gestalt was built for, composed from what each tool actually does (read from its
code, not its README) and measured from the real plugin checkouts.

- [`way.yaml`](way.yaml): the way itself.
- [`survey/SURVEY.md`](survey/SURVEY.md): the eleven plugins measured: ≈7.3k always-on tokens
  across 49 skills and 24 agents if everything were enabled everywhere, and three hooks
  that can block the same Stop.
- [`out/WAY.md`](out/WAY.md): the compiled way, per kind of repo.
- [`out/SETUP.md`](out/SETUP.md): the checklist Gestalt will not do itself.
- [`out/TASTE-TEST.md`](out/TASTE-TEST.md): three prompts to check it runs.
- [`out/block.md`](out/block.md) and `out/block.<context>.md`: the only always-on text Gestalt adds.

## The order, and why

1. **Gestalt** decides the order and compiles it, then gets out of the way (≈280 tokens,
   no hooks).
2. **kitctl** owns what is switched on in each repo. Gestalt emits `gestalt-flow` plus one
   loadout per context. `app-studio` and `brand-studio` are referenced, never rewritten.
3. **roadmap** is the plan of record, but only in repos that have one. Its 13 skills and
   40-tool graph server load in roadmap repos and nowhere else. That is cheaper than
   delegating it everywhere, and its SessionStart and Stop hooks still fire where they
   matter.
4. **compounder** orients every session and guards intent: new-project talk gets parked.
   Its Stop lines record what moved.
5. **cairn** orients with debt (two lines, silent when clear). Capture is explicit, and the
   weekly review is a ritual, not a hook.
6. **elonify ∥ verification-gate** check the work. Tests come first, because a red gate is
   already "not done". Then elonify and the two verification critics run in parallel, each
   in its own clean context. Neither consumes the other's output.
7. **humanizer → vonnegut** is the writing path. Humanizer strips the default patterns,
   and prose-author drafts toward the voice through a headless worker, so the lead never
   carries the voice tooling. In writing repos, prose-tell-scan runs before the
   prose-review critics.
8. **ui-magic / brand-builder** are the one generator for their kind of repo, never both,
   with the second design generator disabled there.

## What the compile resolved

- **Four Stop gates, one order.** Claude Code runs Stop hooks together, so Gestalt orders
  the model's answer instead: tests, then elonify's verdict, then compounder's three lines,
  then the cloud's commit-and-push check. It is one line in the code-repo blocks.
- **A hand-off that did not exist.** On an elonify REFRAME, once Connor has decided, the
  block offers `/cairn` to log the decision as a choice. That is the first step toward
  calibrating elonify against outcomes (see [docs/upstream.md](../../docs/upstream.md)).
- **The Linear connection lives in a worker.** The daily check-in runs in a `linear`
  subagent that holds the Linear MCP inline, so the lead never lists Linear's tools.
- **The lead stays at roughly 1.8–3.6k always-on tokens**, depending on the kind of repo,
  against 7.3k if every plugin were enabled everywhere.

## What it flags, honestly

- Codex tiers are not filled in yet (`GST-TIER`), and every protocol gate is advisory on
  Codex (`GST-HARNESS`): written down, nothing makes it happen. Run reviewers there as a
  fresh `codex exec`.
- compounder's Stop lines are a recorder that blocks (`GST-RECORDER-BLOCKS`). It is
  tolerated because it is ordered after the critics; the upstream ask is a non-blocking mode.
- cairn and compounder list every skill in every repo, rituals included. The skills
  budget is raised to 32 with that reason written beside it.
