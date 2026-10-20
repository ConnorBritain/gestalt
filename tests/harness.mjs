// Zero-dependency test harness (the cairn pattern). Every check names why it matters:
// a compiler that drifts or a survey that leaks a secret looks identical to one that works.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CLI = join(ROOT, "tools", "cli.mjs");
export const FIXTURES = join(ROOT, "tests", "fixtures");

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];
const temps = [];

export function group(title) { process.stdout.write(`\n${title}\n`); }

export function check(name, why, fn) {
  try {
    const result = fn();
    if (result === false) throw new Error("returned false");
    passed += 1;
    process.stdout.write(`  ok   ${name}\n`);
  } catch (e) {
    failed += 1;
    failures.push(`${name} — ${why} — ${e.message}`);
    process.stdout.write(`  FAIL ${name}\n       why: ${why}\n       ${e.message}\n`);
  }
}

/** A check that cannot run here. Counted and printed; GESTALT_STRICT=1 turns every skip into a failure. */
export function skip(name, why) {
  if (process.env.GESTALT_STRICT) { failed += 1; failures.push(`${name} — skipped under GESTALT_STRICT: ${why}`); process.stdout.write(`  FAIL ${name}\n       skipped under GESTALT_STRICT: ${why}\n`); return; }
  skipped += 1;
  process.stdout.write(`  skip ${name}: ${why}\n`);
}

export function tempDir(prefix = "gestalt-test-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

/** Run the CLI. Returns { status, stdout, stderr, json }. */
export function run(args, { home, cwd, now = "2026-10-20T12:00:00Z", env = {} } = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    cwd: cwd ?? ROOT,
    env: { ...process.env, GESTALT_HOME: home ?? join(tmpdir(), "gestalt-no-home"), GESTALT_NOW: now, ...env },
  });
  let json = null;
  if (args.includes("--json")) { try { json = JSON.parse(r.stdout); } catch { json = null; } }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

export function finish() {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
  process.stdout.write(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped (GESTALT_STRICT=1 to require them)` : ""}\n`);
  if (failed) { for (const f of failures) process.stdout.write(`  - ${f}\n`); process.exit(1); }
}
