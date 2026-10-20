// The examples are documentation that must stay true: each way lints without errors and
// its committed out/ is exactly what compile produces today. A change to the compiler that
// alters an example shows up here as a diff to review, not a surprise in someone's harness.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { check, finish, group, ROOT } from "./harness.mjs";
import { readWay } from "../tools/lib/way.mjs";
import { checkBuild, compileWay, writeBuild } from "../tools/lib/compile.mjs";

const examples = [];
const root = join(ROOT, "examples");
if (existsSync(join(root, "connor", "way.yaml"))) examples.push(join(root, "connor"));
if (existsSync(join(root, "personas"))) for (const d of readdirSync(join(root, "personas")).sort()) if (existsSync(join(root, "personas", d, "way.yaml"))) examples.push(join(root, "personas", d));

group("examples");
for (const dir of examples) {
  const name = dir.slice(root.length + 1);
  check(`${name}: lints without errors and out/ matches compile`, "examples are the documentation people copy; they must compile to what is committed", () => {
    const { way, catalog, problems } = readWay(join(dir, "way.yaml"));
    const surveyPath = join(dir, "survey", "survey.json");
    const survey = existsSync(surveyPath) ? JSON.parse(readFileSync(surveyPath, "utf8")) : null;
    const result = compileWay(way, catalog, { survey, problems, wayText: readFileSync(join(dir, "way.yaml"), "utf8") });
    assert.ok(result.ok, result.lint.problems.filter(p => p.severity === "error").map(p => `${p.code} ${p.where}: ${p.message}`).join("\n"));
    if (process.env.GESTALT_UPDATE_EXAMPLES) writeBuild(join(dir, "out"), result.files);
    assert.deepEqual(checkBuild(join(dir, "out"), result.files), [], `recompile: node tools/cli.mjs compile --way ${name}/way.yaml${survey ? ` --survey ${name}/survey/survey.json` : ""} --out ${name}/out`);
  });
}
check("there is at least the author's example", "the worked example is the main documentation", () => assert.ok(examples.length >= 1));

finish();
