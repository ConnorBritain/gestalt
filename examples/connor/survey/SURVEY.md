# Survey

Generated 2026-10-20. Token figures are an estimate: ceil(chars / 4), good for ranking and budgets, not a tokenizer count.

## Headline

- **Always-on (Claude Code lead): ≈7266 tokens**: instructions 0, skill listings 4770, agent listings 2476, commands 20.
- 11 plugins live, 49 skills, 24 agents, 1 commands, 1 MCP servers.
- Stop hooks that can block a turn: 3 (elonify, compounder, verification-gate).
- Harnesses found: none.

## Plugins by always-on cost

| Plugin | Scope | Enabled | Skills | Agents | Cmds | ≈Tokens | Hooks | MCP | Catalog |
|---|---|---|---|---|---|---|---|---|---|
| roadmap | checkout | yes | 13 | 4 | 0 | 1308 | SessionStart Stop | 1 | roadmap |
| ui-magic | checkout | yes | 7 | 2 | 0 | 1090 | PostToolUse | — | ui-magic |
| prose-review | checkout | yes | 0 | 6 | 0 | 872 | — | — | prose-review |
| brand-builder | checkout | yes | 6 | 2 | 0 | 851 | PostToolUse | — | brand-builder |
| cairn | checkout | yes | 6 | 3 | 0 | 769 | SessionStart Stop | — | cairn |
| prose-author | checkout | yes | 4 | 4 | 0 | 741 | — | — | prose-author |
| compounder | checkout | yes | 8 | 0 | 0 | 732 | SessionStart UserPromptSubmit! PreToolUse! PostToolUse Stop! SessionEnd | — | compounder |
| gestalt | checkout | yes | 3 | 0 | 0 | 280 | — | — | gestalt |
| elonify | checkout | yes | 1 | 1 | 0 | 258 | PostToolUse SubagentStop Stop! | — | elonify |
| verification-gate | checkout | yes | 0 | 2 | 0 | 186 | Stop! | — | verification-gate |
| prose-tell-scan | checkout | yes | 1 | 0 | 1 | 179 | — | — | prose-tell-scan |

`!` blocks the turn, `?` can block (unknown to the catalog).

## Collisions

- **GST-C-STOP** (warn): 3 Stop hooks can block the same turn: elonify [opt-in .claude/elonify.json], compounder, verification-gate [opt-in .claude/gates.json]. They run together; nothing orders them.
- **GST-C-START** (info): 3 SessionStart hooks inject context: cairn, compounder, roadmap
- **GST-C-COUNTER** (info): 4 PostToolUse hooks watch edits: elonify, compounder, ui-magic, brand-builder
- **GST-C-SLOT** (warn): ui-magic and brand-builder generate the same thing; enable one per context

## What the survey cannot see

- MCP tool definitions are not counted: the survey never starts a server. Claude Code defers them by default (tool search); harnesses that load them up front pay for them every turn.
