# Catalog

One YAML file per primitive Gestalt knows how to sequence. It is an overlay on kitctl's
model, keyed by the same ref (`plugin:elonify`, `mcp:linear`, `skill:blader/humanizer`):
kitctl knows what a primitive *is* and how to switch it on; the catalog records *when* it
runs and what it costs.

| Field | Meaning |
|---|---|
| `steps[]` | What the primitive does at a stage: `id` (`entry.step`), `stage`, `kind`, `mode`, `invoke`, optional `wiring_marker` and per-harness `fallback` instruction |
| `hooks[]` | Hooks it registers: `event`, `blocking`, `mechanism`, `opt_in`, `serves` (the step it enforces), `lines` for SessionStart injectors, `quiet_unless` |
| `knobs[]` | Settings Gestalt may recommend changing, with the command that changes them; `loosening: true` when the owning tool treats a change as loosening |
| `harness` | Enforcement per harness: `enforced`, `partial`, `advisory` or `none` (vonnegut's portability labels) |
| `cost` | Always-on cost: skills, agents, commands and their listing tokens (`ceil(chars/4)`), SessionStart lines, and the commit it was measured from |
| `feeds[]` | Hand-offs to other steps; `proposed` until both tools support it |
| `worker` | The tier and mechanism it suits when the lead delegates (`critic` + `agent-file`, `worker` + `headless`, …) |

Stages and the kinds allowed at each:

| Stage | Kinds |
|---|---|
| orient | orienter |
| intend | guard, planner |
| plan | planner, reviewer, investigator |
| make | author, transformer, investigator |
| check | gate, reviewer |
| record | recorder |
| reflect | ritual, reviewer, recorder, planner |

Modes, weakest first: `ambient` (a hook fires it), `dispatcher` (the description routes it),
`explicit` (someone names it), `protocol` (an instruction-file rule requires it). Pick the
weakest that works; every step up costs context on every turn.

To add a primitive, copy the closest entry, measure its cost with
`node tools/cli.mjs survey --plugin <checkout> --json`, and run `node tools/check.mjs`. A
person's way can also carry its own entries (`catalog:` in `way.yaml`); those are marked
`confidence: guess` until someone checks them.
