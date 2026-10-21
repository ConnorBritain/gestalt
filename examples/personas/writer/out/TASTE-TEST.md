# Taste test for Ade (newsletter writer)'s way

Three prompts. Run each in a **fresh chat**, in a repo of the kind named, without naming any tool or skill. Then check the transcript (tool calls, hook messages), not the agent's description of what it did: installed is not wired, and wired is not firing.

## 1. draft

**Open in:** any repo.

**Prompt:**

```text
Draft this week's issue from notes.md, about 700 words.
```

**Should happen, in order:**

- orient: cairn debt (hook)
- make: prose-author draft (dispatcher)
- check: prose-review review (protocol, via the critics worker)

**Workers that should spawn:** critics (critic, agent-file). Each should receive the prompt above verbatim.

**May fire, if the prompt calls for it:** prose-research research.

**Only if you ask:** humanizer strip, prose-tell-scan scan.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| prose-author draft | yes |  |  |  |
| prose-review review | yes |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 2. sources

**Open in:** any repo.

**Prompt:**

```text
Find three sources on four-day work weeks, with dates.
```

**Should happen, in order:**

- orient: cairn debt (hook)
- make: prose-research research (dispatcher, via the research worker)

**Workers that should spawn:** research (worker, headless). Each should receive the prompt above verbatim.

**May fire, if the prompt calls for it:** prose-author draft.

**Only if you ask:** humanizer strip.

**Should stay quiet:** prose-review review.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| prose-research research | yes |  |  |  |
| prose-review review | no |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 3. headline

**Open in:** any repo.

**Prompt:**

```text
Subject line A or B: which gets more opens? Log my guess (A, 70%).
```

**Should happen, in order:**

- orient: cairn debt (hook)
- record: cairn capture (explicit)

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| cairn debt | yes |  |  |  |
| cairn capture | yes |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## Then

Paste the three tables (or the transcripts) into `/gestalt:taste`. Each miss is diagnosed along installed → enabled → wired → firing, and the smallest fix goes back into your way.

