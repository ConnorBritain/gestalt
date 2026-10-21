# Harness facts

What each harness actually supports, with the date and the evidence. The catalog's
`harness:` and `install:` fields, the portability PRs in the sibling repos and the Codex agent
emitter rely on these. Re-check before relying on a fact older than a few months; harnesses
change faster than docs.

Evidence levels follow kitctl's `docs/harness-reference.md`: **verified** means observed by
running the installed CLI, **source** means read from the vendor's own published repository
or binary without running the feature, **vendor** means seen in what a third-party tool wrote
for that harness.

## Codex 0.163.0 (`@openai/codex`, read 2026-10-20)

| Fact | Evidence |
|---|---|
| A plugin is recognised by `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json` or a root `plugin.json` | verified |
| Manifest fields: `name`, `version`, `description`, `skills`, `hooks`, `mcpServers`, `interface{…}`. Skills are namespaced `plugin:skill`. Plugin `agents/*.md` and `commands/*.md` are not loaded | verified |
| Marketplaces: `codex plugin marketplace add`; `.agents/plugins/marketplace.json`, `.claude-plugin/` and `.cursor-plugin/` marketplaces are read | verified |
| Hook events: PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SessionStart, SessionEnd, UserPromptSubmit, SubagentStart, SubagentStop, Stop, Interrupt | verified (binary) |
| Hook files: `$CODEX_HOME/hooks.json`, `[[hooks.X]]` in config.toml, a plugin's `hooks/hooks.json` (default path), project `.codex/hooks.json` only in a trusted project | verified |
| No hook runs until the user trusts it (`/hooks`). Handlers are `command` and `mcpTool` | verified |
| `${CLAUDE_PLUGIN_ROOT}` is substituted in plugin hook commands; `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` in Agent Plugins MCP stdio config | verified (binary) |
| Exit 2 blocks; `decision: block` works for UserPromptSubmit and Stop; PreToolUse uses `permissionDecision`; `additionalContext` works on SessionStart and UserPromptSubmit; Stop input carries `stop_hook_active` | verified |
| Tool names: edits go through `apply_patch` (a freeform patch with `*** Update File: path` headers); commands through `exec_command` (older: `shell`). The binary has no `Bash` string. What `tool_name` a shell hook payload carries has **not** been observed | source (binary) |
| Custom agents: `$CODEX_HOME/agents/*.toml`. `name`, `description`, `developer_instructions` required; an unknown key makes Codex ignore the file ("unknown field"); `model`, `model_reasoning_effort`, `sandbox_mode`, `approval_policy`, `[mcp_servers.<id>]` (incl. `url`, `bearer_token_env_var`), `[[skills.config]]` accepted. Receipt: the app-server loaded Connor's compiled `linear.toml` (http server, `bearer_token_env_var`) without error, while a control copy with one extra key in the same directory was rejected by name ("unknown field `bogus_key`") | verified |
| Skill roots: `$CODEX_HOME/skills`, `~/.agents/skills`, `.agents/skills`, `.codex/skills` (live, not legacy). `[[skills.config]] enabled = false` in user config removes one | verified |
| A skill's `agents/openai.yaml` with `policy.allow_implicit_invocation: false` keeps Codex from invoking it implicitly (the Codex equivalent of `disable-model-invocation`) | source (binary string) |
| AGENTS.md: project docs share a 32 KiB budget; later files are dropped silently | source |
| `codex mcp add <name> [--env K=V] -- <cmd> <args>` writes `[mcp_servers.<name>]`; re-running replaces the entry | verified |
| `codex exec`: `-m`, `-p/--profile`, `-c`, `-s`, `--json`, `-o`, `--ephemeral`, `--ignore-user-config`, `--skip-git-repo-check` | verified (help) |

## Cursor (cursor/plugins at `29fa938`, read 2026-10-20)

No Cursor CLI was available, and cursor.com docs were unreachable. Everything here is
**source** (Cursor's own plugin repository and schemas) unless marked.

| Fact | Evidence |
|---|---|
| `.cursor-plugin/plugin.json`: required `name` (kebab-case); `author` is `{name, email}` only; top-level keys limited to displayName, description, version, minClientVersions, author, publisher, homepage, repository, license, logo, keywords, category, tags, commands, agents, skills, rules, hooks, variables, mcpServers (`additionalProperties: false`). Component values are a path, a glob or an array | source (schema) |
| Marketplace: `.cursor-plugin/marketplace.json` with `plugins[{name, source, description}]`; `source` is relative to the marketplace root | source (schema) |
| Plugin hooks: `{"version": 1, "hooks": {"<camelCaseEvent>": [{"command", "matcher"?, "loop_limit"?}]}}` with `${CURSOR_PLUGIN_ROOT}`; `hooks/hooks.json` is read by default | source |
| Events seen in Cursor's plugins: `afterFileEdit`, `afterAgentResponse`, `subagentStop`, `stop`. Trail-code also writes `postToolUse`, `afterMCPExecution`, `sessionEnd` | source; vendor |
| `stop` receives `{status, loop_count, conversation_id, generation_id, transcript_path}` and continues the agent with `{followup_message}`; `afterFileEdit` receives `{file_path, edits}` and returns nothing to the agent | source |
| No SessionStart or UserPromptSubmit hook was found in Cursor's plugins | source (absence) |
| Rules: `.mdc` files with `description`, `alwaysApply`, `globs` | source |
| Agents: frontmatter `name`, `description`, `model`, `readonly`, `is_background`. Claude Code's `disallowedTools` is not a Cursor field | source |
| Project files `.cursor/mcp.json`, `.cursor/rules/*.mdc`, `.cursor/hooks.json` | vendor (Trail-code writes all three); docs not reachable |
| Environment: `CURSOR_PROJECT_DIR` | source |

## Trail-code 0.23.0 (`@trailhq/trail-code`, run 2026-10-20)

Installed into a scratch directory with `DO_NOT_TRACK=1` set first, and run in a sandbox repo
with a temporary HOME: **verified** unless marked. Details in [catalog/trail.yaml](../catalog/trail.yaml).

- `trail init --no-global --no-statusline --agents claude agents cursor` writes no agent
  config outside the repo, but does write its own bookkeeping under HOME: `~/.trail/`
  (`README.md`, `install.json`, `repos/known.json`) and `~/.graft/trail-handover.json`. In
  the repo it writes `.claude/settings.json` (SessionStart), `.claude/settings.local.json`
  (UserPromptSubmit, PostToolUse, Stop, SessionEnd, permissions), `.trail/`, a fenced
  `<!-- trail:start -->` section in AGENTS.md (41 lines), `.cursor/rules/trail.mdc`,
  `.cursor/mcp.json` (unpinned `npx -y @trailhq/trail-code mcp`) and `.cursor/hooks.json`.
- `--dry-run` ignores `--no-global`, `--no-statusline` and `--no-hooks` and lists machine-wide
  writes the real run does not make (source: `dist/cli.js` prints the plan before reading them).
- There is no `codex` agent id; `agents` means the AGENTS.md section. Codex's MCP and hooks
  are machine-wide and skipped by `--no-global`.
- SessionStart injects 29 lines in a one-file repo (still worded as graft); each prompt gets
  about 4 more. The Stop hook blocks once per session after a long turn with no learning,
  and honours `stop_hook_active`.
- `trail telemetry status` reports off when `DO_NOT_TRACK` is set.
