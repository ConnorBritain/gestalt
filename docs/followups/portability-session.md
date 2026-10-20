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
new coverage, and `node tools/check.mjs` passes there.
