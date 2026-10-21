# Interview: Morgan, engineering manager

Simulated for the example. Answers are in Morgan's words.

**Survey, read back.** Claude Code and Codex. Eleven plugins enabled at user scope
(≈6,800 always-on tokens), two of them code reviewers that overlap, a Jira and Confluence
connector, Outlook. Two Stop hooks from different plugins.

## 1. Who and what for

- "I run three teams across four services. I review designs, unblock, and write the weekly
  update. I still ship small fixes."
- Goals:
  1. "Every design doc gets challenged before we build, not after."
  2. "Know which of my calls were right a quarter later."
  3. "The weekly update writes itself from Jira."
- A bad day: "An agent builds the RFC as written when the RFC was the wrong idea."

## 2. Where you work

- Claude Code locally, Codex in the cloud for the teams' background tasks.

## 3. Data and tools

- Jira (source of truth for work), Confluence (designs), GitHub, Outlook.
- Credentials are SSO through the connectors; no keys in files.

## 4. Kinds of work

- Service repos (each has a `Makefile`), and the design-docs repo (`RFC.md` at the root).

## 5. Cadence

- "Monday planning, Friday update, end-of-quarter calibration."

## 6. Pains

- "Two reviewers saying the same thing in different words."
- "I forget what I decided and why."
