// A small YAML emitter for the documents Gestalt writes (kitctl loadouts, kit.yaml, the way).
// Block style for maps and sequences; short scalar lists go in flow style. A scalar is
// written plain only when the reader (yaml.mjs) reads it back as the same string AND it is
// not a YAML 1.1 boolean, because kitctl reads with ruamel and older readers treat `on` and
// `yes` as true. Anything else is double-quoted with JSON escapes, which YAML accepts.
import { parseYaml } from "./yaml.mjs";

const YAML11_BOOL = /^(y|Y|yes|Yes|YES|n|N|no|No|NO|on|On|ON|off|Off|OFF)$/;
const FLOW_WIDTH = 96;

function plainOk(s, flow) {
  if (s === "" || s !== s.trim() || YAML11_BOOL.test(s) || /[\n\t]/.test(s)) return false;
  if (flow && /[,\[\]{}]/.test(s)) return false;
  // Plain only if it reads back identically as a map value AND as a block list item
  // (`- a: b` is a map, `- - x` a list), and in a flow list when it is going into one.
  try {
    const asValue = parseYaml(`k: ${s}\n`)?.k;
    const asItem = parseYaml(`k:\n  - ${s}\n`)?.k;
    if (asValue !== s || !Array.isArray(asItem) || asItem.length !== 1 || asItem[0] !== s) return false;
    if (!flow) return true;
    const inFlow = parseYaml(`k: [${s}]\n`)?.k;
    return Array.isArray(inFlow) && inFlow.length === 1 && inFlow[0] === s;
  } catch {
    return false;
  }
}

export function scalar(value, flow = false) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`cannot emit number ${value}`);
    return String(value);
  }
  const s = String(value);
  return plainOk(s, flow) ? s : JSON.stringify(s);
}

const isPlainObject = v => v !== null && typeof v === "object" && !Array.isArray(v);
const isScalar = v => v === null || ["string", "number", "boolean"].includes(typeof v);

function key(k) {
  return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(k) && !YAML11_BOOL.test(k) ? k : JSON.stringify(k);
}

function flowList(list) {
  return `[${list.map(v => scalar(v, true)).join(", ")}]`;
}

function emitValue(value, indent, lines, prefix) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) { lines.push(`${prefix} []`); return; }
    if (value.every(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
      const flow = flowList(value);
      if (prefix.length + flow.length + 1 <= FLOW_WIDTH) { lines.push(`${prefix} ${flow}`); return; }
    }
    lines.push(prefix);
    for (const item of value) emitItem(item, indent + 2, lines);
    return;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) { lines.push(`${prefix} {}`); return; }
    lines.push(prefix);
    emitMap(value, indent + 2, lines);
    return;
  }
  if (typeof value === "string" && value.includes("\n")) {
    const chomp = value.endsWith("\n") ? (value.endsWith("\n\n") ? "+" : "") : "-";
    const body = value.endsWith("\n") ? value.slice(0, -1) : value;
    if (/^\s/.test(body) || body.split("\n").some(l => /\s$/.test(l))) {
      lines.push(`${prefix} ${JSON.stringify(value)}`);
      return;
    }
    lines.push(`${prefix} |${chomp}`);
    for (const line of (chomp === "+" ? value.replace(/\n$/, "") : body).split("\n")) {
      lines.push(line === "" ? "" : `${pad}  ${line}`);
    }
    return;
  }
  lines.push(`${prefix} ${scalar(value)}`);
}

function emitItem(item, indent, lines) {
  const pad = " ".repeat(indent);
  if (isPlainObject(item) && Object.keys(item).length) {
    const sub = [];
    emitMap(item, indent + 2, sub);
    sub[0] = `${pad}- ${sub[0].slice(indent + 2)}`;
    lines.push(...sub);
    return;
  }
  if (Array.isArray(item) && item.length) {
    lines.push(`${pad}-`);
    for (const inner of item) emitItem(inner, indent + 2, lines);
    return;
  }
  emitValue(item, indent, lines, `${pad}-`);
}

function emitMap(map, indent, lines) {
  const pad = " ".repeat(indent);
  for (const [k, v] of Object.entries(map)) {
    if (v === undefined) continue;
    emitValue(v, indent, lines, `${pad}${key(k)}:`);
  }
}

/** Emit a top-level map as YAML text ending in a newline. Optional header comment lines. */
export function emitYaml(doc, { header = [] } = {}) {
  if (!isPlainObject(doc)) throw new Error("emitYaml expects a map at the top level");
  const lines = header.map(h => (h ? `# ${h}` : "#"));
  emitMap(doc, 0, lines);
  return `${lines.join("\n")}\n`;
}

export { isScalar };
