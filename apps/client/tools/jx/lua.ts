// Minimal reader for the data tables in the original Lua 4 scripts (script/skill/<faction>.lua):
//   SKILLS={ name={ attr={ {{1,20},{20,80}}, [3]={{1,1},{20,45}} }, ... }, ... }
// Values are numbers (with + - * / arithmetic such as 22*16), strings, identifiers and nested tables.
// Tables become plain objects keyed "1", "2", … for positional / [n] entries and by name otherwise.
// Function bodies are skipped. Nothing is executed.

export type LuaValue = number | string | LuaTable | null;
export interface LuaTable { [key: string]: LuaValue }

type Tok = { t: 'num'; v: number } | { t: 'str'; v: string } | { t: 'id'; v: string } | { t: 'sym'; v: string };

function stripComments(src: string): string {
  return src.replace(/--\[\[[\s\S]*?\]\]/g, '').replace(/--[^\n]*/g, '');
}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(0x[0-9a-fA-F]+|[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?)/.exec(src.slice(i))!;
      toks.push({ t: 'num', v: Number(m[1]) });
      i += m[1].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      toks.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; s += src[j++]; }
      toks.push({ t: 'str', v: s });
      i = j + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['==', '~=', '<=', '>=', '..'].includes(two)) { toks.push({ t: 'sym', v: two }); i += 2; continue; }
    toks.push({ t: 'sym', v: c });
    i++;
  }
  return toks;
}

class Parser {
  private p = 0;
  constructor(private toks: Tok[]) {}
  private peek(o = 0): Tok | undefined { return this.toks[this.p + o]; }
  private next(): Tok { return this.toks[this.p++]; }
  private isSym(v: string, o = 0): boolean { const t = this.peek(o); return t?.t === 'sym' && t.v === v; }
  private expect(v: string): void {
    const t = this.next();
    if (t?.t !== 'sym' || t.v !== v) throw new Error(`expected ${v} at token ${this.p}, got ${JSON.stringify(t)}`);
  }

  table(): LuaTable {
    this.expect('{');
    const out: LuaTable = {};
    let n = 1;
    while (!this.isSym('}')) {
      if (this.isSym('[')) {
        this.next();
        const k = this.expr();
        this.expect(']');
        this.expect('=');
        out[String(k)] = this.expr();
      } else if (this.peek()?.t === 'id' && this.isSym('=', 1)) {
        const k = (this.next() as { v: string }).v;
        this.next();
        out[k] = this.expr();
      } else {
        out[String(n++)] = this.expr();
      }
      if (this.isSym(',') || this.isSym(';')) this.next();
    }
    this.expect('}');
    return out;
  }

  /** + and - */
  expr(): LuaValue {
    let v = this.term();
    while (this.isSym('+') || this.isSym('-')) {
      const op = (this.next() as { v: string }).v;
      const r = this.term();
      v = typeof v === 'number' && typeof r === 'number' ? (op === '+' ? v + r : v - r) : null;
    }
    return v;
  }

  private term(): LuaValue {
    let v = this.power();
    while (this.isSym('*') || this.isSym('/')) {
      const op = (this.next() as { v: string }).v;
      const r = this.power();
      v = typeof v === 'number' && typeof r === 'number' ? (op === '*' ? v * r : v / r) : null;
    }
    return v;
  }

  private power(): LuaValue {
    const v = this.unary();
    if (!this.isSym('^')) return v;
    this.next();
    const r = this.power();
    return typeof v === 'number' && typeof r === 'number' ? v ** r : null;
  }

  private unary(): LuaValue {
    if (this.isSym('-')) { this.next(); const v = this.unary(); return typeof v === 'number' ? -v : null; }
    if (this.isSym('(')) { this.next(); const v = this.expr(); this.expect(')'); return v; }
    if (this.isSym('{')) return this.table();
    const t = this.next();
    if (t.t === 'num') return t.v;
    if (t.t === 'str') return t.v;
    if (t.t === 'id') {
      if (t.v === 'nil') return null;
      if (t.v === 'function') { this.skipFunction(); return null; }
      if (this.isSym('(')) return this.call(t.v);
      return t.v; // e.g. Conic / Line as the 3rd element of a curve point
    }
    throw new Error(`unexpected ${JSON.stringify(t)} at token ${this.p}`);
  }

  /** `name(args)`: the few pure helpers the data tables use; anything else evaluates to null. */
  private call(name: string): LuaValue {
    this.expect('(');
    const args: LuaValue[] = [];
    while (!this.isSym(')')) {
      args.push(this.expr());
      if (this.isSym(',')) this.next();
    }
    this.expect(')');
    const n = args as number[];
    if (!n.every(a => typeof a === 'number')) return null;
    switch (name) {
      case 'SkillExpFunc': return Math.floor(n[0] * n[1] ** (n[2] - 1) * n[3] * n[4] / 2);
      case 'floor': return Math.floor(n[0]);
      case 'ceil': return Math.ceil(n[0]);
      case 'sqrt': return Math.sqrt(n[0]);
      case 'abs': return Math.abs(n[0]);
      case 'min': return Math.min(...n);
      case 'max': return Math.max(...n);
      default: return null;
    }
  }

  /** After `function`: skip to its matching `end`. */
  private skipFunction(): void {
    let depth = 1;
    while (depth > 0 && this.p < this.toks.length) {
      const t = this.next();
      if (t.t !== 'id') continue;
      if (['function', 'if', 'for', 'while', 'do'].includes(t.v)) {
        // `for ... do` and `while ... do` open one block, not two
        if (t.v === 'for' || t.v === 'while') { while (this.p < this.toks.length && !(this.peek()?.t === 'id' && (this.peek() as { v: string }).v === 'do')) this.p++; this.p++; }
        depth++;
      } else if (t.v === 'end') depth--;
    }
  }
}

/** The table assigned to `name` at the top level of a Lua source (`name={...}`), or null. */
export function readLuaTable(src: string, name: string): LuaTable | null {
  const text = stripComments(src);
  const m = new RegExp(`(^|\\n)\\s*${name}\\s*=\\s*\\{`).exec(text);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  return new Parser(tokenize(text.slice(start))).table();
}
