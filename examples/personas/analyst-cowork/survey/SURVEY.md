# Survey

Generated 2026-10-20. Token figures are an estimate: ceil(chars / 4), good for ranking and budgets, not a tokenizer count.

## Headline

- **Always-on (Claude Code lead): ≈569 tokens**: instructions 0, skill listings 569, agent listings 0, commands 0.
- 3 plugins live, 22 skills, 0 agents, 0 commands, 2 MCP servers.
- Stop hooks that can block a turn: 1 (platform:stop-hook-git-check).
- Harnesses found: claude.

## Plugins by always-on cost

| Plugin | Scope | Enabled | Skills | Agents | Cmds | ≈Tokens | Hooks | MCP | Catalog |
|---|---|---|---|---|---|---|---|---|---|
| org-finance | synced | yes | 9 | 0 | 0 | 243 | — | 2 | — |
| org-rfp | synced | yes | 7 | 0 | 0 | 168 | — | — | — |
| org-brand | synced | yes | 6 | 0 | 0 | 158 | — | — | — |

`!` blocks the turn, `?` can block (unknown to the catalog).

## Collisions

- None found.

## Aggressive descriptions (heuristic)

- ~/.claude/plugins/synced/org_bucket2/org-brand/skills/org-brand-skill-0/SKILL.md: "ALWAYS USE"

## Usage

- Plugin counters (~/.claude.json): org-rfp@synced 3, org-finance@synced 0, org-brand@synced 0.

## What the survey cannot see

- MCP tool definitions are not counted: the survey never starts a server. Claude Code defers them by default (tool search); harnesses that load them up front pay for them every turn.
