// Always-on context cost. An estimate, labelled as one everywhere it is printed: about four
// characters per token for English prose and code, which is close enough to rank plugins
// against each other and against a budget, and never presented as a tokenizer count.
import { parseYaml } from "./yaml.mjs";

export const TOKEN_METHOD = "estimate: ceil(chars / 4)";

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(String(text).length / 4);
}

/** Split `---` frontmatter from a markdown file. Returns { data, body, raw } (data {} if none). */
export function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(String(text ?? ""));
  if (!m) return { data: {}, body: String(text ?? ""), raw: "" };
  let data = {};
  try {
    const parsed = parseYaml(m[1]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed;
  } catch {
    // Frontmatter that is not valid YAML (common in the wild): fall back to `key: value` lines.
    for (const line of m[1].split(/\r?\n/)) {
      const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
      if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
    }
  }
  return { data, body: m[2], raw: m[1] };
}

/**
 * What a skill, agent or command costs every turn when it is merely installed: the harness
 * lists its name and description for routing. The body costs nothing until it is invoked.
 */
export function listingCost(name, description) {
  return estimateTokens(`${name ?? ""}: ${description ?? ""}`);
}
