/**
 * Minimal spreadsheet formula engine (no eval()).
 *
 * Supports: numbers, + - * / and parentheses, cell refs (A1), ranges inside
 * functions (A1:A3), and SUM / AVERAGE / MIN / MAX / COUNT. Recursive refs are
 * cycle-guarded. A formula is any raw value starting with "=".
 */

export type RawGetter = (addr: string) => string;

const CELL_RE = /^([A-Z]+)(\d+)$/;

export function colToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function indexToCol(index: number): string {
  let s = '';
  let i = index + 1;
  while (i > 0) {
    const rem = (i - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

export function cellAddr(col: number, row: number): string {
  return `${indexToCol(col)}${row + 1}`;
}

function expandRange(a: string, b: string): string[] {
  const ma = CELL_RE.exec(a);
  const mb = CELL_RE.exec(b);
  if (!ma || !mb) return [];
  const c1 = colToIndex(ma[1] as string);
  const c2 = colToIndex(mb[1] as string);
  const r1 = Number(ma[2]) - 1;
  const r2 = Number(mb[2]) - 1;
  const out: string[] = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) out.push(cellAddr(c, r));
  }
  return out;
}

/**
 * Format a numeric value for display per a Sheets-style pattern, without
 * touching the underlying raw value. Supports the small preset vocabulary the
 * toolbar offers: plain grouped integers/decimals, percent, and USD currency.
 */
export function formatNumber(value: number, pattern: string): string {
  const percent = pattern.endsWith('%');
  const currency = pattern.startsWith('$');
  const core = percent ? pattern.slice(0, -1) : currency ? pattern.slice(1) : pattern;
  const decimals = core.includes('.') ? (core.split('.')[1]?.length ?? 0) : 0;
  const n = percent ? value * 100 : value;
  const body = n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency ? '$' : ''}${body}${percent ? '%' : ''}`;
}

/** decimal-place count encoded in a numFmt pattern (e.g. '0.00%' → 2) */
export function decimalsOf(pattern: string | undefined): number {
  if (!pattern) return 0;
  const core = pattern.endsWith('%') ? pattern.slice(0, -1) : pattern;
  const m = /\.(0+)$/.exec(core);
  return m ? (m[1] as string).length : 0;
}

/** returns a copy of `pattern` with its decimal-place count set to `n` */
export function withDecimals(pattern: string | undefined, n: number): string {
  const base = pattern ?? '#,##0';
  const suffix = base.endsWith('%') ? '%' : '';
  const core = suffix ? base.slice(0, -suffix.length) : base;
  const stripped = core.replace(/\.0+$/, '');
  return (n > 0 ? `${stripped}.${'0'.repeat(n)}` : stripped) + suffix;
}

/** Evaluate one cell's display value. */
export function evaluateCell(
  addr: string,
  getRaw: RawGetter,
  seen: Set<string> = new Set(),
): string | number {
  const raw = (getRaw(addr) ?? '').trim();
  if (raw === '') return '';
  if (!raw.startsWith('=')) {
    const n = Number(raw);
    return raw !== '' && !Number.isNaN(n) ? n : raw;
  }
  if (seen.has(addr)) return '#CYCLE';
  seen.add(addr);
  try {
    return evalFormula(raw.slice(1), getRaw, seen);
  } catch {
    return '#ERR';
  } finally {
    seen.delete(addr);
  }
}

function cellNumber(addr: string, getRaw: RawGetter, seen: Set<string>): number {
  const v = evaluateCell(addr, getRaw, seen);
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

// ── tokenizer ───────────────────────────────────────────────
type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z]+\d*)|([()+\-*/,:]))/y;
  let m: RegExpExecArray | null;
  let pos = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard tokenizer loop
  while (pos < src.length && (re.lastIndex = pos) >= 0 && (m = re.exec(src))) {
    if (m[1] !== undefined) tokens.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) tokens.push({ t: 'id', v: m[2].toUpperCase() });
    else if (m[3] !== undefined) tokens.push({ t: 'op', v: m[3] });
    pos = re.lastIndex;
    if (m.index === undefined) break;
  }
  return tokens;
}

// ── recursive-descent parser/evaluator ──────────────────────
function evalFormula(src: string, getRaw: RawGetter, seen: Set<string>): number {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const eat = () => toks[i++];

  function expr(): number {
    let v = term();
    let t = peek();
    while (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
      eat();
      const r = term();
      v = t.v === '+' ? v + r : v - r;
      t = peek();
    }
    return v;
  }
  function term(): number {
    let v = factor();
    let t = peek();
    while (t && t.t === 'op' && (t.v === '*' || t.v === '/')) {
      eat();
      const r = factor();
      v = t.v === '*' ? v * r : v / r;
      t = peek();
    }
    return v;
  }
  function factor(): number {
    const t = eat();
    if (!t) throw new Error('unexpected end');
    if (t.t === 'num') return t.v;
    if (t.t === 'op' && t.v === '-') return -factor();
    if (t.t === 'op' && t.v === '(') {
      const v = expr();
      eat(); // ')'
      return v;
    }
    if (t.t === 'id') {
      const next = peek();
      if (next && next.t === 'op' && next.v === '(') return func(t.v);
      return cellNumber(t.v, getRaw, seen); // cell ref
    }
    throw new Error(`unexpected token ${JSON.stringify(t)}`);
  }
  function func(name: string): number {
    eat(); // '('
    const args: number[] = [];
    while (peek() && !(peek()?.t === 'op' && peek()?.v === ')')) {
      const a = eat();
      const after = peek();
      if (a?.t === 'id' && after?.t === 'op' && after.v === ':') {
        eat(); // ':'
        const b = eat();
        if (b?.t === 'id')
          for (const c of expandRange(a.v, b.v)) args.push(cellNumber(c, getRaw, seen));
      } else if (a?.t === 'id') {
        args.push(cellNumber(a.v, getRaw, seen));
      } else if (a?.t === 'num') {
        args.push(a.v);
      }
      if (peek()?.t === 'op' && peek()?.v === ',') eat();
    }
    eat(); // ')'
    switch (name) {
      case 'SUM':
        return args.reduce((s, n) => s + n, 0);
      case 'AVERAGE':
      case 'AVG':
        return args.length ? args.reduce((s, n) => s + n, 0) / args.length : 0;
      case 'MIN':
        return args.length ? Math.min(...args) : 0;
      case 'MAX':
        return args.length ? Math.max(...args) : 0;
      case 'COUNT':
        return args.length;
      default:
        throw new Error(`unknown function ${name}`);
    }
  }

  return expr();
}
