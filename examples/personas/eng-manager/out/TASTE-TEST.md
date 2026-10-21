# Taste test for Morgan (engineering manager)'s way

Three prompts. Run each in a **fresh chat**, in a repo of the kind named, without naming any tool or skill. Then check the transcript (tool calls, hook messages), not the agent's description of what it did: installed is not wired, and wired is not firing.

## 1. rfc

**Open in:** a rfc repo (file-exists:RFC.md).

**Prompt:**

```text
Read RFC.md and start implementing the new rate limiter it describes.
```

**Should happen, in order:**

- orient: cairn debt (hook)
- plan: elonify plan-review (protocol, via the critics worker)

**Workers that should spawn:** critics (critic, agent-file). Each should receive the prompt above verbatim.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| elonify plan-review | yes |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 2. fix

**Open in:** a service repo (file-exists:Makefile).

**Prompt:**

```text
Fix the flaky retry test in the payments service.
```

**Should happen, in order:**

- orient: cairn debt (hook)
- check: verification-gate gates (hook)
- check: verification-gate critics (protocol, via the critics worker)
- check: elonify diff-review (protocol, via the critics worker)

**Workers that should spawn:** critics (critic, agent-file). Each should receive the prompt above verbatim.

**Only if you ask:** cairn capture.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| verification-gate gates | yes |  |  |  |
| verification-gate critics | yes |  |  |  |
| elonify diff-review | yes |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 3. decision

**Open in:** any repo.

**Prompt:**

```text
I'm moving the payments team to the platform squad. Log it; I think 65% it cuts lead time by Q2.
```

**Should happen, in order:**

- orient: cairn debt (hook)
- record: cairn capture (explicit)

**Should stay quiet:** elonify plan-review.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| cairn capture | yes |  |  |  |
| elonify plan-review | no |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## Then

Paste the three tables (or the transcripts) into `/gestalt:taste`. Each miss is diagnosed along installed → enabled → wired → firing, and the smallest fix goes back into your way.

