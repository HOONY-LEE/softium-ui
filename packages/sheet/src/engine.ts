/**
 * Spreadsheet formula engine (no eval()).
 *
 * Supports: numbers, strings, booleans, + - * / and parentheses, comparison
 * operators (= <> < > <= >=), string concatenation (&), cell refs (A1),
 * absolute/relative lock markers ($A$1 / A$1 / $A1), ranges inside functions
 * (A1:A3), and a function library covering math/logic/text/lookup/date needs
 * (see FUNCTION NAMES below). Errors surface as Excel-style strings
 * (#DIV/0!, #N/A, #REF!, #VALUE!, #NAME?) rather than throwing to the caller.
 * Recursive refs are cycle-guarded (#CYCLE).
 */

export type RawGetter = (addr: string) => string;
type Val = number | string | boolean;

const CELL_RE = /^(\$?)([A-Z]+)(\$?)(\d+)$/;

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

/** strip $ lock markers from a ref token, returning the plain "A1" address */
function bareAddr(token: string): string {
  const m = CELL_RE.exec(token);
  if (!m) return token;
  return `${m[2]}${m[4]}`;
}

function expandRange(a: string, b: string): string[] {
  const ma = CELL_RE.exec(a);
  const mb = CELL_RE.exec(b);
  if (!ma || !mb) return [];
  const c1 = colToIndex(ma[2] as string);
  const c2 = colToIndex(mb[2] as string);
  const r1 = Number(ma[4]) - 1;
  const r2 = Number(mb[4]) - 1;
  const out: string[] = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) out.push(cellAddr(c, r));
  }
  return out;
}

/**
 * Shift every relative cell reference in a formula by (dCol, dRow), leaving
 * $-locked axes untouched — the reference-adjustment half of fill-handle
 * drags and copy/paste (T12). Non-formula raw values pass through unchanged.
 * Quoted string literals are left alone so text that merely looks like a
 * cell address (="A1") is never rewritten.
 */
export function shiftFormula(raw: string, dCol: number, dRow: number): string {
  if (!raw.startsWith('=') || (dCol === 0 && dRow === 0)) return raw;
  const TOKEN_RE = /"(?:[^"]|"")*"|(\$?)([A-Za-z]+)(\$?)(\d+)/g;
  const body = raw.slice(1).replace(TOKEN_RE, (whole, colLock, colLetters, rowLock, rowDigits) => {
    if (colLetters === undefined) return whole; // matched a string literal — leave it
    if (colLock && rowLock) return whole; // fully absolute — never shifts
    let col = colToIndex((colLetters as string).toUpperCase());
    let row = Number(rowDigits) - 1;
    if (!colLock) col += dCol;
    if (!rowLock) row += dRow;
    if (col < 0 || row < 0) return '#REF!';
    return `${colLock}${indexToCol(col)}${rowLock}${row + 1}`;
  });
  return `=${body}`;
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

/** thrown internally to carry an Excel-style error code up to evaluateCell */
class FormulaError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
const fail = (code: string): never => {
  throw new FormulaError(code);
};

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
    const v = evalFormula(raw.slice(1), getRaw, seen);
    return typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : v;
  } catch (e) {
    return e instanceof FormulaError ? e.code : '#ERR';
  } finally {
    seen.delete(addr);
  }
}

function cellValue(addr: string, getRaw: RawGetter, seen: Set<string>): Val {
  const bare = bareAddr(addr);
  const v = evaluateCell(bare, getRaw, seen);
  return v;
}

function toNum(v: Val): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}
function toStr(v: Val): string {
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}
function isTruthy(v: Val): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = v.trim().toUpperCase();
  if (s === 'TRUE') return true;
  if (s === 'FALSE' || s === '') return false;
  return true;
}
function isEmpty(v: Val): boolean {
  return v === '';
}
/** -1 / 0 / 1, numeric when both sides are numbers else case-insensitive text */
function compareVals(a: Val, b: Val): number {
  if (typeof a === 'number' && typeof b === 'number') return a === b ? 0 : a < b ? -1 : 1;
  const sa = toStr(a).toUpperCase();
  const sb = toStr(b).toUpperCase();
  return sa === sb ? 0 : sa < sb ? -1 : 1;
}

// ── tokenizer ───────────────────────────────────────────────
type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /\s*(?:("(?:[^"]|"")*")|(\d+(?:\.\d+)?)|(\$?[A-Za-z]+\$?\d*)|(<=|>=|<>|[()+\-*/,:&=<>]))/y;
  let m: RegExpExecArray | null;
  let pos = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard tokenizer loop
  while (pos < src.length && (re.lastIndex = pos) >= 0 && (m = re.exec(src))) {
    if (m[1] !== undefined) tokens.push({ t: 'str', v: m[1].slice(1, -1).replace(/""/g, '"') });
    else if (m[2] !== undefined) tokens.push({ t: 'num', v: Number(m[2]) });
    else if (m[3] !== undefined) tokens.push({ t: 'id', v: m[3].toUpperCase() });
    else if (m[4] !== undefined) tokens.push({ t: 'op', v: m[4] });
    pos = re.lastIndex;
    if (m.index === undefined) break;
  }
  return tokens;
}

/** a parsed function argument: either a flat range of addresses (with its
 * rectangular shape, for lookup functions) or a lazily-evaluated scalar */
type ArgNode =
  | { kind: 'range'; addrs: string[]; nrows: number; ncols: number }
  | { kind: 'val'; get: () => Val };

function rangeAddrs(a: string, b: string): { addrs: string[]; nrows: number; ncols: number } {
  const ma = CELL_RE.exec(a);
  const mb = CELL_RE.exec(b);
  if (!ma || !mb) return { addrs: [], nrows: 0, ncols: 0 };
  const c1 = colToIndex(ma[2] as string);
  const c2 = colToIndex(mb[2] as string);
  const r1 = Number(ma[4]) - 1;
  const r2 = Number(mb[4]) - 1;
  const ncols = Math.abs(c2 - c1) + 1;
  const nrows = Math.abs(r2 - r1) + 1;
  return { addrs: expandRange(a, b), nrows, ncols };
}

// ── recursive-descent parser/evaluator ──────────────────────
function evalFormula(src: string, getRaw: RawGetter, seen: Set<string>): Val {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const eat = () => toks[i++];
  const isOp = (t: Token | undefined, v: string) => !!t && t.t === 'op' && t.v === v;

  function comparison(): () => Val {
    const l = concat();
    const t = peek();
    if (
      t &&
      t.t === 'op' &&
      (t.v === '=' || t.v === '<>' || t.v === '<' || t.v === '>' || t.v === '<=' || t.v === '>=')
    ) {
      eat();
      const r = concat();
      const op = t.v;
      return () => {
        const cmp = compareVals(l(), r());
        switch (op) {
          case '=':
            return cmp === 0;
          case '<>':
            return cmp !== 0;
          case '<':
            return cmp < 0;
          case '>':
            return cmp > 0;
          case '<=':
            return cmp <= 0;
          default:
            return cmp >= 0;
        }
      };
    }
    return l;
  }
  function concat(): () => Val {
    let v = addSub();
    while (isOp(peek(), '&')) {
      eat();
      const r = addSub();
      const l = v;
      v = () => toStr(l()) + toStr(r());
    }
    return v;
  }
  function addSub(): () => Val {
    let v = mulDiv();
    let t = peek();
    while (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
      eat();
      const r = mulDiv();
      const l = v;
      const op = t.v;
      v = () => (op === '+' ? toNum(l()) + toNum(r()) : toNum(l()) - toNum(r()));
      t = peek();
    }
    return v;
  }
  function mulDiv(): () => Val {
    let v = unary();
    let t = peek();
    while (t && t.t === 'op' && (t.v === '*' || t.v === '/')) {
      eat();
      const r = unary();
      const l = v;
      const op = t.v;
      v =
        op === '*'
          ? () => toNum(l()) * toNum(r())
          : () => {
              const rv = toNum(r());
              if (rv === 0) fail('#DIV/0!');
              return toNum(l()) / rv;
            };
      t = peek();
    }
    return v;
  }
  function unary(): () => Val {
    if (isOp(peek(), '-')) {
      eat();
      const v = unary();
      return () => -toNum(v());
    }
    return factor();
  }
  function factor(): () => Val {
    const t = eat();
    if (!t) throw new Error('unexpected end');
    if (t.t === 'num') return () => t.v;
    if (t.t === 'str') return () => t.v;
    if (t.t === 'op' && t.v === '(') {
      const v = comparison();
      eat(); // ')'
      return v;
    }
    if (t.t === 'id') {
      if (t.v === 'TRUE') return () => true;
      if (t.v === 'FALSE') return () => false;
      const next = peek();
      if (next && next.t === 'op' && next.v === '(') return func(t.v);
      const addr = t.v;
      return () => cellValue(addr, getRaw, seen);
    }
    throw new Error(`unexpected token ${JSON.stringify(t)}`);
  }

  /** parse one comma-separated argument list into range/scalar nodes */
  function argList(): ArgNode[] {
    eat(); // '('
    const args: ArgNode[] = [];
    while (peek() && !isOp(peek(), ')')) {
      const a = peek();
      const after = toks[i + 1];
      if (a?.t === 'id' && after && after.t === 'op' && after.v === ':') {
        eat(); // first id
        eat(); // ':'
        const b = eat();
        args.push({ kind: 'range', ...rangeAddrs(a.v, b?.t === 'id' ? b.v : '') });
      } else {
        args.push({ kind: 'val', get: comparison() });
      }
      if (isOp(peek(), ',')) eat();
    }
    eat(); // ')'
    return args;
  }

  /** flatten range/scalar args into numbers (SUM/AVERAGE/MIN/MAX-style) */
  function nums(args: ArgNode[]): number[] {
    const out: number[] = [];
    for (const a of args) {
      if (a.kind === 'range')
        for (const addr of a.addrs) out.push(toNum(cellValue(addr, getRaw, seen)));
      else out.push(toNum(a.get()));
    }
    return out;
  }
  /** flatten range/scalar args into raw values (for COUNTA/CONCATENATE-style) */
  function vals(args: ArgNode[]): Val[] {
    const out: Val[] = [];
    for (const a of args) {
      if (a.kind === 'range') for (const addr of a.addrs) out.push(cellValue(addr, getRaw, seen));
      else out.push(a.get());
    }
    return out;
  }
  /** matches Excel's simple wildcard criteria: numeric/text equality, or a
   * leading comparison operator like ">10" / "<>0" */
  function matchesCriteria(v: Val, criteria: Val): boolean {
    const c = toStr(criteria).trim();
    const m = /^(<=|>=|<>|=|<|>)(.*)$/.exec(c);
    if (m) {
      const op = m[1] as string;
      const rhsRaw = m[2] as string;
      const rhs: Val = rhsRaw !== '' && !Number.isNaN(Number(rhsRaw)) ? Number(rhsRaw) : rhsRaw;
      const cmp = compareVals(v, rhs);
      switch (op) {
        case '=':
          return cmp === 0;
        case '<>':
          return cmp !== 0;
        case '<':
          return cmp < 0;
        case '>':
          return cmp > 0;
        case '<=':
          return cmp <= 0;
        default:
          return cmp >= 0;
      }
    }
    return compareVals(v, c !== '' && !Number.isNaN(Number(c)) ? Number(c) : c) === 0;
  }

  function func(name: string): () => Val {
    const args = argList();
    switch (name) {
      case 'SUM':
        return () => nums(args).reduce((s, n) => s + n, 0);
      case 'AVERAGE':
      case 'AVG': {
        return () => {
          const ns = nums(args);
          return ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : fail('#DIV/0!');
        };
      }
      case 'MIN':
        return () => {
          const ns = nums(args);
          return ns.length ? Math.min(...ns) : 0;
        };
      case 'MAX':
        return () => {
          const ns = nums(args);
          return ns.length ? Math.max(...ns) : 0;
        };
      case 'COUNT':
        return () => nums(args).length;
      case 'COUNTA':
        return () => vals(args).filter((v) => !isEmpty(v)).length;
      case 'IF':
        return () => {
          const cond = args[0];
          if (!cond) return fail('#VALUE!');
          const condVal =
            cond.kind === 'range' ? cellValue(cond.addrs[0] ?? '', getRaw, seen) : cond.get();
          const branch = isTruthy(condVal) ? args[1] : args[2];
          if (!branch) return '';
          return branch.kind === 'range'
            ? cellValue(branch.addrs[0] ?? '', getRaw, seen)
            : branch.get();
        };
      case 'IFERROR':
        return () => {
          const value = args[0];
          const fallback = args[1];
          try {
            if (!value) return '';
            return value.kind === 'range'
              ? cellValue(value.addrs[0] ?? '', getRaw, seen)
              : value.get();
          } catch (e) {
            if (!(e instanceof FormulaError)) throw e;
            if (!fallback) return '';
            return fallback.kind === 'range'
              ? cellValue(fallback.addrs[0] ?? '', getRaw, seen)
              : fallback.get();
          }
        };
      case 'AND':
        return () => vals(args).every((v) => isTruthy(v));
      case 'OR':
        return () => vals(args).some((v) => isTruthy(v));
      case 'NOT':
        return () => !isTruthy(vals(args)[0] ?? false);
      case 'ABS':
        return () => Math.abs(nums(args)[0] ?? 0);
      case 'ROUND': {
        const ns = () => nums(args);
        return () => {
          const [x, d = 0] = ns();
          const f = 10 ** d;
          return Math.round((x ?? 0) * f) / f;
        };
      }
      case 'FLOOR':
        return () => {
          const [x, sig = 1] = nums(args);
          if (!sig) fail('#DIV/0!');
          return Math.floor((x ?? 0) / sig) * sig;
        };
      case 'CEIL':
      case 'CEILING':
        return () => {
          const [x, sig = 1] = nums(args);
          if (!sig) fail('#DIV/0!');
          return Math.ceil((x ?? 0) / sig) * sig;
        };
      case 'MOD':
        return () => {
          const [x, y] = nums(args);
          if (!y) fail('#DIV/0!');
          return (x ?? 0) - (y as number) * Math.floor((x ?? 0) / (y as number));
        };
      case 'CONCATENATE':
        return () => vals(args).map(toStr).join('');
      case 'LEN':
        return () => toStr(vals(args)[0] ?? '').length;
      case 'LEFT':
        return () => {
          const vs = vals(args);
          return toStr(vs[0] ?? '').slice(0, vs.length > 1 ? toNum(vs[1] as Val) : 1);
        };
      case 'RIGHT':
        return () => {
          const vs = vals(args);
          const s = toStr(vs[0] ?? '');
          const n = vs.length > 1 ? toNum(vs[1] as Val) : 1;
          return n >= s.length ? s : s.slice(s.length - n);
        };
      case 'MID':
        return () => {
          const vs = vals(args);
          const s = toStr(vs[0] ?? '');
          const start = Math.max(1, toNum(vs[1] ?? 1));
          const len = Math.max(0, toNum(vs[2] ?? 0));
          return s.slice(start - 1, start - 1 + len);
        };
      case 'COUNTIF': {
        const range = args[0];
        const criteria = args[1];
        return () => {
          if (!range || range.kind !== 'range' || !criteria) return fail('#VALUE!');
          const c =
            criteria.kind === 'range'
              ? cellValue(criteria.addrs[0] ?? '', getRaw, seen)
              : criteria.get();
          return range.addrs.filter((addr) => matchesCriteria(cellValue(addr, getRaw, seen), c))
            .length;
        };
      }
      case 'SUMIF': {
        const range = args[0];
        const criteria = args[1];
        const sumRange = args[2];
        return () => {
          if (!range || range.kind !== 'range' || !criteria) return fail('#VALUE!');
          const rangeNode = range;
          const sumNode = sumRange && sumRange.kind === 'range' ? sumRange : rangeNode;
          const c =
            criteria.kind === 'range'
              ? cellValue(criteria.addrs[0] ?? '', getRaw, seen)
              : criteria.get();
          let total = 0;
          rangeNode.addrs.forEach((addr, idx) => {
            if (matchesCriteria(cellValue(addr, getRaw, seen), c)) {
              const sumAddr = sumNode.addrs[idx] ?? addr;
              total += toNum(cellValue(sumAddr, getRaw, seen));
            }
          });
          return total;
        };
      }
      case 'INDEX': {
        const range = args[0];
        return () => {
          if (!range || range.kind !== 'range') return fail('#REF!');
          const { addrs, nrows, ncols } = range;
          const rest = args.slice(1).map((a) => (a.kind === 'val' ? toNum(a.get()) : 0));
          let row = rest[0] ?? 0;
          let col = rest[1] ?? 0;
          if (rest.length === 1) {
            // 1-D range: the single index walks its own axis
            if (ncols === 1) {
              col = 1;
            } else if (nrows === 1) {
              col = row;
              row = 1;
            }
          }
          if (row < 1 || col < 1 || row > nrows || col > ncols) return fail('#REF!');
          const flatIdx = (row - 1) * ncols + (col - 1);
          const addr = addrs[flatIdx];
          if (!addr) return fail('#REF!');
          return cellValue(addr, getRaw, seen);
        };
      }
      case 'MATCH': {
        const key = args[0];
        const range = args[1];
        const type = args[2];
        return () => {
          if (!key || !range || range.kind !== 'range') return fail('#N/A');
          const k = key.kind === 'range' ? cellValue(key.addrs[0] ?? '', getRaw, seen) : key.get();
          const matchType = type ? (type.kind === 'val' ? toNum(type.get()) : 1) : 1;
          const values = range.addrs.map((addr) => cellValue(addr, getRaw, seen));
          if (matchType === 0) {
            const idx = values.findIndex((v) => compareVals(v, k) === 0);
            if (idx < 0) fail('#N/A');
            return idx + 1;
          }
          // ascending (1) or descending (-1) sorted approximate match
          let best = -1;
          for (let idx = 0; idx < values.length; idx++) {
            const cmp = compareVals(values[idx] as Val, k);
            if (matchType > 0 ? cmp <= 0 : cmp >= 0) best = idx;
            else break;
          }
          if (best < 0) fail('#N/A');
          return best + 1;
        };
      }
      case 'VLOOKUP':
      case 'HLOOKUP': {
        const key = args[0];
        const range = args[1];
        const idxArg = args[2];
        const approxArg = args[3];
        return () => {
          if (!key || !range || range.kind !== 'range' || !idxArg) return fail('#N/A');
          const { addrs, nrows, ncols } = range;
          const k = key.kind === 'range' ? cellValue(key.addrs[0] ?? '', getRaw, seen) : key.get();
          const idx = idxArg.kind === 'val' ? toNum(idxArg.get()) : 1;
          const approx = approxArg
            ? approxArg.kind === 'val'
              ? isTruthy(approxArg.get())
              : true
            : true;
          const vertical = name === 'VLOOKUP';
          const lookupCount = vertical ? nrows : ncols;
          const otherCount = vertical ? ncols : nrows;
          if (idx < 1 || idx > otherCount) fail('#REF!');
          const at = (lookupPos: number, otherPos: number) => {
            const row = vertical ? lookupPos : otherPos;
            const col = vertical ? otherPos : lookupPos;
            return addrs[row * ncols + col];
          };
          let foundPos = -1;
          if (approx) {
            for (let p = 0; p < lookupCount; p++) {
              const v = cellValue(at(p, 0) ?? '', getRaw, seen);
              if (compareVals(v, k) <= 0) foundPos = p;
              else break;
            }
          } else {
            for (let p = 0; p < lookupCount; p++) {
              const v = cellValue(at(p, 0) ?? '', getRaw, seen);
              if (compareVals(v, k) === 0) {
                foundPos = p;
                break;
              }
            }
          }
          if (foundPos < 0) return fail('#N/A');
          const addr = at(foundPos, idx - 1);
          if (!addr) return fail('#REF!');
          return cellValue(addr, getRaw, seen);
        };
      }
      case 'TODAY':
        return () => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
      case 'NOW':
        return () => {
          const d = new Date();
          const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
          return `${date} ${time}`;
        };
      case 'DATE':
        return () => {
          const [y, m, d] = nums(args);
          const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        };
      default:
        return () => fail('#NAME?');
    }
  }

  return comparison()();
}

/** the function names this engine understands — used to drive the toolbar's
 * function-insert (Σ) menu */
export const SUPPORTED_FUNCTIONS = [
  { name: 'SUM', hint: '=SUM(A1:A3)' },
  { name: 'AVERAGE', hint: '=AVERAGE(A1:A3)' },
  { name: 'COUNT', hint: '=COUNT(A1:A3)' },
  { name: 'COUNTA', hint: '=COUNTA(A1:A3)' },
  { name: 'MIN', hint: '=MIN(A1:A3)' },
  { name: 'MAX', hint: '=MAX(A1:A3)' },
  { name: 'IF', hint: '=IF(A1>0,"양","음")' },
  { name: 'IFERROR', hint: '=IFERROR(A1/B1,0)' },
  { name: 'AND', hint: '=AND(A1>0,B1>0)' },
  { name: 'OR', hint: '=OR(A1>0,B1>0)' },
  { name: 'NOT', hint: '=NOT(A1=0)' },
  { name: 'ROUND', hint: '=ROUND(A1,2)' },
  { name: 'ABS', hint: '=ABS(A1)' },
  { name: 'MOD', hint: '=MOD(A1,B1)' },
  { name: 'CONCATENATE', hint: '=CONCATENATE(A1,B1)' },
  { name: 'LEFT', hint: '=LEFT(A1,2)' },
  { name: 'RIGHT', hint: '=RIGHT(A1,2)' },
  { name: 'MID', hint: '=MID(A1,2,3)' },
  { name: 'LEN', hint: '=LEN(A1)' },
  { name: 'COUNTIF', hint: '=COUNTIF(A1:A10,">0")' },
  { name: 'SUMIF', hint: '=SUMIF(A1:A10,">0",B1:B10)' },
  { name: 'VLOOKUP', hint: '=VLOOKUP(A1,A2:C10,2,FALSE)' },
  { name: 'HLOOKUP', hint: '=HLOOKUP(A1,A2:J4,2,FALSE)' },
  { name: 'INDEX', hint: '=INDEX(A1:A10,3)' },
  { name: 'MATCH', hint: '=MATCH(A1,A1:A10,0)' },
  { name: 'TODAY', hint: '=TODAY()' },
  { name: 'NOW', hint: '=NOW()' },
  { name: 'DATE', hint: '=DATE(2026,1,1)' },
] as const;
