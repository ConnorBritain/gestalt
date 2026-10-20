<!-- gestalt:begin way.plugin -->
### In plugin repos   <!-- gestalt -->
- Before building from a plan: elonify plan-review.
- Before calling non-trivial work done: verification-gate gates (hook) → elonify diff-review (hook) ∥ verification-gate critics.
- When several Stop hooks fire together, answer them in this order: verification-gate gates, then elonify diff-review, then compounder stop-lines, then platform git-check.
- On elonify diff-review REFRAME: once the user has decided, offer /cairn to log it as a choice.
- Route reviewing a plan, a finished diff or a draft → the elonify / verification-gate critics, each as its own agent in fresh context.
<!-- gestalt:end way.plugin -->
