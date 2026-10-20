#!/usr/bin/env node
// gestalt CLI. Thin: parse arguments, call tools/lib, print. Exit 0 ok, 1 findings or
// failure, 2 usage. Skills call this by relative path (PLUGIN/tools/cli.mjs).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultWayPath, readWay } from "./lib/way.mjs";
import { formatProblems, lintWay } from "./lib/lint.mjs";

const USAGE = `gestalt — decide what your harness runs, and in what order.

  gestalt survey   [--home DIR] [--repo DIR]... [--plugin DIR]... [--usage DAYS] [--json] [--out DIR]
  gestalt lint     [--way FILE] [--survey FILE] [--json]
  gestalt compile  [--way FILE] [--survey FILE] [--out DIR] [--check]
  gestalt write    --block FILE [--context NAME] | --agents DIR [--harness claude|codex]  [--from DIR] [--yes]
  gestalt eval     --plan [--way FILE]
  gestalt help

The way defaults to $GESTALT_HOME/way.yaml (~/.gestalt/way.yaml).`;

export function parseArgs(argv, spec) {
  const out = { _: [] };
  for (const [k, v] of Object.entries(spec)) if (v === "list") out[k] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const key = a.slice(2);
    const kind = spec[key];
    if (!kind) throw new UsageError(`unknown option ${a}`);
    if (kind === "flag") { out[key] = true; continue; }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new UsageError(`${a} needs a value`);
    i += 1;
    if (kind === "list") out[key].push(value);
    else out[key] = value;
  }
  return out;
}

class UsageError extends Error {}

function loadSurvey(path) {
  if (!path) return null;
  if (!existsSync(path)) throw new UsageError(`no survey at ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case undefined:
    case "help":
    case "--help":
      console.log(USAGE);
      return 0;
    case "lint": {
      const a = parseArgs(rest, { way: "value", survey: "value", json: "flag" });
      const wayPath = resolve(a.way ?? defaultWayPath());
      const { way, catalog, problems } = readWay(wayPath);
      const result = lintWay(way, catalog, { survey: loadSurvey(a.survey), problems });
      if (a.json) console.log(JSON.stringify(result, null, 2));
      else console.log(formatProblems(result));
      return result.ok ? 0 : 1;
    }
    case "survey": {
      const { runSurvey } = await import("./lib/survey-cli.mjs");
      return runSurvey(rest, { parseArgs });
    }
    case "compile": {
      const { runCompile } = await import("./lib/compile.mjs");
      return runCompile(rest, { parseArgs, loadSurvey });
    }
    case "write": {
      const { runWrite } = await import("./lib/write.mjs");
      return runWrite(rest, { parseArgs });
    }
    case "eval": {
      const { runEval } = await import("./lib/eval-plan.mjs");
      return runEval(rest, { parseArgs });
    }
    default:
      throw new UsageError(`unknown command "${command}"`);
  }
}

main(process.argv.slice(2)).then(code => process.exit(code ?? 0), e => {
  if (e instanceof UsageError || e?.name === "UsageError") {
    console.error(`gestalt: ${e.message}\n\n${USAGE}`);
    process.exit(2);
  }
  console.error(`gestalt: ${e.message}`);
  process.exit(1);
});
