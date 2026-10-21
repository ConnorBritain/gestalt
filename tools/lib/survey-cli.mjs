// `gestalt survey`: arguments → survey() → survey.json / SURVEY.md.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { renderSurvey, survey } from "./survey.mjs";

export function now(env = process.env) {
  return env.GESTALT_NOW ? new Date(env.GESTALT_NOW) : new Date();
}

export function runSurvey(argv, { parseArgs }) {
  const a = parseArgs(argv, { home: "value", repo: "list", plugin: "list", usage: "value", json: "flag", out: "value" });
  const home = resolve(a.home ?? process.env.GESTALT_SURVEY_HOME ?? homedir());
  const repos = a.repo.length ? a.repo : existsSync(join(process.cwd(), ".git")) ? [process.cwd()] : [];
  const usageDays = a.usage ? Number.parseInt(a.usage, 10) : 0;
  if (a.usage && !(usageDays > 0)) throw Object.assign(new Error("--usage takes a number of days"), { name: "UsageError" });
  const result = survey({ home, repos, plugins: a.plugin, usageDays, now: now() });
  if (a.out) {
    const out = resolve(a.out);
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "survey.json"), `${JSON.stringify(result, null, 2)}\n`);
    writeFileSync(join(out, "SURVEY.md"), renderSurvey(result));
    console.log(`wrote ${join(out, "survey.json")} and SURVEY.md (≈${result.totals.always_on_tokens} always-on tokens, ${result.collisions.length} collisions)`);
  } else if (a.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    process.stdout.write(renderSurvey(result));
  }
  return 0;
}
