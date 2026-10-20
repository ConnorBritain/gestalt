// A YAML subset reader with no dependencies, enough for ui-magic's manifests,
// catalogs and config: block maps and sequences by indentation, "- key: v"
// items, flow collections (also across lines), single/double-quoted and plain
// scalars (also multi-line), block scalars (| and >, with - / + chomping),
// comments and "---" document separators. Plain scalars follow YAML 1.2 core:
// only true/false/null/~ and numbers are typed, so `on` and `yes` stay strings
// and dates stay strings. No anchors, aliases, tags or complex keys.

export class YamlError extends Error {
  constructor(message, line) {
    super(line ? `${message} (line ${line})` : message);
    this.line = line;
  }
}

function stripComment(text) {
  let q = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q === '"') { if (c === '\\') i++; else if (c === '"') q = null; continue; }
    if (q === "'") { if (c === "'") { if (text[i + 1] === "'") i++; else q = null; } continue; }
    if ((c === '"' || c === "'") && (i === 0 || /[\s[{,:]/.test(text[i - 1]))) q = c;
    else if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i);
  }
  return text;
}

function lex(src) {
  return src.replace(/\r\n?/g, '\n').split('\n').map((raw, i) => {
    const indent = raw.match(/^ */)[0].length;
    const text = stripComment(raw).trimEnd();
    return { raw, n: i + 1, indent, text: text.slice(indent), blank: text.trim() === '' };
  });
}

// Exponent forms need a dot (as in YAML 1.1), so short git SHAs like 5364e38
// stay strings.
const NUM = /^[-+]?(?:0|[1-9][0-9_]*)$|^[-+]?(?:0|[1-9][0-9_]*)?\.[0-9_]+(?:[eE][-+]?[0-9]+)?$|^[-+]?(?:0|[1-9][0-9_]*)\.(?:[eE][-+]?[0-9]+)?$|^0x[0-9a-fA-F]+$|^0o[0-7]+$/;

function plain(s) {
  if (s === '' || s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  if (/^(?:true|True|TRUE)$/.test(s)) return true;
  if (/^(?:false|False|FALSE)$/.test(s)) return false;
  if (NUM.test(s)) {
    if (/^0x/.test(s)) return parseInt(s, 16);
    if (/^0o/.test(s)) return parseInt(s.slice(2), 8);
    const n = Number(s.replace(/_/g, ''));
    if (Number.isFinite(n)) return n;
  }
  if (/^[-+]?\.(?:inf|Inf|INF)$/.test(s)) return s.startsWith('-') ? -Infinity : Infinity;
  return s;
}

function unquoteDouble(s, line) {
  let out = '';
  for (let i = 1; i < s.length - 1; i++) {
    const c = s[i];
    if (c !== '\\') { out += c; continue; }
    const e = s[++i];
    const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '/': '/', '0': '\0', ' ': ' ', e: '\x1b', b: '\b', f: '\f', N: '\u0085', _: ' ' };
    if (e in map) out += map[e];
    else if (e === 'x') { out += String.fromCharCode(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else if (e === 'u') { out += String.fromCharCode(parseInt(s.substr(i + 1, 4), 16)); i += 4; }
    else if (e === 'U') { out += String.fromCodePoint(parseInt(s.substr(i + 1, 8), 16)); i += 8; }
    else throw new YamlError(`unknown escape \\${e}`, line);
  }
  return out;
}

// Folds a multi-line quoted or plain scalar: single newlines become spaces,
// blank lines become newlines.
function fold(parts) {
  let out = '';
  let pendingBreaks = 0;
  for (const p of parts) {
    const t = p.trim();
    if (t === '') { pendingBreaks++; continue; }
    if (out) out += pendingBreaks ? '\n'.repeat(pendingBreaks) : ' ';
    out += t;
    pendingBreaks = 0;
  }
  return out;
}

function scalar(s, line) {
  s = s.trim();
  if (s.startsWith('"')) {
    if (!/(?:^|[^\\])(?:\\\\)*"$/.test(s.slice(1)) || s.length < 2) throw new YamlError('unterminated double-quoted string', line);
    return unquoteDouble(s, line);
  }
  if (s.startsWith("'")) {
    if (s.length < 2 || !s.endsWith("'")) throw new YamlError('unterminated single-quoted string', line);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (/^[&*!]/.test(s)) throw new YamlError(`anchors, aliases and tags are not supported: ${s.slice(0, 20)}`, line);
  return plain(s);
}

// Flow collections: [a, {b: c}, "d"]
function parseFlow(s, line) {
  let i = 0;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  function value(stops) {
    ws();
    const c = s[i];
    if (c === '[') return seq();
    if (c === '{') return map();
    if (c === '"' || c === "'") {
      const start = i++;
      while (i < s.length) {
        if (c === '"' && s[i] === '\\') { i += 2; continue; }
        if (s[i] === c) { if (c === "'" && s[i + 1] === "'") { i += 2; continue; } i++; break; }
        i++;
      }
      return scalar(s.slice(start, i), line);
    }
    const start = i;
    while (i < s.length && !stops.includes(s[i]) && !(s[i] === ':' && /[\s,\]}]/.test(s[i + 1] || ' ') && stops.includes(':'))) i++;
    return scalar(s.slice(start, i), line);
  }
  function seq() {
    i++; const out = [];
    for (;;) {
      ws();
      if (s[i] === ']') { i++; return out; }
      if (i >= s.length) throw new YamlError('unterminated flow sequence', line);
      const v = value([',', ']']);
      ws();
      if (i >= s.length) throw new YamlError('unterminated flow sequence', line);
      if (s[i] === ':' ) { i++; out.push({ [String(v)]: value([',', ']']) }); ws(); }
      else out.push(v);
      if (s[i] === ',') i++;
      else if (s[i] !== ']') throw new YamlError(`expected , or ] in flow sequence near "${s.slice(i, i + 15)}"`, line);
    }
  }
  function map() {
    i++; const out = {};
    for (;;) {
      ws();
      if (s[i] === '}') { i++; return out; }
      if (i >= s.length) throw new YamlError('unterminated flow mapping', line);
      const k = value([',', '}', ':']);
      ws();
      let v = null;
      if (s[i] === ':') { i++; v = value([',', '}']); ws(); }
      if (i >= s.length) throw new YamlError('unterminated flow mapping', line);
      out[String(k)] = v;
      if (s[i] === ',') i++;
      else if (s[i] !== '}') throw new YamlError(`expected , or } in flow mapping near "${s.slice(i, i + 15)}"`, line);
    }
  }
  const v = value([]);
  ws();
  if (i < s.length) throw new YamlError(`unexpected text after flow collection: "${s.slice(i, i + 20)}"`, line);
  return v;
}

// Index of the quote that closes the string starting at s[0], or -1.
function quotedEnd(s) {
  const q = s[0];
  for (let i = 1; i < s.length; i++) {
    if (q === '"' && s[i] === '\\') { i++; continue; }
    if (s[i] === q) {
      if (q === "'" && s[i + 1] === "'") { i++; continue; }
      return i;
    }
  }
  return -1;
}

function balanced(s) {
  let depth = 0, q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q === '"') { if (c === '\\') i++; else if (c === '"') q = null; continue; }
    if (q === "'") { if (c === "'") q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
  }
  return depth <= 0 && !q;
}

// Position of the mapping colon in a block line, or -1.
function keyColon(t) {
  let q = null, depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q === '"') { if (c === '\\') i++; else if (c === '"') q = null; continue; }
    if (q === "'") { if (c === "'") q = null; continue; }
    if ((c === '"' || c === "'") && i === 0) { q = c; continue; }
    if (c === '[' || c === '{') { if (i === 0) return -1; depth++; }
    if (c === ']' || c === '}') depth--;
    if (c === ':' && depth === 0 && (i + 1 === t.length || t[i + 1] === ' ')) return i;
  }
  return -1;
}

class Parser {
  constructor(lines) { this.lines = lines; this.i = 0; }
  skip() { while (this.i < this.lines.length && this.lines[this.i].blank) this.i++; }
  peek() { this.skip(); return this.lines[this.i]; }

  block(minIndent) {
    const l = this.peek();
    if (!l || l.indent < minIndent) return null;
    const quotedKey = /^["']/.test(l.text) && keyColon(l.text.slice(quotedEnd(l.text) + 1).replace(/^\s*/, '')) === 0;
    if (/^[[{|>]/.test(l.text) || (/^["']/.test(l.text) && !quotedKey)) { this.i++; return this.inline(l.text, l, l.indent - 1); }
    return /^-(?: |$)/.test(l.text) ? this.seq(l.indent) : this.map(l.indent);
  }

  seq(ind) {
    const out = [];
    for (let l = this.peek(); l && l.indent === ind && /^-(?: |$)/.test(l.text); l = this.peek()) {
      const rest = l.text.slice(1).replace(/^ +/, '');
      if (rest === '') { this.i++; out.push(this.block(ind + 1)); continue; }
      const col = ind + (l.text.length - rest.length);
      if (/^-(?: |$)/.test(rest)) { l.indent = col; l.text = rest; out.push(this.seq(col)); continue; }
      if (!/^[[{"']/.test(rest) && keyColon(rest) > 0 || /^["'][^"']*["']\s*:(?: |$)/.test(rest)) {
        // "- key: value" starts a mapping at the column of "key".
        l.indent = col; l.text = rest;
        out.push(this.map(col));
      } else {
        this.i++;
        out.push(this.inline(rest, l, ind));
      }
    }
    return out;
  }

  map(ind) {
    const out = {};
    for (let l = this.peek(); l && l.indent === ind && !/^-(?: |$)/.test(l.text); l = this.peek()) {
      const c = keyColon(l.text);
      if (c <= 0) throw new YamlError(`expected "key: value", got "${l.text.slice(0, 40)}"`, l.n);
      const rawKey = l.text.slice(0, c).trim();
      const key = String(/^["']/.test(rawKey) ? scalar(rawKey, l.n) : rawKey);
      if (Object.prototype.hasOwnProperty.call(out, key)) throw new YamlError(`duplicate key "${key}"`, l.n);
      const rest = l.text.slice(c + 1).trim();
      this.i++;
      if (rest === '') {
        const next = this.peek();
        if (next && next.indent > ind) out[key] = this.block(ind + 1);
        else if (next && next.indent === ind && /^-(?: |$)/.test(next.text)) out[key] = this.seq(ind);
        else out[key] = null;
      } else {
        out[key] = this.inline(rest, l, ind);
      }
    }
    const l = this.peek();
    if (l && l.indent > ind) throw new YamlError(`unexpected indentation: "${l.text.slice(0, 40)}"`, l.n);
    return out;
  }

  // A value that starts on the current line (already consumed).
  inline(rest, l, ind) {
    const bs = rest.match(/^([|>])([+-]?)(\d?)\s*$/);
    if (bs) return this.blockScalar(bs[1], bs[2], bs[3] ? Number(bs[3]) : 0, ind);
    if (/^[[{]/.test(rest)) {
      let text = rest;
      while (!balanced(text) && this.i < this.lines.length) {
        const nl = this.lines[this.i++];
        text += ' ' + stripComment(nl.raw).trim();
      }
      return parseFlow(text, l.n);
    }
    if (/^["']/.test(rest)) {
      const q = rest[0];
      const closed = (s) => quotedEnd(s) === s.length - 1;
      if (closed(rest)) return scalar(rest, l.n);
      const parts = [rest];
      while (this.i < this.lines.length) {
        const nl = this.lines[this.i++];
        parts.push(nl.raw.trim());
        const joined = parts.join(' ');
        if (closed(nl.raw.trim()) || closed(joined)) {
          const body = fold([parts[0].slice(1), ...parts.slice(1, -1), parts.at(-1).slice(0, -1)]);
          return q === '"' ? unquoteDouble(`"${body}"`, l.n) : body.replace(/''/g, "'");
        }
      }
      throw new YamlError('unterminated quoted string', l.n);
    }
    // Plain scalar, possibly continued on more-indented lines.
    const parts = [rest];
    for (let nl = this.peek(); nl && nl.indent > ind && keyColon(nl.text) <= 0 && !/^-(?: |$)/.test(nl.text); nl = this.peek()) {
      parts.push(nl.text); this.i++;
    }
    return parts.length === 1 ? scalar(rest, l.n) : fold(parts);
  }

  blockScalar(style, chomp, explicit, ind) {
    const body = [];
    let blockIndent = explicit ? ind + explicit : null;
    while (this.i < this.lines.length) {
      const l = this.lines[this.i];
      const rawIndent = l.raw.match(/^ */)[0].length;
      if (l.raw.trim() === '') { body.push(''); this.i++; continue; }
      if (blockIndent === null) blockIndent = rawIndent;
      if (rawIndent < blockIndent || rawIndent <= ind) break;
      body.push(l.raw.slice(blockIndent));
      this.i++;
    }
    let trailing = 0;
    while (body.length && body.at(-1) === '') { body.pop(); trailing++; }
    let text;
    if (style === '|') text = body.join('\n');
    else {
      text = '';
      for (let k = 0; k < body.length; k++) {
        const line = body[k];
        if (k === 0) { text = line; continue; }
        const prev = body[k - 1];
        if (line === '') text += '\n';
        else if (prev === '' || /^\s/.test(line) || /^\s/.test(prev)) text += (prev === '' ? '' : '\n') + line;
        else text += ' ' + line;
      }
    }
    if (chomp === '-') return text;
    if (chomp === '+') return text + '\n'.repeat(trailing + 1);
    return body.length ? text + '\n' : '';
  }
}

function parseDoc(lines) {
  const p = new Parser(lines);
  const first = p.peek();
  if (!first) return null;
  let value;
  if (first.indent === 0 && !/^-(?: |$)/.test(first.text) && keyColon(first.text) <= 0) {
    p.i++;
    value = p.inline(first.text, first, -1);
  } else {
    value = p.block(0);
  }
  const extra = p.peek();
  if (extra) throw new YamlError(`unexpected content: "${extra.text.slice(0, 40)}"`, extra.n);
  return value;
}

function documents(src) {
  const docs = [[]];
  for (const l of lex(src)) {
    if (/^---(?:\s|$)/.test(l.raw)) { docs.push([]); continue; }
    if (/^\.\.\.\s*$/.test(l.raw)) continue;
    if (/^%/.test(l.raw)) continue;
    docs.at(-1).push(l);
  }
  return docs.filter((d, i) => i === 0 ? d.some((l) => !l.blank) : true);
}

export function parseYaml(src) {
  const docs = documents(src);
  if (docs.length > 1) throw new YamlError('multiple documents; use parseYamlAll');
  return docs.length ? parseDoc(docs[0]) : null;
}

export function parseYamlAll(src) {
  return documents(src).map(parseDoc);
}
