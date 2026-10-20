# Taste test for Sam (bid analyst)'s way

Three prompts. Run each in a **fresh chat**, in a repo of the kind named, without naming any tool or skill. Then check the transcript (tool calls, hook messages), not the agent's description of what it did: installed is not wired, and wired is not firing.

## 1. cost-table

**Open in:** a pricing repo (file-exists:MODEL.md).

**Prompt:**

```text
Build a cost table for 3 years at 4% inflation from the assumptions in MODEL.md.
```

**Should happen, in order:**

- make: org-finance model (dispatcher)
- check: org-finance check (protocol, via the reviewer worker)

**Workers that should spawn:** reviewer (critic, agent-file). Each should receive the prompt above verbatim.

**Should stay quiet:** org-brand voice.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| org-finance model | yes |  |  |  |
| org-finance check | yes |  |  |  |
| org-brand voice | no |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 2. rfp-section

**Open in:** a rfp repo (file-exists:RFP.md).

**Prompt:**

```text
Draft the answer to requirement 4.2 (data residency) with citations.
```

**Should happen, in order:**

- make: org-rfp draft (dispatcher, via the library worker)
- check: org-rfp score (protocol, via the reviewer worker)

**Workers that should spawn:** library (worker, subagent), reviewer (critic, agent-file). Each should receive the prompt above verbatim.

**May fire, if the prompt calls for it:** org-rfp extract.

**Only if you ask:** org-brand voice.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| org-rfp draft | yes |  |  |  |
| org-rfp score | yes |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## 3. plain-question

**Open in:** any repo.

**Prompt:**

```text
What's in this folder? Two lines.
```

**Should happen, in order:**

- Nothing beyond a direct answer.

**Should stay quiet:** org-rfp score, org-finance check.

| Step | Expected | Fired? | In order? | Note |
|---|---|---|---|---|
| org-rfp score | no |  |  |  |
| org-finance check | no |  |  |  |

**Pass:** every expected step fired, in order, nothing marked quiet fired, and the answer itself was good. Note anything that fired that is not listed.

## Then

Paste the three tables (or the transcripts) into `/gestalt:taste`. Each miss is diagnosed along installed → enabled → wired → firing, and the smallest fix goes back into your way.

