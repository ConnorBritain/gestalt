# Upstream asks

Things Gestalt found in sibling tools while composing them. They are filed here, not
changed from this repo: each tool's owner decides. Every item names what Gestalt saw and
the smallest change that would fix it.

## kitctl

- **`kitctl validate` crashes on an external MCP primitive with no `command`.** A primitive
  `{kind: mcp, external: true, harnesses: {claude: {}}}` raises
  `KeyError: 'command'` in `resolve.py` `_launch`, instead of reporting a problem. Validate
  should report it (or accept `external` MCP without a launch spec).
- **No Cursor harness.** Gestalt's ways name Cursor, and SETUP.md falls back to manual
  steps.
- **An `agent` primitive kind.** Gestalt emits worker agent files (`.claude/agents/<id>.md`,
  `~/.codex/agents/<id>.toml`) and places them with its own `write --agents`. kitctl owning
  them would keep one writer for all native config.
- **Always-on cost in `inventory`.** `gestalt survey --json` measures listing tokens per
  plugin. kitctl could read it, or adopt the same `ceil(chars/4)` estimate, so `doctor` can
  flag a loadout over its budget.

## roadmap

- **`roadmap init --client codex --apply` appends raw text to `~/.codex/config.toml`.**
  That collides with kitctl's ownership ledger. Publishing the graph server as a kitctl
  `mcp:` primitive would let kitctl write it.
- **Thirteen skills list in every roadmap repo.** Splitting them by profile (`engineering`
  vs `general`) would halve the lead's skill count in roadmap repos. Connor's way sits at
  its 32-skill budget there.

## compounder

- **Its Stop lines are a recorder that blocks the turn.** A non-blocking mode (a
  `systemMessage` instead of `decision: block`), or `stop_nudge` per lane, would remove the
  last `GST-RECORDER-BLOCKS` in Connor's way.
- **Claude Code only.** Codex and Cursor manifests would let its brief and guard travel.
- **Ritual skills list every turn.** `review`, `interview`, `update`, `mode` and `focus` are
  invoked by name. `disable-model-invocation: true` takes them out of the always-on listing
  (the survey counts such skills as 0 tokens).

## cairn

- **Score critic verdicts.** Logging each elonify REFRAME or CUT FIRST as a `choice` or
  `prediction` (Gestalt's block already offers `/cairn` after a REFRAME) and resolving it
  later would let cairn calibrate elonify. That needs an import path for a verdict log
  (below).
- **No Cursor manifest.**
- **Ritual skills list every turn.** `cairn-review`, `cairn-score`, `cairn-tune` and
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

## agent-primitives (verification-gate)

- **A heartbeat for `gate-runner`.** ui-magic and brand-builder write a heartbeat when their
  hooks fire, which lets a taste test prove a hook ran. The Tier-1 Stop gate has none.
