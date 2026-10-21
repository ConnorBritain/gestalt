# Four people, from a blank slate

Each folder holds the interview as given (`interview.md`), the way Gestalt composed from it
(`way.yaml`), and what it compiled (`out/`). They double as golden tests: `node
tools/check.mjs` recompiles each one and fails on any difference.

| Person | Starts with | The way, in one line | Lead always-on (≈ tokens) |
|---|---|---|---|
| [Sam, bid analyst in Cowork](analyst-cowork/) | Org-synced plugins with 22 skills, one of which shouts "ALWAYS USE"; the admin plans about twenty | **Mostly trimming.** Each org plugin is on only in the folders that need it, the brand plugin is explicit-only, Confluence is held by a subagent, and a critic checks citations. None of the author's tools. | 0 / 326 / 243 (everywhere / RFP / pricing) |
| [Jordan, solo SaaS developer](indie-saas/) | A fresh install, Cursor, a style-rules CLAUDE.md | **Two plugins.** A test gate before clean-context critics (verification-gate), a focus guard against Saturday side projects (compounder), and Linear held by a subagent | 732 / 918 (everywhere / app) |
| [Ade, newsletter writer](writer/) | Three marketplace writing plugins, two of which claim "writing" | **One voice generator.** humanizer, then a draft in Ade's voice, then a deterministic tell-scan, then the prose critics; research in a headless worker; cairn calibrates headline guesses against open rates | 2622 / 2757 (everywhere / book) |
| [Morgan, engineering manager](eng-manager/) | Eleven plugins at user scope, two overlapping reviewers, Jira, Confluence, Outlook | **Challenge before building.** elonify reviews every RFC and hands a REFRAME back to Morgan; in service repos, gates run before parallel critics; decisions are logged for quarterly calibration; a worker drafts the weekly update from Jira | 1089 / 1533 / 1347 (everywhere / service / RFC) |

What the four have in common, and what they don't:

- **Scope by context before delegating.** Every way switches primitives on only where their
  marker file is. That does more for the lead's load than any worker.
- **Workers take what is heavy or connected.** Research, Jira and Outlook, Confluence and
  Linear go to workers. Drafting in someone's own voice stays in the lead, on the strongest
  model, because the voice is the product.
- **Gates are ordered, or there is only one.** Jordan has two Stop gates and a `stop_order`.
  Morgan runs elonify as a rule without its Stop hook, so there is one gate and nothing to
  order.
- **Honest warnings stay visible.** Ade's book folder is one skill over budget; Morgan has
  no Codex models mapped yet and every gate is advisory on Codex. WAY.md prints each one.
- **Way-local catalog entries** describe tools Gestalt has never seen (Sam's org plugins,
  Morgan's own update skill) and are marked `confidence: guess` until someone checks them.
