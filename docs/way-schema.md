# `way.yaml` — schema `gestalt-way/1`

One file per person, at `~/.gestalt/way.yaml` (`GESTALT_HOME` overrides). `/gestalt:way`
writes it from the survey and the interview; `node tools/cli.mjs lint` checks it;
`compile` turns it into everything the harness reads. Unknown keys are errors.

A complete worked example is [`examples/connor/way.yaml`](../examples/connor/way.yaml);
the [persona folders](../examples/personas/) start from nothing.

## Keys

| Key | Shape | Notes |
|---|---|---|
| `schema` | `gestalt-way/1` | required |
| `person` | `{name, roles[], goals[{id, text}], pains[]}` | 1–3 goals. Pains are what fires too much or never fires. |
| `harnesses` | subset of `claude, codex, cursor, agents-md` | where this person works |
| `writer` | `kitctl` or `manual` | who writes native harness config; Gestalt never does |
| `connectors` | `[{id, ref, role, auth?, optional?, server?}]` | `role`: tracker, docs, mail, calendar, chat, publish, code, data, files. `auth` is an env var **name**. `server` (`{type, url \| command, args, env}`) lets a worker hold the connection inline; `env` values must be `${VAR}` |
| `contexts` | `{name: {when, loadouts[]}}` | `when` is `always` or `file-exists:PATH` (kitctl's grammar). One context must be `always`. `loadouts` are kitctl loadout names for that kind of repo |
| `flow` | `{stage: [step]}` for `orient, intend, plan, make, check, record` | step: `{use, in?, mode?, enforce?, after?, parallel_with?, waive?}`. `use` is a catalog step id; `in` limits it to contexts (default: all); `mode` overrides the catalog's; `enforce: hook` says a hook backs it |
| `stop_order` | `[step id \| platform:<name>]` | the order the model answers simultaneous Stop gates in. Required when several blocking Stop hooks share a context |
| `links` | `[{from, on, to, as, via}]` | hand-offs, e.g. `{from: elonify.diff-review, on: REFRAME, to: cairn.capture, as: choice, via: instruction}`. `to` may be `user`. `via: instruction` costs one block line |
| `reflect` | `{on_enter[], daily[], weekly[], monthly[], as_needed[]}` | rituals (catalog steps at the `reflect` stage), each a step id or `{use, in}` when it belongs to one kind of repo. `on_enter` runs once when you start working in a repo, in the order listed (e.g. `kitctl.use` → `trail.init` → `gestalt.block`); daily, weekly and monthly are calendar rituals; `as_needed` ones wait for their moment (the focus shipped, the goals changed). Rendered in WAY.md and SETUP.md, and in the block only in a profile with `offer: true` |
| `profiles` | `{name: {description, flow?, reflect?, budgets?, offer?}}` | named variants of the way, e.g. a lean default and a `full` one. A profile **adds** flow steps and rituals and may override budgets. `offer: true` names what runs by slash command in the block: the explicit in-session steps (`By name, in session: …`) and the rituals with what each is for, which ritual skills hide from the listing; the lead offers a ritual when it is due and never starts one unasked, and worker-routed steps keep their route line instead. The result is linted as a whole way under its own budgets, and only problems the profile introduces are reported (prefixed `profile <name>:`). It compiles to a kitctl profile on every Gestalt loadout (`gestalt-flow:<name>`), carrying the block lines it adds as `instructions_append`, plus `kit/profiles/<name>/kit.<context>.yaml` and whole blocks under `profiles/<name>/` for `gestalt write --profile`. kitctl profiles narrow and never add, so a profile may not load a primitive the base way does not (`GST-PROFILE`) |
| `budgets` | see below | the leanness contract |
| `disable` | `{context: [ref]}` | primitives to switch off in a context; becomes kitctl `disable:` |
| `topology` | `{tiers, lead, workers}` | see below |
| `catalog` | `[entry]` | way-local catalog entries for primitives Gestalt does not ship facts about (`confidence: guess`) |
| `settings` | `{"<entry>.<knob key>": value}` | knob values the way relies on in other tools, e.g. `compounder.rules.stop_mode: context`. The entry must be in the catalog and declare that knob, and the value must be a single scalar the knob allows (`GST-SETTING` otherwise). Gestalt never writes them: SETUP.md lists each with the tool's own command. A setting can unblock a hook the catalog marks `unblocked_by` (on the harnesses it names); lint then stops counting that hook as blocking on the lead's primary harness (the first in `harnesses`), and WAY.md says where it still blocks |
| `waive` | `[{code, reason, in?}]` | way-level waivers for codes no single step owns (`GST-BUDGET`, `GST-LEAD`, `GST-HARNESS`, `GST-TIER`), optionally per context. The reason is required and printed in WAY.md. Budgets stay limits; a waiver is a visible, dated exception |
| `taste` | exactly 3 `{id, prompt, context, path[], expect[], expect_quiet[]}` | the taste test. `path` is the stages the prompt should travel. Hooks and protocol steps on the path are expected; a description-routed step is expected only when listed in `expect` (otherwise it "may fire"). `expect_quiet` steps must not fire |

## Budgets (defaults)

| Budget | Default | What it bounds |
|---|---|---|
| `block_tokens` | 450 | the managed block Gestalt adds to CLAUDE.md / AGENTS.md |
| `protocol_rules` | 3 | protocol-mode steps plus instruction links plus the Stop-order line, per context |
| `unordered_blocking_per_event` | 1 | user-owned blocking hooks on one event with no `stop_order` covering them |
| `session_start_lines` | 8 | lines injected at session start, summed across orienters |
| `always_on_tokens` | 12000 | the lead's always-on listing cost per context (survey-measured when available) |
| `skills_per_context` | 8 | skills the lead can see per context |
| `index` | false | add a one-line stage → primitive index to the block (the Vercel finding, to be tested) |

With kitctl, `always_on_tokens` and `skills_per_context` also travel on the `gestalt-flow`
loadout as `budget: {tokens, skills}` (a profile that changes either carries its own), so
`kitctl doctor` warns when what a repo actually enables lists more than the way allows.

## Topology

```yaml
topology:
  tiers:
    claude: { lead: opus, worker: sonnet, critic: sonnet }
    codex: { lead: <model id>, worker: <model id>, critic: <model id> }
  lead:
    keeps: [elonify.diff-review]        # steps that must run in the lead's own context
  workers:
    - id: prose
      tier: worker                      # lead | worker | critic | script
      mechanism: headless               # subagent | headless | agent-file | script
      uses: [prose-author.draft]        # steps this worker performs
      route: drafting or revising prose in my voice
      mcp: []                           # connector ids it holds
      returns: the draft's path and three lines on what changed
```

What each mechanism can and cannot isolate (Claude Code, checked against its docs):

| Mechanism | Model tier | MCP connection | Skill listing | Plugin hooks |
|---|---|---|---|---|
| `subagent` (`.claude/agents/<id>.md`, not a plugin agent; with kitctl, an `agent:` primitive on `gestalt-flow`) | yes (`model:`) | yes, when the connector has an inline `server` | **no**: preloaded skills must be enabled, so the lead lists them | stay in the lead |
| `headless` (`claude -p --plugin-dir … --strict-mcp-config`) | yes | yes | yes | leave the lead entirely (their SessionStart and Stop hooks no longer fire there) |
| `agent-file` (a plugin's own agent) | yes | no (plugin agents ignore `mcpServers`) | n/a | n/a |
| `script` | no model | n/a | n/a | n/a |

Every worker definition Gestalt compiles carries the hand-off contract: pass the user's
original request verbatim and every decision they made since, because a worker without
them argues with choices already made.
