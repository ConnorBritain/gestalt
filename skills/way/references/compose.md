# Composing a way

Turn the survey and the interview into `way.yaml`. Each rule below is one lint enforces or
one experience says matters; cite the reason when you explain a choice.

1. **Contexts first.** One `everywhere` context (`when: always`) and one per kind of work,
   named by a marker file. Scoping a plugin to the context that needs it is cheaper than
   delegating it everywhere.
2. **Map what they have to steps.** For each installed primitive, find its catalog entry
   and choose which of its steps serve this person. An installed primitive that serves no
   goal is a trim candidate, not a step.
3. **One generator per slot per context.** If two tools generate the same thing, pick
   one and disable the other there (`disable:`).
4. **Weakest mode.** `ambient` and `dispatcher` cost nothing extra. `explicit` costs
   nothing until asked. `protocol` (a rule in the block) is for reviewers and gates the
   model is tempted to skip. Keep `protocol_rules` within budget.
5. **Order the gates.** Deterministic gates first (tests), then reviewers in parallel,
   then recorders. If two blocking Stop hooks share a context, write `stop_order`.
   Recorders should not block; if one does, put it last and say so, or set the knob that
   unblocks it when its catalog entry has one (`settings:`, e.g.
   `compounder.rules.stop_mode: context`).
6. **Hand-offs forward only.** A reviewer may hand to a recorder or to the user, never
   back to a generator. A REFRAME goes to the user.
7. **The lead stays small.** Set tiers per harness (lead on the strongest model). Move
   work to a worker when it needs a heavy plugin (headless), a connection the lead should
   not hold (subagent with an inline server), or a clean context (agent-file critic).
   Steps fired by hooks stay in the lead. Every worker gets a one-line `route`.
8. **Rituals go in `reflect`**, never in the block.
9. **Three taste prompts**, each down a different path: an orient-only question, a
   build-and-check task in their main context, and one in a second context or a worker.
   Mark at least one step that must stay quiet.
10. **Budgets.** Start from the defaults. Raise one only with a reason the person gives.
