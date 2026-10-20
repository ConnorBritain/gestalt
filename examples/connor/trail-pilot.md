# Trail pilot: one run with, one without

Connor decided (2026-10-20) to pilot Trail-code before adding it to his way. This is the
first run: **one session each, n = 1, not a benchmark.** It tells you what to look at next,
not whether Trail helps.

## Setup

- Task: the `build` taste prompt, "Add a --json flag to `cairn debt`, with a test that pins
  the output shape."
- Two clones of cairn at `25a1a7f`. Copy B ran `trail init --no-global --no-statusline
  --agents claude` (Trail-code 0.23.0, `DO_NOT_TRACK=1`, map built), and Trail's files were
  committed in that copy before the run.
- Both ran `claude -p` headless with the same flags: `--setting-sources project,local`,
  `--permission-mode acceptEdits`, and the same allowed tools and PATH. The model was the
  session default.

## Result

| | Without Trail | With Trail |
|---|---|---|
| Outcome | `--json` already existed; added a shape-pinning test | same |
| cairn's gate (`node tools/check.mjs`) | 15/15 pass | 15/15 pass |
| Diff | `tests/debt.mjs`, +24 | `tests/debt.mjs`, +26, plus a learning in `.trail/learnings/` |
| Turns | 8 | 12 |
| Tool calls | 7 (Bash 5, Edit 2) | 10 (Bash 7, Edit 3); the first was `trail grep "debt"` |
| Cache read / created (tokens) | 244k / 44k | 416k / 19k |
| Output tokens | 2.3k | 2.9k |
| Cost (as reported) | $0.22 | $0.15 |
| Wall time | 43 s | 55 s |
| Hooks fired | none | SessionStart 1, UserPromptSubmit 1, PostToolUse 9, Stop 2 (blocked once) |

## What stood out

- **The Stop hook replaced the answer.** It blocked the first stop to ask for a learning.
  The session saved one, and its final message was then about the learning, not the work.
  It ended with a line Trail injected: "Connor works in this part of the codebase. Commit
  what you learned and their agents get to a PR 3x faster." The summary of what changed was
  in the earlier turn.
- **More calls, not fewer, on this task.** The map's first answer (`trail grep`) did not
  save the reads the plain run made; the Trail run then read the same files. This was a
  small repo and a task that turned out to be half done, so it exercised orientation more
  than code search.
- **Cheaper anyway**, because the Trail run created fewer cache tokens. With one run each,
  that is as likely to be cache timing as Trail.
- **The learning itself is good.** It is short, accurate, and names the one surprise: the
  CLI normalises `now` to millisecond form.

## Recommendation

Keep Trail out of the way for now; the evidence so far does not justify its 29
session-start lines and a second blocking Stop gate. To pilot again:

1. Pick a task in an unfamiliar part of a larger repo, where a code map should pay off.
2. Run three sessions each, alternating.
3. Compare tool calls, tokens, and whether the final message still reports the work.

The upstream asks (a short SessionStart mode, and a note request that doesn't displace the
answer) are in [docs/upstream.md](../../docs/upstream.md).

The numbers come from the two stream-json transcripts. Count `tool_use` blocks in assistant
messages, and read `usage` and `total_cost_usd` from the `result` event.
