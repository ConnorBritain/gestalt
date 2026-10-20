// The eval stub must never spend: it plans. A fake `claude` on PATH records any call, so a
// regression that starts spawning models fails here instead of on someone's bill.
import assert from "node:assert/strict";
import { chmodSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check, finish, group, run, tempDir, FIXTURES } from "./harness.mjs";
import { readWay } from "../tools/lib/way.mjs";
import { evalPlan } from "../tools/lib/eval-plan.mjs";

const full = join(FIXTURES, "ways", "full.way.yaml");
const bin = tempDir();
const marker = join(bin, "claude-was-called");
writeFileSync(join(bin, "claude"), `#!/bin/sh\ntouch "${marker}"\nexit 99\n`);
chmodSync(join(bin, "claude"), 0o755);
const env = { PATH: `${bin}:${process.env.PATH}` };

group("eval");
check("--plan prints the matrix and never calls claude", "planning must cost nothing", () => {
  const r = run(["eval", "--plan", "--way", full], { env });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /lead-loaded/);
  assert.match(r.stdout, /not run/);
  assert.ok(!existsSync(marker), "claude was invoked");
});
check("--spend refuses with exit 2", "a run needs an authorised budget, not a flag", () => {
  const r = run(["eval", "--spend", "--way", full], { env });
  assert.equal(r.status, 2);
  assert.ok(!existsSync(marker));
});
check("the matrix is taste × conditions, with the topology condition only when there are workers", "the lead/worker claim is only tested where a way makes it", () => {
  const { way, catalog } = readWay(full);
  const plan = evalPlan(way, catalog, { runs: 3 });
  assert.equal(plan.cells.length, 3 * 4);
  assert.equal(plan.total_runs, 36);
  way.topology.workers = [];
  assert.equal(evalPlan(way, catalog).cells.length, 3 * 3);
});
check("the estimate is labelled an assumption", "a made-up number must say it is made up", () => {
  const { way, catalog } = readWay(full);
  assert.match(evalPlan(way, catalog).estimate_basis, /assumption, not a measurement/);
});

finish();
