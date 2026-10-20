# Follow-up session: portability across Claude Code, Codex and Cursor

A self-contained brief for a fresh session, written at the end of the Gestalt 0.1 build.
Paste it as the session's first message, or point the session at this file.

## Goal

Bring Connor's tools to the same harness coverage as the best of the family (elonify and
the vonnegut bundles: Claude Code, Codex, Cursor and AGENTS.md). Where a harness cannot
enforce something, label the gap honestly, never paper over it. Then update Gestalt's
catalog to match.

The **person's** words, from the Gestalt session: "there are a number of plugins that are
only Claude Code or not supported in other things (such as Compounder, Kit CTL, etc.). They
need to be extended for Cursor and Codex. I want … us to see about making edits to those
repos to get them up to speed in terms of portability to other agent runtimes."

## Where each repo stands (read 2026-10-20; re-check before editing)

| Repo | Claude Code | Codex | Cursor | AGENTS.md | Notes |
|---|---|---|---|---|---|
| **compounder** 0.1.0 | plugin, 6 hook events | — | — | — | Claude-only. No AGENTS.md or CLAUDE.md. Its focus guard and Stop nudge are all hooks. |
| **kitctl** 0.0.1 | generator | generator | — | managed block | The CLI accepts only `--harness claude\|codex`. "Cursor" appears nowhere in the repo. |
| **cairn** 0.2.0 | plugin | plugin + `install-cairn-codex.mjs` | — | yes (CLAUDE.md = `@AGENTS.md`) | Codex has no SessionStart hook, so its `debt` runs from an instruction. |
| **roadmap** 0.7.2 | plugin, MCP, hooks, monitor | AGENTS.md only; `init --client codex --apply` raw-appends to `~/.codex/config.toml` | — | yes | Has Actions. No Codex or Cursor manifest. |
| **ui-magic** 0.8.0 | plugin | plugin + `.agents` marketplace | — | yes | Has Actions. The plugin lives under `plugins/ui-magic/`. |
| **brand-builder** 0.3.1 | plugin | plugin + `.agents` marketplace + `install-codex-hook.mjs` | — | yes | Has Actions. The plugin lives under `plugins/brand-builder/`. |
| elonify 0.1.0 | ✓ | ✓ | ✓ | ✓ | The reference for four manifests plus wiring. |
| vonnegut bundles | ✓ | ✓ + installer | ✓ | ✓ | The reference for honest enforcement labels per primitive. |

Gestalt's own record of these is in `catalog/*.yaml` (the `harness:` and `install:` fields).
The gaps found while composing them are in [`docs/upstream.md`](../upstream.md).

## Work, in order

Take one repo at a time, on that repo's own development branch, one PR each. Smallest first.

1. **Establish harness facts first, dated.** Before adding any manifest, write down what each
   harness actually supports today, the way kitctl's `docs/harness-reference.md` does (fact,
   date, evidence: verified / schema / documented):
   - **Cursor:** plugin manifest shape; whether plugins can ship hooks, and on which events;
     agents and skills discovery; rule files (`.cursor/rules/*.mdc`, `alwaysApply`); MCP config.
   - **Codex:** plugin hooks (brand-builder notes they run only after the user trusts them,
     with `CLAUDE_PLUGIN_ROOT` set); custom agents (`~/.codex/agents/*.toml`: confirm the
     field names, so Gestalt can start emitting Codex worker agents again; it stopped because
     they were unverified); skills directories; whether SessionStart, UserPromptSubmit,
     PreToolUse and Stop exist.
   - Use the installed CLIs where possible (`codex --version`, `codex debug prompt-input`).
     Never write a trust store.
2. **compounder** (largest gap).
   - Add `.codex-plugin/plugin.json` (with an `interface` block), `.cursor-plugin/plugin.json`,
     `.plugin/plugin.json`, `AGENTS.md`, and `CLAUDE.md` = `@AGENTS.md`. Versions must be
     identical across all four manifests and the marketplace entry.
   - Make `scripts/hook.mjs` harness-neutral: read the payload fields each harness actually
     sends, and resolve the plugin root from `CLAUDE_PLUGIN_ROOT` or a Codex/Cursor
     equivalent, falling back to the script's own path.
   - Where a harness has no hooks, degrade honestly. On Codex, the brief becomes an
     AGENTS.md instruction ("at session start run `compounder status --json`", like cairn's
     `debt`), and the guard and Stop nudge become rules labelled advisory. Write a portability
     table in the README (enforced / partial / advisory / none per feature).
   - While there (from upstream.md): a non-blocking Stop-lines mode, and
     `disable-model-invocation: true` on ritual skills invoked by name.
   - Tests: `npm test` stays green, and every hook path has a case per harness payload shape.
3. **cairn**: add `.cursor-plugin` and `.plugin` manifests. Cursor has no SessionStart hook
   unless step 1 finds one, so add the `debt` instruction for Cursor too. Extend
   `tools/check-packaging.mjs` to pin all four.
4. **roadmap**: add Codex and Cursor manifests for the skills. Replace
   `roadmap init --client codex --apply`'s raw append with the documented manual step or a
   kitctl `mcp:` primitive. Keep the Gauntlet's harness-specific dispatch as it is (it
   already targets Codex Cloud).
5. **ui-magic, brand-builder**: add `.cursor-plugin` manifests under `plugins/<name>/`. Their
   PostToolUse scan hooks are path-scoped by dotfile config; port them only if step 1 shows
   Cursor hooks exist, otherwise document the gap. Keep their existing Actions and
   `claude plugin validate --strict`.
6. **kitctl** (Python, its own conventions; read its `PLAN.md` first):
   - Add `cursor` as a harness in `harness.py` with dated facts, generators for Cursor
     targets (`.cursor/mcp.json`, `.cursor/rules/<managed>.mdc` for the instruction block),
     and capability gaps for anything Cursor cannot express. Live apply stays sandbox-only.
   - While there (from upstream.md): `validate` must report, not crash (`KeyError: 'command'`),
     on an external MCP primitive with no launch spec.
7. **Gestalt**: update `catalog/*.yaml` (`harness:`, `install:`, `version_seen`, re-measured
   `cost`), recompile `examples/` (`GESTALT_UPDATE_EXAMPLES=1 node tests/examples.mjs`, then
   review the diff), and tick the matching lines in `docs/upstream.md`. If step 1 verified the
   Codex agent fields, restore Codex worker agents in `tools/lib/agents-emit.mjs` (removed in
   0.1.0 because they were unverified).

8. **Connor's budgets, back within limits.** Connor chose budgets per measure: 5 always-on
   rules (by choice), 8 session-start lines, 12 listed skills. Once compounder's brief is
   short (upstream.md) and cairn's and compounder's ritual skills no longer list every turn,
   trim `examples/connor/way.yaml` until it lints under those limits, and delete its two
   way-level waivers. If it still cannot fit, put the remaining overrun to Connor; do not
   raise a budget on his behalf.
9. **Trail-code (formerly Graft, `trailhq/Graft`) as a new-repo ritual.** These facts come
   from its README at commit `dfcbf4c` (read 2026-10-20). Confirm them with
   `trail init --dry-run` before relying on them.
   - **What it is.** `npm i -g @trailhq/trail-code && trail init`; the old `graft` commands
     still work. `trail init` does four things:
     - builds a local tree-sitter **code map** (`graft/`, gitignored, rebuilt per clone);
     - creates **learnings** in `.trail/` (committed: decisions and preferences about the code)
       and `~/.trail/` (personal);
     - registers an MCP server with six tools (`trail_find_code`, `trail_trace_calls`, …);
     - wires each agent you select.
   - **What it writes.**
     - A marker-fenced section in AGENTS.md (Codex and others).
     - An owned `.claude/skills/trail/SKILL.md` and `.cursor/rules/trail.mdc`. It never
       touches CLAUDE.md.
     - The project `.mcp.json`.
     - **Machine-wide:** `~/.claude/settings.json` (SessionStart, UserPromptSubmit,
       PostToolUse and Stop hooks, plus a statusline), `~/.claude.json` (MCP),
       `~/.codex/config.toml` and `~/.codex/hooks.json`.
     - `--no-global`, `--no-hooks`, `--no-statusline` and `--agents <ids>` narrow this.
   - **It does not write nested per-folder AGENTS.md.** Per-file knowledge lives in the map,
     and per-code decisions in `.trail/learnings/`, both fetched on demand. That serves
     Connor's "each folder atomically understood" better than nested always-on files, so
     Gestalt should not add any.
   - **Collisions for Gestalt to resolve** (lint and the survey will show them):
     - another SessionStart injector, a UserPromptSubmit context injector, a PostToolUse edit
       hook and a Stop hook (find out whether it blocks);
     - a statusline that competes with compounder's;
     - machine-wide writes that bypass kitctl. Run it with `--no-global` and let kitctl
       carry the user-level hooks and MCP as primitives (upstream ask);
     - learnings of kind "decision" overlap cairn's `choice`. They differ: Trail records why
       the code is the way it is, for agents; cairn records a judgment with a confidence, for
       calibration. Link them, don't merge them.
   - **Telemetry** is anonymous and opt-out, and includes an install ping from npm
     postinstall. Ask Connor whether to set `DO_NOT_TRACK=1` in his way's SETUP.
   - **Its numbers are its own.** The README reports 46% fewer tool calls and 33/50 vs 27/50 on
     SWE-bench Verified. Treat them as vendor claims; Gestalt's eval would test them on
     Connor's repos.
   - **Recommendation, agreed with Connor:**
     - Adopt Trail in the code contexts (plugin, roadmap, app, site) only, through their kitctl
       loadouts, not in writing folders. Its code map is retrieval: the agent fetches the
       relevant functions on demand, the same mechanism RAG-MCP credits for better selection.
     - Run `trail init --no-global --no-statusline --agents <the way's harnesses>`. kitctl
       carries its user-level hooks and MCP as primitives, and compounder keeps the status
       line, so each file keeps one owner.
     - Keep learnings on, linked to cairn: a cairn `choice` about code may also be saved as a
       Trail decision.
     - Ask Connor about `DO_NOT_TRACK=1`.
     - **Pilot before rollout:** run the `build` taste prompt in one plugin repo with and
       without Trail, and compare tool calls, tokens and the answer. That tests its own
       claims on Connor's code.
     - Shorten compounder's brief first. Trail adds a session-start and a per-prompt
       injector, which presses on the 8-line budget.
   - **Then:**
     1. Add `catalog/trail.yaml`: orient (repo map, ambient), make (`trail_find_code`
        through MCP), check (`trail check`, which flags a change that undoes a recorded
        decision), record (save a learning).
     2. Add an "on entering a repo" cadence to the way model (beside daily, weekly and
        monthly), in this order: `kitctl use` the repo's loadouts → `trail init --no-global
        --agents <the way's harnesses>` → the Gestalt context block.
     3. Teach the survey Trail's AGENTS.md marker.
     4. Add it to Connor's way and recompile; the session-start budget is the thing to watch.
10. **Connor's BOOTSTRAP.md.** Copy `examples/connor/out/BOOTSTRAP.md` (or a fresh compile
    of his real `~/.gestalt/way.yaml`) into his private warehouse, `ConnorBritain/agent-kits`,
    next to the kitctl loadouts, if this session can reach that repo. It is personal; keep it
    out of public repos.

## Rules for every repo

- Read the repo's `AGENTS.md` / `CLAUDE.md` and follow its gate:
  - `node tools/check.mjs` (cairn, vonnegut)
  - `node tests/selftest.mjs` (elonify)
  - `npm test` (compounder, roadmap)
  - `node --test` plus `claude plugin validate --strict` (ui-magic, brand-builder)
  - kitctl's pytest suite
- Respect each repo's stance on GitHub Actions: cairn and vonnegut forbid them; the others
  have them.
- Use only the four-manifest conventions of agent-primitives: same version everywhere, skill
  frontmatter `name` and `description` only, `PLUGIN` as the root reference. A version bump
  goes in the same commit as the repo's STATUS or CHANGELOG change.
- Never overstate enforcement. A rule a harness cannot make happen is `advisory`, and the
  README says so.
- Before calling a repo done, run its tests and its critics (elonify ∥ verification-gate on
  the diff, with this brief's goal as the original request).

## Done when

Each repo has a merged-ready PR with: the new manifests, a portability table, tests green,
and the harness facts it relied on (with dates). Gestalt's catalog and examples reflect the
new coverage, Connor's way lints under its limits without waivers (or the overrun is put
to him), Trail is in his way as a new-repo ritual, and `GESTALT_STRICT=1 node tools/check.mjs`
passes there.
