# Upstream asks

Things Gestalt found in sibling tools while composing them. They are filed here, not
changed from this repo: each tool's owner decides. Every item names what Gestalt saw and
the smallest change that would fix it. **Done** marks an ask with an open PR (from the
portability session, 2026-10-20, or later); it is done when that PR merges.

## kitctl

- **Done** ([kitctl#8](https://github.com/ConnorBritain/kitctl/pull/8)): **`kitctl validate` crashes on an external MCP primitive with no `command`.** A primitive
  `{kind: mcp, external: true, harnesses: {claude: {}}}` raises
  `KeyError: 'command'` in `resolve.py` `_launch`, instead of reporting a problem. Validate
  should report it (or accept `external` MCP without a launch spec).
- **Done** ([kitctl#8](https://github.com/ConnorBritain/kitctl/pull/8)), unverified on a real
  Cursor: **No Cursor harness.** Gestalt's ways name Cursor, and SETUP.md falls back to manual
  steps.
- **Done** (kitctl 0.1.0): **An `agent` primitive kind.** Gestalt emits worker agent files (`.claude/agents/<id>.md`,
  `~/.codex/agents/<id>.toml`) and places them with its own `write --agents`. kitctl owning
  them would keep one writer for all native config. Gestalt now emits each subagent worker
  as `kit/primitives/agents/<id>.yaml` with its files beside it, listed on `gestalt-flow`;
  `write --agents` stays for ways without kitctl.
- **Done** (kitctl 0.1.0): **Always-on cost in `inventory`.** `gestalt survey --json` measures listing tokens per
  plugin. kitctl could read it, or adopt the same `ceil(chars/4)` estimate, so `doctor` can
  flag a loadout over its budget. Loadouts take `budget: {tokens, skills}`, and Gestalt puts
  the way's `always_on_tokens` and `skills_per_context` on `gestalt-flow`.

## roadmap

- **Done** ([roadmap#58](https://github.com/ConnorBritain/roadmap/pull/58)), through Codex's own
  `codex mcp add`: **`roadmap init --client codex --apply` appends raw text to `~/.codex/config.toml`.**
  That collides with kitctl's ownership ledger. Publishing the graph server as a kitctl
  `mcp:` primitive would let kitctl write it.
- **Done** ([roadmap#59](https://github.com/ConnorBritain/roadmap/pull/59), 0.8.0, which hides its six rituals instead of splitting by profile: 7 listed skills): **Thirteen skills list in every roadmap repo.** Splitting them by profile (`engineering`
  vs `general`) would halve the lead's skill count in roadmap repos. Connor's way lists 24
  skills there against a limit of 12 (a warning he chose to keep visible, 2026-10-20).

## compounder

- **Done** ([compounder#2](https://github.com/ConnorBritain/compounder/pull/2), 0.3.0; Claude Code only): **Its Stop lines are a recorder that blocks the turn.** A non-blocking mode (a
  `systemMessage` instead of `decision: block`), or `stop_nudge` per lane, would remove the
  last `GST-RECORDER-BLOCKS` in Connor's way. `rules.stop_mode: context` asks for the lines
  as context mid-session instead; Connor's way sets it (`settings:`). Codex and Cursor still
  block at Stop as the fallback, which WAY.md states.
- **Done** ([compounder#1](https://github.com/ConnorBritain/compounder/pull/1)): **Its session-start brief is about 13 lines in a focus session** (a status line plus the
  brief from `scripts/lib/brief.mjs`), more than an 8-line session-start budget by itself.
  A three-line default (focus, next move, ship clock), with the rest on `/compounder:checkin`,
  would fit beside other orienters.
- **Done** ([compounder#1](https://github.com/ConnorBritain/compounder/pull/1)): **Claude Code only.** Codex and Cursor manifests would let its brief and guard travel.
- **Done** ([compounder#1](https://github.com/ConnorBritain/compounder/pull/1); `mode` stays
  listed because it answers "why was I blocked"): **Ritual skills list every turn.** `review`, `interview`, `update`, `mode` and `focus` are
  invoked by name. `disable-model-invocation: true` takes them out of the always-on listing
  (the survey counts such skills as 0 tokens).

## cairn

- **Score critic verdicts.** Logging each elonify REFRAME or CUT FIRST as a `choice` or
  `prediction` (Gestalt's block already offers `/cairn` after a REFRAME) and resolving it
  later would let cairn calibrate elonify. That needs an import path for a verdict log
  (below).
- **Done** ([cairn#1](https://github.com/ConnorBritain/cairn/pull/1)): **No Cursor manifest.**
- **Done** ([cairn#1](https://github.com/ConnorBritain/cairn/pull/1)): **Ritual skills list every turn.** `cairn-review`, `cairn-score`, `cairn-tune` and
  `cairn-witness` are invoked by name. `disable-model-invocation: true` would take them out
  of the always-on listing.

## elonify

- **No verdict history.** The per-session state file is deleted when a Stop is allowed.
  Appending each `VERDICT:` (with target, date and cuts) to a JSONL log would make
  calibration possible, through cairn or on its own.
- **A focus input.** compounder's `focus.shareable_when` and roadmap's slice are natural
  "limiting factor" inputs. The review skill already says to quote a roadmap slice; naming
  compounder's focus the same way would join the two.

## vonnegut

- **A hand-off contract from humanizer.** prose-author could accept a "neutral draft" (the
  output of humanizer's strip pass) as an explicit input, so the two compose without the
  lead restating anything.
- **A marker for writing projects.** Gestalt's examples use `WRITING.md` to detect a
  writing context. A marker vonnegut itself recognises would let every tool agree.

## ui-magic (and every copy of its YAML reader)

- **An apostrophe in a flow map breaks the next line.** This fails with `unexpected text
  after flow collection` on line 2:

  ```yaml
  s:
    - { id: a, invoke: Ade's draft }
    - { id: b, invoke: plain }
  ```

  PyYAML reads it correctly. The same document on one line, or with only the first item,
  parses fine. Gestalt quotes such values until the pinned copy is refreshed.

## ui-magic and brand-builder

- **The edit-time scan has no Cursor route.** Cursor's `afterFileEdit` returns nothing to
  the agent ([ui-magic#1](https://github.com/ConnorBritain/ui-magic/pull/1),
  [brand-builder#1](https://github.com/ConnorBritain/brand-builder/pull/1) document the gap).
  Recording edits there and returning findings from `stop` as `followup_message` would work,
  but makes the scan a once-per-turn gate in Cursor; that is the owner's call.

## Trail-code (trailhq/Trail-Code, 0.23.0)

- **`trail init --dry-run` ignores `--no-global`, `--no-statusline` and `--no-hooks`.** It lists
  `~/.claude` writes that the real run, given those flags, does not make. A dry run that
  overstates is what makes people skip the real run.
- **The SessionStart context is 29 lines in a one-file repo**, plus about 4 per prompt, and it
  still says "graft". A short mode (one line pointing at `trail map`) would fit an 8-line
  session-start budget beside other orienters.
- **`.cursor/mcp.json` runs `npx -y @trailhq/trail-code mcp`, unpinned.** A pinned version
  would keep the MCP server and the CLI that built the map in step, and lets kitctl own it.
- **No `codex` agent id.** `--agents agents` writes the AGENTS.md section; Codex's MCP and
  hooks are machine-wide and skipped by `--no-global`. A project `.codex/` option would let
  Codex use the map without touching `~/.codex`.
- **The Stop-hook note request displaces the answer.** In the pilot
  ([examples/connor/trail-pilot.md](../examples/connor/trail-pilot.md)) the forced
  `trail note` turn became the session's final message. Asking for the note *before* the
  summary, or appending one line instead of blocking, would keep the answer last.
- **It injects a promotional line into agent output** ("…get to a PR 3x faster"). A tool's
  marketing in the agent's answer is noise to the person reading it; it should be opt-in.
- **It writes `.claude/settings.json` and `.claude/settings.local.json` itself.** Publishing its
  hooks as kitctl `hook:` primitives (and the MCP server as an `mcp:` primitive) would keep
  one writer per file.

## agent-primitives (verification-gate)

- **A heartbeat for `gate-runner`.** ui-magic and brand-builder write a heartbeat when their
  hooks fire, which lets a taste test prove a hook ran. The Tier-1 Stop gate has none.
