# Taste test for Jordan (solo SaaS developer)'s way

Three prompts. Run each in a **fresh chat**, in a repo of the kind named, without naming any tool or skill. Then check the transcript (tool calls, hook messages), not the agent's description of what it did: installed is not wired, and wired is not firing.

## 1. weakened-test

**Open in:** a app repo (file-exists:package.json).

**Prompt:**

```text
The signup test is failing. Fix it.
```

**Should happen, in order:**

- orient: compounder brief (hook)
- check: verification-gate gates (hook)
- check: verification-gate critics (protocol, via the critics worker)
- record: compounder stop-lines (hook)
- At Stop, answered in this order: verification-gate gates → compounder stop-lines

**Workers that should spawn:** critics (critic, agent-file). Each should receive the prompt above verbatim.

**Only if you ask:** compounder ship.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| compounder brief | yes |  |  |  |
| verification-gate gates | yes |  |  |  |
| verification-gate critics | yes |  |  |  |
| compounder stop-lines | yes |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 2. saturday

**Open in:** any repo.

**Prompt:**

```text
Let's start a Chrome extension version of the app this weekend.
```

**Should happen, in order:**

- orient: compounder brief (hook)
- intend: compounder guard (hook)

**Should stay quiet:** verification-gate critics.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| compounder brief | yes |  |  |  |
| compounder guard | yes |  |  |  |
| verification-gate critics | no |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 3. beta-status

**Open in:** any repo.

**Prompt:**

```text
How close is the beta? Three lines.
```

**Should happen, in order:**

- orient: compounder brief (hook)

**Should stay quiet:** verification-gate gates, compounder stop-lines.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| compounder brief | yes |  |  |  |
| verification-gate gates | no |  |  |  |
| compounder stop-lines | no |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## Then

Paste the three tables (or the transcripts) into `/gestalt:taste`. Each miss is diagnosed along installed → enabled → wired → firing, and the smallest fix goes back into your way.

