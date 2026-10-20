// A minimal TOML reader for the parts of Codex config the survey needs: table headers
// ([a.b], [a."quoted.key"], [[array.tables]]) and `key = value` lines whose values are
// strings, booleans, numbers or single-line arrays. Anything else (inline tables, multi-line
// arrays, dates) is kept as raw text, which the survey never prints. Not a general parser:
// the survey reads names and booleans, never values that could hold a secret.

function splitKey(text) {
  const parts = [];
  let i = 0;
  const s = text.trim();
  while (i < s.length) {
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i];
      let j = i + 1;
      let out = "";
      while (j < s.length && s[j] !== q) { if (q === '"' && s[j] === "\\") { out += s[j + 1]; j += 2; continue; } out += s[j]; j += 1; }
      parts.push(out);
      i = j + 1;
    } else {
      let j = i;
      while (j < s.length && s[j] !== ".") j += 1;
      parts.push(s.slice(i, j).trim());
      i = j;
    }
    while (i < s.length && (s[i] === "." || s[i] === " ")) i += 1;
  }
  return parts.filter(p => p !== "");
}

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (q) { if (q === '"' && c === "\\") { i += 1; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === "#") return line.slice(0, i);
  }
  return line;
}

function parseValue(raw) {
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^"(?:[^"\\]|\\.)*"$/.test(v)) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
  if (/^'[^']*'$/.test(v)) return v.slice(1, -1);
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    const items = [];
    let depth = 0, q = null, start = 0;
    for (let i = 0; i < inner.length; i += 1) {
      const c = inner[i];
      if (q) { if (q === '"' && c === "\\") { i += 1; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if (c === "[" || c === "{") depth += 1;
      else if (c === "]" || c === "}") depth -= 1;
      else if (c === "," && depth === 0) { items.push(inner.slice(start, i)); start = i + 1; }
    }
    items.push(inner.slice(start));
    return items.map(x => x.trim()).filter(Boolean).map(parseValue);
  }
  return { raw: v };
}

function ensure(obj, path, arrayTable) {
  let node = obj;
  for (let i = 0; i < path.length; i += 1) {
    const k = path[i];
    const last = i === path.length - 1;
    if (last && arrayTable) {
      if (!Array.isArray(node[k])) node[k] = [];
      const fresh = {};
      node[k].push(fresh);
      return fresh;
    }
    if (Array.isArray(node[k])) node = node[k][node[k].length - 1];
    else { if (typeof node[k] !== "object" || node[k] === null) node[k] = {}; node = node[k]; }
  }
  return node;
}

/** Parse TOML text into nested objects. Lines it cannot read are skipped, never thrown. */
export function scanToml(text) {
  const root = {};
  let table = root;
  let skipping = false;
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = stripComment(rawLine).trim();
    if (!line) continue;
    const header = /^\[\[(.+)\]\]$/.exec(line) ?? /^\[(.+)\]$/.exec(line);
    if (header) {
      const path = splitKey(header[1]);
      // hooks.state holds trust approvals: never read it (kitctl's rule).
      skipping = path[0] === "hooks" && path[1] === "state";
      table = skipping ? {} : ensure(root, path, line.startsWith("[["));
      continue;
    }
    if (skipping) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const keyPath = splitKey(line.slice(0, eq));
    if (!keyPath.length) continue;
    const target = keyPath.length > 1 ? ensure(table, keyPath.slice(0, -1), false) : table;
    target[keyPath[keyPath.length - 1]] = parseValue(line.slice(eq + 1));
  }
  return root;
}
