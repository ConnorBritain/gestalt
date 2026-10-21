// Survey: a read-only inventory of what a person's harnesses load, what that costs in
// always-on context, and where the pieces collide. It never runs a hook, an MCP server or a
// plugin script (some SessionStart hooks write state), and it never serializes a value that
// could hold a secret: only names, counts, booleans and paths relative to a root.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { CATALOG_DIR, loadCatalog } from "./catalog.mjs";
import { estimateTokens, frontmatter, listingCost, TOKEN_METHOD } from "./tokens.mjs";
import { scanToml } from "./toml-scan.mjs";

export const SURVEY_SCHEMA = "gestalt-survey/1";

/**
 * Descriptions that try to win every turn. A heuristic, reported as one: shouting is
 * case-sensitive (MANDATORY, MUST USE), the phrasings are not.
 */
const SHOUT_RE = /\b(MANDATORY|MUST (?:ALWAYS )?(?:USE|RUN|INVOKE|CALL)|ALWAYS (?:USE|RUN|INVOKE|CALL)|IMPORTANT: (?:USE|RUN|INVOKE|CALL))\b/;
const GRAB_RE = /\b(use (?:this|me) (?:for|on) (?:any|every|all)\b|use proactively|without being asked|execute first|before (?:any|every) (?:other )?(?:task|response|action))/i;
export const triggerIn = text => (SHOUT_RE.exec(text) ?? GRAB_RE.exec(text))?.[0] ?? null;

const CAN_BLOCK = new Set(["Stop", "SubagentStop", "UserPromptSubmit", "PreToolUse"]);

// ---------------------------------------------------------------- file helpers

function isPlainFile(path) {
  try { const s = lstatSync(path); return s.isFile(); } catch { return false; }
}
function isPlainDir(path) {
  try { const s = lstatSync(path); return s.isDirectory(); } catch { return false; }
}
function readText(path) {
  return isPlainFile(path) ? readFileSync(path, "utf8") : null;
}
function readJson(path) {
  const t = readText(path);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return { __invalid: true }; }
}
function list(dir) {
  if (!isPlainDir(dir)) return [];
  try { return readdirSync(dir).sort(); } catch { return []; }
}
const names = obj => (obj && typeof obj === "object" && !Array.isArray(obj) ? Object.keys(obj).sort() : []);

class Paths {
  constructor(home, repos) { this.home = home; this.repos = repos; }
  show(path) {
    const abs = resolve(path);
    for (const [i, r] of this.repos.entries()) {
      if (abs === r || abs.startsWith(`${r}/`)) return `<repo${this.repos.length > 1 ? i + 1 : ""}>/${relative(r, abs)}`.replace(/\/$/, "");
    }
    if (abs === this.home || abs.startsWith(`${this.home}/`)) return `~/${relative(this.home, abs)}`.replace(/\/$/, "");
    return abs;
  }
}

// ---------------------------------------------------------------- units

function markdownUnit(path, fallbackName, kind, scope, paths) {
  const text = readText(path);
  if (text == null) return null;
  const { data } = frontmatter(text);
  const name = typeof data.name === "string" ? data.name : fallbackName;
  const description = typeof data.description === "string" ? data.description : "";
  const unit = { kind, name, scope, path: paths.show(path), listing_tokens: listingCost(name, description) };
  if (data["disable-model-invocation"] === true) { unit.listing_tokens = 0; unit.hidden = true; }
  const trig = triggerIn(description);
  if (trig) unit.trigger = trig;
  if (kind === "agent" && typeof data.model === "string") unit.model = data.model;
  return unit;
}

function scanSkillDir(dir, scope, paths, depth = 0) {
  const out = [];
  for (const name of list(dir)) {
    const sub = join(dir, name);
    if (!isPlainDir(sub)) continue;
    const file = join(sub, "SKILL.md");
    if (isPlainFile(file)) { const u = markdownUnit(file, name, "skill", scope, paths); if (u) out.push(u); }
    else if (depth < 2) out.push(...scanSkillDir(sub, scope, paths, depth + 1));
  }
  return out;
}

function scanMdDir(dir, kind, scope, paths) {
  return list(dir).filter(f => f.endsWith(".md")).map(f => markdownUnit(join(dir, f), f.slice(0, -3), kind, scope, paths)).filter(Boolean);
}

function hookEntries(hooksObj, origin) {
  const out = [];
  for (const [event, groups] of Object.entries(hooksObj ?? {})) {
    for (const g of Array.isArray(groups) ? groups : []) {
      for (const h of Array.isArray(g?.hooks) ? g.hooks : []) {
        const cmd = [h.command, ...(Array.isArray(h.args) ? h.args : [])].filter(x => typeof x === "string").join(" ");
        // Only the script's file name is kept: arguments can hold tokens.
        const script = (cmd.match(/[\w.-]+\.(?:mjs|js|cjs|sh|py|ts)\b/) ?? [h.type === "prompt" ? "<prompt>" : "<command>"])[0];
        out.push({ event, matcher: typeof g.matcher === "string" && g.matcher ? g.matcher : null, script, origin });
      }
    }
  }
  return out;
}

/** Scan one plugin directory (installed copy, synced copy, or a checkout). */
export function scanPlugin(dir, { scope, paths, catalogByName }) {
  const manifest = readJson(join(dir, ".claude-plugin", "plugin.json")) ?? {};
  const name = typeof manifest.name === "string" ? manifest.name : basename(dir);
  const units = [];
  const skillDirs = new Set([join(dir, "skills")]);
  for (const s of [].concat(manifest.skills ?? [])) if (typeof s === "string") skillDirs.add(resolve(dir, s));
  for (const d of skillDirs) units.push(...scanSkillDir(d, scope, paths));
  const agentFiles = Array.isArray(manifest.agents) ? manifest.agents.map(a => resolve(dir, a)) : null;
  if (agentFiles) for (const f of agentFiles) { const u = markdownUnit(f, basename(f, ".md"), "agent", scope, paths); if (u) units.push(u); }
  else units.push(...scanMdDir(join(dir, typeof manifest.agents === "string" ? manifest.agents : "agents"), "agent", scope, paths));
  units.push(...scanMdDir(join(dir, "commands"), "command", scope, paths));
  const hooksFile = readJson(join(dir, "hooks", "hooks.json"));
  const hooks = hookEntries(hooksFile?.hooks ?? (typeof manifest.hooks === "object" ? manifest.hooks : null), `plugin:${name}`);
  const mcpFile = readJson(join(dir, ".mcp.json"));
  const mcpServers = names(mcpFile?.mcpServers ?? (typeof manifest.mcpServers === "object" ? manifest.mcpServers : null));
  const cat = catalogByName.get(name) ?? null;
  for (const h of hooks) {
    const known = cat?.hooks?.filter(x => x.event === h.event) ?? [];
    h.blocking = known.length ? known.some(x => x.blocking) : CAN_BLOCK.has(h.event) ? "unknown" : false;
    if (known.length && known.some(x => x.opt_in)) h.opt_in = known.find(x => x.opt_in).opt_in;
  }
  return {
    name,
    version: typeof manifest.version === "string" ? manifest.version : null,
    scope,
    path: paths.show(dir),
    catalog: cat?.id ?? null,
    // Listed skills only: one with disable-model-invocation runs by name and costs no listing.
    skills: units.filter(u => u.kind === "skill" && !u.hidden).length,
    hidden_skills: units.filter(u => u.kind === "skill" && u.hidden).length,
    agents: units.filter(u => u.kind === "agent").length,
    commands: units.filter(u => u.kind === "command").length,
    listing_tokens: units.reduce((n, u) => n + u.listing_tokens, 0),
    units,
    hooks,
    mcp_servers: mcpServers,
  };
}

// ---------------------------------------------------------------- instructions

function instructionFile(path, harness, scope, paths, seen = new Set()) {
  const text = readText(path);
  if (text == null || seen.has(resolve(path))) return [];
  seen.add(resolve(path));
  const out = [{ path: paths.show(path), harness, scope, tokens: estimateTokens(text), markers: markers(text) }];
  // Claude Code @imports, one level (enough to cost CLAUDE.md = @AGENTS.md correctly).
  for (const m of text.matchAll(/^@(\S+)\s*$/gm)) {
    const target = m[1].startsWith("~/") ? join(paths.home, m[1].slice(2)) : resolve(dirname(path), m[1]);
    for (const f of instructionFile(target, harness, scope, paths, seen)) out.push({ ...f, imported_by: paths.show(path) });
  }
  return out;
}

/** Managed blocks and wiring snippets: a marker counts only at a line start or on a heading. */
function markers(text) {
  const found = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^(?:<!--|#)/.test(line)) continue;
    for (const m of line.matchAll(/<!--\s*((?:kit|gestalt):(?:begin|end)\s+[\w./-]+|trail:(?:start|end)|elonify|vonnegut:\s*[\w-]+)\s*-->/g)) found.push(m[1].replace(/\s+/g, " "));
  }
  if (/^## Self-verification gate/m.test(text)) found.push("verification-gate");
  return found;
}

// ---------------------------------------------------------------- usage

/** Plugin usage counters Claude Code keeps in ~/.claude.json (names and counts only). */
function pluginUsage(home) {
  for (const f of [join(home, ".claude.json"), join(home, ".claude", ".claude.json")]) {
    const j = readJson(f);
    if (j && !j.__invalid && j.pluginUsage && typeof j.pluginUsage === "object") {
      const out = {};
      for (const [id, v] of Object.entries(j.pluginUsage)) if (typeof v?.usageCount === "number") out[id] = v.usageCount;
      return out;
    }
  }
  return null;
}

/** Transcript counts over the last N days: skills, subagents, MCP servers, slash commands. */
export function transcriptUsage(home, days, now) {
  const root = join(home, ".claude", "projects");
  const since = now.getTime() - days * 86400000;
  const counts = { skills: {}, agents: {}, mcp: {}, commands: {}, sessions: 0 };
  const bump = (map, k) => { if (k) map[k] = (map[k] ?? 0) + 1; };
  const walk = dir => {
    for (const name of list(dir)) {
      const p = join(dir, name);
      if (isPlainDir(p)) { walk(p); continue; }
      if (!name.endsWith(".jsonl") || !isPlainFile(p)) continue;
      if (statSync(p).mtimeMs < since) continue;
      counts.sessions += 1;
      for (const line of readFileSync(p, "utf8").split("\n")) {
        if (!line.trim()) continue;
        let ev;
        try { ev = JSON.parse(line); } catch { continue; }
        const content = ev?.message?.content;
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c?.type !== "tool_use") continue;
            if (c.name === "Skill") bump(counts.skills, typeof c.input?.skill === "string" ? c.input.skill : null);
            else if (c.name === "Task" || c.name === "Agent") bump(counts.agents, typeof c.input?.subagent_type === "string" ? c.input.subagent_type : null);
            else if (typeof c.name === "string" && c.name.startsWith("mcp__")) bump(counts.mcp, c.name.split("__")[1]);
          }
        }
        if (ev?.type === "user") {
          const text = typeof content === "string" ? content : Array.isArray(content) ? content.map(c => c?.text ?? "").join("") : "";
          for (const m of text.matchAll(/<command-name>\/?([\w:.-]+)<\/command-name>/g)) bump(counts.commands, m[1]);
        }
      }
    }
  };
  walk(root);
  return counts;
}

// ---------------------------------------------------------------- main

/**
 * @param {{home: string, repos?: string[], plugins?: string[], usageDays?: number, now?: Date, catalogDir?: string}} opts
 */
export function survey({ home, repos = [], plugins: pluginDirs = [], usageDays = 0, now = new Date(), catalogDir = CATALOG_DIR }) {
  home = resolve(home);
  repos = repos.map(r => resolve(r));
  const paths = new Paths(home, repos);
  const catalog = loadCatalog({ dir: catalogDir });
  const catalogByName = new Map();
  for (const e of catalog.entries.values()) {
    catalogByName.set(e.id, e);
    catalogByName.set(e.ref.split(":")[1], e);
  }

  const plugins = [];
  const looseUnits = [];
  const settingsHooks = [];
  const platformHooks = [];
  const mcp = [];
  const instructions = [];
  const enabled = new Map();
  const notes = [];
  const harnesses = { claude: false, codex: false, cursor: false };

  // ---- Claude Code, user scope
  const claudeDir = join(home, ".claude");
  if (isPlainDir(claudeDir)) harnesses.claude = true;
  const readSettings = (file, scope, cls) => {
    const s = readJson(file);
    if (!s) return;
    if (s.__invalid) { notes.push(`${paths.show(file)} is not valid JSON; skipped`); return; }
    for (const [id, v] of Object.entries(s.enabledPlugins ?? {})) enabled.set(id, { value: v === true, scope });
    const hooks = hookEntries(s.hooks, `${cls}:${paths.show(file)}`).map(h => ({ ...h, blocking: CAN_BLOCK.has(h.event) ? "unknown" : false, class: cls }));
    (cls === "platform" ? platformHooks : settingsHooks).push(...hooks);
  };
  readSettings(join(claudeDir, "settings.json"), "user", "user");
  readSettings(join(claudeDir, "launcher-settings.json"), "platform", "platform");
  readSettings(join(claudeDir, "managed-settings.json"), "managed", "platform");
  const userState = readJson(join(home, ".claude.json")) ?? readJson(join(claudeDir, ".claude.json"));
  if (userState && !userState.__invalid) {
    for (const n of names(userState.mcpServers)) mcp.push({ name: n, harness: "claude", scope: "user", origin: "~/.claude.json" });
    for (const [proj, spec] of Object.entries(userState.projects ?? {})) {
      if (repos.includes(resolve(proj))) for (const n of names(spec?.mcpServers)) mcp.push({ name: n, harness: "claude", scope: "local", origin: "~/.claude.json projects" });
    }
  }
  const installed = readJson(join(claudeDir, "plugins", "installed_plugins.json"));
  const pluginIds = new Map();
  if (installed?.plugins && typeof installed.plugins === "object") {
    for (const [id, installs] of Object.entries(installed.plugins)) {
      for (const inst of Array.isArray(installs) ? installs : []) {
        const raw = typeof inst?.installPath === "string" ? inst.installPath : null;
        const dir = raw?.startsWith("~/") ? join(home, raw.slice(2)) : raw;
        if (!dir || !isPlainDir(dir)) { notes.push(`${id}: installed but its directory is missing`); continue; }
        const p = scanPlugin(dir, { scope: inst.scope ?? "user", paths, catalogByName });
        p.id = id;
        pluginIds.set(id, p);
        plugins.push(p);
      }
    }
  }
  for (const bucket of list(join(claudeDir, "plugins", "synced"))) {
    const bdir = join(claudeDir, "plugins", "synced", bucket);
    if (!isPlainDir(bdir)) continue;
    for (const name of list(bdir)) {
      const pdir = join(bdir, name);
      if (!isPlainDir(pdir) || name.startsWith(".")) continue;
      const p = scanPlugin(pdir, { scope: "synced", paths, catalogByName });
      p.id = `${p.name}@synced`;
      plugins.push(p);
    }
  }
  looseUnits.push(...scanSkillDir(join(claudeDir, "skills"), "user", paths));
  looseUnits.push(...scanMdDir(join(claudeDir, "agents"), "agent", "user", paths));
  looseUnits.push(...scanMdDir(join(claudeDir, "commands"), "command", "user", paths));
  instructions.push(...instructionFile(join(claudeDir, "CLAUDE.md"), "claude", "user", paths));

  // ---- Codex, user scope
  const codexDir = join(home, ".codex");
  if (isPlainDir(codexDir)) harnesses.codex = true;
  const readCodex = (file, scope) => {
    const text = readText(file);
    if (text == null) return;
    const cfg = scanToml(text);
    for (const n of names(cfg.mcp_servers)) mcp.push({ name: n, harness: "codex", scope, origin: paths.show(file), enabled: cfg.mcp_servers[n]?.enabled !== false });
    for (const [id, spec] of Object.entries(cfg.plugins ?? {})) if (typeof spec?.enabled === "boolean") enabled.set(`codex:${id}`, { value: spec.enabled, scope });
    settingsHooks.push(...hookEntries(cfg.hooks, `codex:${paths.show(file)}`).map(h => ({ ...h, blocking: CAN_BLOCK.has(h.event) ? "unknown" : false, class: "user", harness: "codex" })));
  };
  readCodex(join(codexDir, "config.toml"), "user");
  const codexHooks = readJson(join(codexDir, "hooks.json"));
  if (codexHooks && !codexHooks.__invalid) settingsHooks.push(...hookEntries(codexHooks.hooks ?? codexHooks, `codex:~/.codex/hooks.json`).map(h => ({ ...h, blocking: CAN_BLOCK.has(h.event) ? "unknown" : false, class: "user", harness: "codex" })));
  instructions.push(...instructionFile(join(codexDir, "AGENTS.md"), "codex", "user", paths));
  looseUnits.push(...scanSkillDir(join(codexDir, "skills"), "codex-user", paths));
  looseUnits.push(...scanSkillDir(join(home, ".agents", "skills"), "codex-user", paths));
  for (const f of list(join(codexDir, "agents")).filter(x => x.endsWith(".toml"))) {
    const cfg = scanToml(readText(join(codexDir, "agents", f)) ?? "");
    looseUnits.push({ kind: "agent", name: typeof cfg.name === "string" ? cfg.name : f.slice(0, -5), scope: "codex-user", path: paths.show(join(codexDir, "agents", f)), listing_tokens: listingCost(cfg.name, typeof cfg.description === "string" ? cfg.description : ""), harness: "codex" });
  }

  // ---- Cursor, user scope
  const cursorDir = join(home, ".cursor");
  if (isPlainDir(cursorDir)) harnesses.cursor = true;
  for (const n of names(readJson(join(cursorDir, "mcp.json"))?.mcpServers)) mcp.push({ name: n, harness: "cursor", scope: "user", origin: "~/.cursor/mcp.json" });

  // ---- each repo
  for (const repo of repos) {
    readSettings(join(repo, ".claude", "settings.json"), "project", "user");
    readSettings(join(repo, ".claude", "settings.local.json"), "local", "user");
    for (const n of names(readJson(join(repo, ".mcp.json"))?.mcpServers)) mcp.push({ name: n, harness: "claude", scope: "project", origin: paths.show(join(repo, ".mcp.json")) });
    for (const f of ["CLAUDE.md", "CLAUDE.local.md", ".claude/CLAUDE.md"]) instructions.push(...instructionFile(join(repo, f), "claude", "project", paths));
    for (const f of list(join(repo, ".claude", "rules")).filter(x => x.endsWith(".md"))) instructions.push(...instructionFile(join(repo, ".claude", "rules", f), "claude", "project", paths));
    const agentsMd = instructionFile(join(repo, "AGENTS.md"), "codex", "project", paths);
    if (!instructions.some(i => i.path === agentsMd[0]?.path)) instructions.push(...agentsMd);
    looseUnits.push(...scanSkillDir(join(repo, ".claude", "skills"), "project", paths));
    looseUnits.push(...scanMdDir(join(repo, ".claude", "agents"), "agent", "project", paths));
    looseUnits.push(...scanMdDir(join(repo, ".claude", "commands"), "command", "project", paths));
    readCodex(join(repo, ".codex", "config.toml"), "project");
    looseUnits.push(...scanSkillDir(join(repo, ".agents", "skills"), "codex-project", paths));
    looseUnits.push(...scanSkillDir(join(repo, ".codex", "skills"), "codex-project", paths));
    for (const f of list(join(repo, ".cursor", "rules")).filter(x => x.endsWith(".mdc") || x.endsWith(".md"))) {
      const text = readText(join(repo, ".cursor", "rules", f)) ?? "";
      const { data } = frontmatter(text);
      if (data.alwaysApply === true) instructions.push({ path: paths.show(join(repo, ".cursor", "rules", f)), harness: "cursor", scope: "project", tokens: estimateTokens(text), markers: markers(text) });
      else looseUnits.push({ kind: "rule", name: f, scope: "cursor-project", path: paths.show(join(repo, ".cursor", "rules", f)), listing_tokens: listingCost(f, typeof data.description === "string" ? data.description : "") });
    }
    for (const n of names(readJson(join(repo, ".cursor", "mcp.json"))?.mcpServers)) mcp.push({ name: n, harness: "cursor", scope: "project", origin: paths.show(join(repo, ".cursor", "mcp.json")) });
    if (isPlainDir(join(repo, ".cursor"))) harnesses.cursor = true;
  }

  // ---- explicit plugin checkouts (measuring a plugin before installing it)
  for (const dir of pluginDirs) {
    const p = scanPlugin(resolve(dir), { scope: "checkout", paths, catalogByName });
    p.id = `${p.name}@checkout`;
    plugins.push(p);
  }

  // ---- enabled state: settings win; an installed plugin with no entry is reported unknown.
  for (const p of plugins) {
    const e = enabled.get(p.id);
    p.enabled = p.scope === "checkout" ? true : e ? e.value : p.scope === "synced" ? true : null;
    p.ref = p.catalog ? catalog.entries.get(p.catalog).ref : `plugin:${p.name}`;
  }
  const live = plugins.filter(p => p.enabled !== false);

  // ---- collisions
  const collisions = [];
  const allHooks = [...live.flatMap(p => p.hooks.map(h => ({ ...h, class: "plugin", owner: p.name }))), ...settingsHooks.map(h => ({ ...h, owner: h.origin })), ...platformHooks.map(h => ({ ...h, owner: h.origin }))];
  const stopBlockers = allHooks.filter(h => h.event === "Stop" && h.blocking !== false);
  if (stopBlockers.length > 1) {
    collisions.push({ code: "GST-C-STOP", severity: "warn", message: `${stopBlockers.length} Stop hooks can block the same turn: ${stopBlockers.map(h => `${h.owner}${h.class === "platform" ? " (platform)" : ""}${h.blocking === "unknown" ? " (unknown)" : ""}${h.opt_in ? ` [opt-in ${h.opt_in}]` : ""}`).join(", ")}. They run together; nothing orders them.` });
  }
  const starters = allHooks.filter(h => h.event === "SessionStart");
  if (starters.length > 1) collisions.push({ code: "GST-C-START", severity: "info", message: `${starters.length} SessionStart hooks inject context: ${[...new Set(starters.map(h => h.owner))].join(", ")}` });
  const counters = allHooks.filter(h => h.event === "PostToolUse" && /Edit|Write/.test(h.matcher ?? ""));
  if (counters.length > 1) collisions.push({ code: "GST-C-COUNTER", severity: "info", message: `${counters.length} PostToolUse hooks watch edits: ${[...new Set(counters.map(h => h.owner))].join(", ")}` });
  const slots = new Map();
  for (const p of live) {
    const slot = p.catalog ? catalog.entries.get(p.catalog).slot : null;
    if (slot) slots.set(slot, [...(slots.get(slot) ?? []), p.name]);
  }
  for (const [slot, who] of slots) if (who.length > 1) collisions.push({ code: "GST-C-SLOT", severity: "warn", message: `slot ${slot} has ${who.length} providers: ${who.join(", ")}` });
  // Generators the catalog marks as alternatives (exclusive_of) collide like a shared slot.
  const liveSteps = new Map(live.filter(p => p.catalog).flatMap(p => (catalog.entries.get(p.catalog).steps ?? []).map(st => [st.id, p.name])));
  const seenPairs = new Set();
  for (const p of live.filter(x => x.catalog)) {
    for (const x of catalog.entries.get(p.catalog).exclusive_of ?? []) {
      const other = liveSteps.get(x);
      const key = [p.name, other].sort().join("|");
      if (other && other !== p.name && !seenPairs.has(key)) { seenPairs.add(key); collisions.push({ code: "GST-C-SLOT", severity: "warn", message: `${p.name} and ${other} generate the same thing; enable one per context` }); }
    }
  }
  for (const ins of instructions) {
    const dup = ins.markers.filter((m, i, a) => a.indexOf(m) !== i && !/:(?:end)\s/.test(m));
    for (const m of new Set(dup)) collisions.push({ code: "GST-C-MARKER", severity: "warn", message: `${ins.path} carries "${m}" more than once` });
  }
  const mcpNames = new Map();
  for (const s of mcp) mcpNames.set(`${s.harness}:${s.name}`, [...(mcpNames.get(`${s.harness}:${s.name}`) ?? []), s.scope]);
  for (const [k, scopes] of mcpNames) if (scopes.length > 1) collisions.push({ code: "GST-C-MCP", severity: "info", message: `MCP server ${k.split(":")[1]} (${k.split(":")[0]}) is defined in ${scopes.join(" and ")} scope` });

  // ---- triggers
  const triggers = [];
  for (const u of [...live.flatMap(p => p.units), ...looseUnits]) if (u.trigger) triggers.push({ where: u.path, match: u.trigger });

  // ---- totals (Claude Code lead; Codex and Cursor reported per harness)
  const claudeUnits = [...live.flatMap(p => p.units), ...looseUnits.filter(u => ["user", "project"].includes(u.scope))];
  const claudeInstr = instructions.filter(i => i.harness === "claude" || (i.harness === "codex" && i.imported_by));
  const byKind = k => claudeUnits.filter(u => u.kind === k).reduce((n, u) => n + u.listing_tokens, 0);
  const instructionsTokens = claudeInstr.reduce((n, i) => n + i.tokens, 0);
  const totals = {
    always_on_tokens: instructionsTokens + byKind("skill") + byKind("agent") + byKind("command"),
    by_kind: { instructions: instructionsTokens, skills: byKind("skill"), agents: byKind("agent"), commands: byKind("command") },
    plugins: live.length,
    skills: claudeUnits.filter(u => u.kind === "skill" && !u.hidden).length,
    hidden_skills: claudeUnits.filter(u => u.kind === "skill" && u.hidden).length,
    agents: claudeUnits.filter(u => u.kind === "agent").length,
    commands: claudeUnits.filter(u => u.kind === "command").length,
    mcp_servers: new Set(mcp.filter(s => s.harness === "claude").map(s => s.name)).size + live.reduce((n, p) => n + p.mcp_servers.length, 0),
  };

  const usage = { plugin_counters: pluginUsage(home), transcripts: usageDays > 0 ? { days: usageDays, ...transcriptUsage(home, usageDays, now) } : null };

  return {
    schema: SURVEY_SCHEMA,
    generated_at: now.toISOString(),
    token_method: TOKEN_METHOD,
    harnesses,
    totals,
    instructions_tokens: instructionsTokens,
    plugins: plugins.map(({ units, ...p }) => ({ ...p, units: units.map(({ trigger, ...u }) => u) })).sort((a, b) => a.name.localeCompare(b.name) || a.scope.localeCompare(b.scope)),
    loose: looseUnits.sort((a, b) => a.path.localeCompare(b.path)),
    instructions,
    mcp: mcp.sort((a, b) => `${a.harness}${a.name}${a.scope}`.localeCompare(`${b.harness}${b.name}${b.scope}`)),
    hooks: { settings: settingsHooks, platform: platformHooks },
    stop_blockers: stopBlockers.map(h => (h.class === "platform" ? `platform:${h.script.replace(/\.\w+$/, "")}` : h.owner)),
    collisions,
    triggers,
    usage,
    notes: [
      ...notes,
      "MCP tool definitions are not counted: the survey never starts a server. Claude Code defers them by default (tool search); harnesses that load them up front pay for them every turn.",
    ],
  };
}

// ---------------------------------------------------------------- report

export function renderSurvey(s) {
  const L = [];
  const t = s.totals;
  L.push("# Survey", "");
  L.push(`Generated ${s.generated_at.slice(0, 10)}. Token figures are an ${s.token_method}, good for ranking and budgets, not a tokenizer count.`, "");
  L.push("## Headline", "");
  L.push(`- **Always-on (Claude Code lead): ≈${t.always_on_tokens} tokens**: instructions ${t.by_kind.instructions}, skill listings ${t.by_kind.skills}, agent listings ${t.by_kind.agents}, commands ${t.by_kind.commands}.`);
  L.push(`- ${t.plugins} plugins live, ${t.skills} listed skills${t.hidden_skills ? ` (and ${t.hidden_skills} that run by name only)` : ""}, ${t.agents} agents, ${t.commands} commands, ${t.mcp_servers} MCP servers.`);
  L.push(`- Stop hooks that can block a turn: ${s.stop_blockers.length}${s.stop_blockers.length ? ` (${s.stop_blockers.join(", ")})` : ""}.`);
  L.push(`- Harnesses found: ${Object.entries(s.harnesses).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}.`, "");
  if (s.plugins.length) {
    L.push("## Plugins by always-on cost", "");
    L.push("| Plugin | Scope | Enabled | Skills | Agents | Cmds | ≈Tokens | Hooks | MCP | Catalog |", "|---|---|---|---|---|---|---|---|---|---|");
    for (const p of [...s.plugins].sort((a, b) => b.listing_tokens - a.listing_tokens || a.name.localeCompare(b.name))) {
      const hooks = [...new Set(p.hooks.map(h => `${h.event}${h.blocking === true ? "!" : h.blocking === "unknown" ? "?" : ""}`))].join(" ");
      L.push(`| ${p.name} | ${p.scope} | ${p.enabled === null ? "?" : p.enabled ? "yes" : "no"} | ${p.skills} | ${p.agents} | ${p.commands} | ${p.listing_tokens} | ${hooks || "—"} | ${p.mcp_servers.length || "—"} | ${p.catalog ?? "—"} |`);
    }
    L.push("", "`!` blocks the turn, `?` can block (unknown to the catalog).", "");
  }
  if (s.instructions.length) {
    L.push("## Instruction files", "", "| File | Harness | ≈Tokens | Managed blocks and snippets |", "|---|---|---|---|");
    for (const i of s.instructions) L.push(`| ${i.path}${i.imported_by ? ` (via ${i.imported_by})` : ""} | ${i.harness} | ${i.tokens} | ${i.markers.join(", ") || "—"} |`);
    L.push("");
  }
  L.push("## Collisions", "");
  if (s.collisions.length) for (const c of s.collisions) L.push(`- **${c.code}** (${c.severity}): ${c.message}`);
  else L.push("- None found.");
  L.push("");
  if (s.triggers.length) {
    L.push("## Aggressive descriptions (heuristic)", "");
    for (const tr of s.triggers) L.push(`- ${tr.where}: "${tr.match}"`);
    L.push("");
  }
  if (s.usage.plugin_counters || s.usage.transcripts) {
    L.push("## Usage", "");
    if (s.usage.plugin_counters) L.push(`- Plugin counters (~/.claude.json): ${Object.entries(s.usage.plugin_counters).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}.`);
    if (s.usage.transcripts) {
      const u = s.usage.transcripts;
      const fmt = m => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
      L.push(`- Last ${u.days} days, ${u.sessions} sessions. Skills: ${fmt(u.skills)}. Subagents: ${fmt(u.agents)}. MCP: ${fmt(u.mcp)}. Commands: ${fmt(u.commands)}.`);
    }
    L.push("");
  }
  L.push("## What the survey cannot see", "");
  for (const n of s.notes) L.push(`- ${n}`);
  return `${L.join("\n")}\n`;
}
