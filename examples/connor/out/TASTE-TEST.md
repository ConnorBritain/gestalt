# Taste test for Connor England's way

Three prompts. Run each in a **fresh chat**, in a repo of the kind named, without naming any tool or skill. Then check the transcript (tool calls, hook messages), not the agent's description of what it did: installed is not wired, and wired is not firing.

## 1. temptation

**Open in:** any repo.

**Prompt:**

```text
New idea: a tool that syncs my loadouts to every laptop. Let's scaffold it in a fresh repo.
```

**Should happen, in order:**

- orient: cairn debt (hook)
- orient: compounder brief (hook)
- intend: compounder guard (hook)

**Should stay quiet:** elonify diff-review, verification-gate critics.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| compounder brief | yes |  |  |  |
| compounder guard | yes |  |  |  |
| elonify diff-review | no |  |  |  |
| verification-gate critics | no |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 2. build

**Open in:** a plugin repo (file-exists:.claude-plugin/plugin.json).

**Prompt:**

```text
Add a --json flag to `cairn debt`, with a test that pins the output shape.
```

**Should happen, in order:**

- orient: cairn debt (hook)
- orient: compounder brief (hook)
- plan: elonify plan-review (protocol, via the critics worker)
- check: verification-gate gates (hook)
- check: elonify diff-review (protocol, via the critics worker)
- check: verification-gate critics (protocol, via the critics worker)
- record: compounder stop-lines (hook)
- At Stop, answered in this order: verification-gate gates → elonify diff-review → compounder stop-lines → platform git-check

**Workers that should spawn:** critics (critic, agent-file). Each should receive the prompt above verbatim.

**May fire, if the prompt calls for it:** prose-author draft.

**Only if you ask:** humanizer strip, compounder ship, cairn capture.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| compounder brief | yes |  |  |  |
| elonify plan-review | yes |  |  |  |
| verification-gate gates | yes |  |  |  |
| elonify diff-review | yes |  |  |  |
| verification-gate critics | yes |  |  |  |
| compounder stop-lines | yes |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 3. voice

**Open in:** a writing repo (file-exists:WRITING.md).

**Prompt:**

```text
Draft a 200-word changelog post announcing Gestalt 0.1.
```

**Should happen, in order:**

- orient: cairn debt (hook)
- orient: compounder brief (hook)
- make: prose-author draft (dispatcher, via the prose worker)
- check: prose-review review (protocol, via the critics worker)

**Workers that should spawn:** prose (worker, headless), critics (critic, agent-file). Each should receive the prompt above verbatim.

**Only if you ask:** humanizer strip, prose-tell-scan scan.

**Should stay quiet:** verification-gate gates.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| compounder brief | yes |  |  |  |
| prose-author draft | yes |  |  |  |
| prose-review review | yes |  |  |  |
| verification-gate gates | no |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## Then

Paste the three tables (or the transcripts) into `/gestalt:taste`. Each miss is diagnosed along installed → enabled → wired → firing, and the smallest fix goes back into your way.

