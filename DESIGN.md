# Design

Gestalt decides what a harness runs and in what order. These principles override any
roadmap item; lint encodes the ones a script can check.

## 1. Stages

Every step sits on one chain:

```
orient → intend → plan → make → check → record          (in session)
                                                  reflect (daily / weekly / monthly)
```

- **orient**: what is true right now (debt, focus, the ready wave). Ambient and short.
- **intend**: is this the right work (focus guards, slicing).
- **plan**: shape it before building (outlines, plan review).
- **make**: the one generator for the job.
- **check**: deterministic gates first, then clean-context reviewers in parallel.
- **record**: what happened, for later (journals, ledgers, receipts).
- **reflect**: the slow loop where findings change the way itself.

The set is fixed so that two people's ways can be compared and so that lint has something
to check against.

## 2. Direction

Control moves forward. A checker never invokes a generator; a recorder never blocks.
Findings do flow back, but as data handed to the session or the person, who starts a new
forward pass. The only backward edges are to `reflect` and to `user` (a REFRAME is a
question for the person, not a loop for the model). Iteration is repeated forward passes,
never a cycle inside one.

This is the claim that the direction of movement through the action graph decides how
elegant a harness is, made checkable: `GST-INVOKE`, `GST-LINK`, `GST-RECORDER-BLOCKS`.

## 3. One generator per slot, many checkers

Two generators for one job (two frontend builders, two drafting voices) argue through the
person. kitctl enforces single-provider slots; Gestalt reports them per context (`GST-SLOT`).
Checkers stack freely because they only report.

## 4. The weakest invocation that works

From vonnegut's wiring guide: `ambient` (a hook fires it) < `dispatcher` (its description
routes it) < `explicit` (someone names it) < `protocol` (an instruction-file rule requires
it). Every step up costs context on every turn. Protocol mode is for reviewers, the steps a
model has an incentive to skip (`GST-PROTOCOL`). A hook that enforces a protocol rule is a
separate field (`enforce: hook`) and costs a gate slot.

## 5. Gates

At most one *unordered*, user-owned blocking gate per event per context. Claude Code runs
matching hooks together, so Gestalt cannot sequence the hooks themselves. It sequences the
model's *response* instead: `stop_order` becomes one line in the block ("when several Stop
hooks fire together, answer the tests first, then the critics, then the focus lines"), and
`GST-GATE` fires when two blockers share an event with no order. Platform gates (a cloud
environment's git check) are counted and reported, not owned.

## 6. Lean lead, focused workers

The lead runs on the strongest model with the smallest always-on load: the block, a routing
index (one line per worker), and the gates that must live in its own context. Work that
needs a heavy plugin or a connection goes to a worker with exactly that loaded, on the tier
it needs, in clean context, and comes back as a short result.

What each mechanism can actually isolate depends on the harness (see
[docs/way-schema.md](docs/way-schema.md#topology)); lint refuses claims the mechanism cannot
deliver (`GST-WORKER`). Scope by context first, delegate second: a plugin needed in one kind
of repo is cheaper disabled elsewhere than delegated everywhere.

Every hand-off carries the person's original request verbatim and the decisions made since.

## 7. Budgets

A way states its budgets (block tokens, protocol rules, blocking gates, session-start
lines, always-on tokens, skills per context) and lint holds it to them. The research below
is why these exist; the eval in [docs/eval.md](docs/eval.md) is how a person checks whether
their own numbers are right.

## 8. Gestalt practises what it preaches

Three skills. No hooks, no agents, no runtime. Nothing it compiles needs it to stay loaded,
so it can be disabled after setup and its survey row reads zero.

## 9. Honest enforcement

Every catalog entry labels each harness `enforced`, `partial`, `advisory` or `none`
(vonnegut's portability scale). WAY.md prints the label beside every gate. A rule that a
harness cannot enforce is still worth writing down, as long as nobody thinks it is enforced.

## 10. kitctl writes; Gestalt sequences

kitctl owns native config: enabling, disabling, pinning, ledger, eject. Gestalt emits
loadouts for it and writes only its own marked block and its own generated files. Without
kitctl, the rest becomes a checklist in SETUP.md. One writer per file, always.

## Research

Why the budgets exist. **These are paraphrases, not quotations.** The session that wrote
them could not reach arxiv.org or vercel.com (the network policy blocked both), and
search-engine summaries are not a primary source. So no figure from these studies appears
here. Open each link and quote the source itself before citing a number.

- **More tools, worse selection.** Gan and Sun, *RAG-MCP: Mitigating Prompt Bloat in LLM
  Tool Selection via Retrieval-Augmented Generation* (2025),
  <https://arxiv.org/abs/2505.03275>. As tool catalogs grow, the model picks the right tool
  less often. Retrieving only the relevant tools cuts prompt tokens and raises selection
  accuracy substantially. This is the case for scoping by context and for workers that
  hold connections the lead does not need.
- **Skills the model must remember to call often go uncalled.** Vercel, *AGENTS.md
  outperforms skills in our agent evals* (2026),
  <https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals>. In their
  Next.js evals, a compressed docs index kept in AGENTS.md outperformed skills. The skills
  frequently went uninvoked, and helped only when the agent was told to use them. This is
  the case for the routing index in the block and for the `indexed` eval condition, which
  tests it for each person instead of assuming it.
- **Curated, focused skills help; self-written and sprawling ones do not.** Li et al.,
  *SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks* (2026),
  <https://arxiv.org/abs/2602.12670>. Curated skills raised average pass rates, by very
  different amounts per domain, and some tasks got worse. Skills the model wrote for itself
  gave no average benefit. Focused skills beat comprehensive ones. This is the case for
  trim, for one generator per slot, and for Gestalt shipping three skills.
- **Instruction files can hurt.** Gloaguen, Mündler, Müller, Raychev and Vechev, *Evaluating
  AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?* (2026),
  <https://arxiv.org/abs/2602.11988>. Context files did not reliably improve task success
  and raised inference cost. Unnecessary requirements made tasks harder, and the authors
  advise that human-written files should state only minimal requirements. The abstract's
  wording reportedly differs between versions; check the version you cite. This is the
  case for the block's token budget, the skip clause, and never restating a tool's own
  snippet.
- **Position matters in long contexts.** Liu et al., *Lost in the Middle: How Language Models
  Use Long Contexts* (2023), <https://arxiv.org/abs/2307.03172>. Models use information best
  near the start or end of a long context. This is a reason to keep always-on text short,
  rather than trust that a long CLAUDE.md is read evenly.

None of these studies measured this person's harness. The eval in
[docs/eval.md](docs/eval.md) does, on their own taste prompts.
