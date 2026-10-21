# Research rubric for a gap

When a goal has no tool, offer at most three candidates. Score each 0–2 on every line and
show the table; recommend the highest, and say what would change the recommendation.

| Criterion | 0 | 1 | 2 |
|---|---|---|---|
| Fits the goal | tangential | partly | squarely |
| Maintained | no commits in a year | sporadic | active, tagged releases |
| Licence | none or unclear | restrictive | MIT / Apache-2.0 |
| Harness coverage | one harness, not theirs | theirs, partial | all of theirs |
| Always-on cost | > 1500 tokens listed | 500–1500 | < 500 |
| Triggers | shouts (MANDATORY, ALWAYS) | broad | precise, names its sibling |
| Overlap | duplicates a slot they fill | partial | none |
| Evidence | none | anecdotes | evals or measured results |
| Side effects | telemetry, self-updates, network | some, documented | none |

With kitctl installed, run `kitctl scout <repo>` for licence, telemetry, network and
trigger facts with file:line evidence, and prefer those facts over the README. Never
install a candidate during research; adding it is a change to the way, made after the
person agrees.
