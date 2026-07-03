import type { ReactColumnDef } from '@softium/table-react';

export interface Employee {
  id: string;
  name: string;
  dept: string;
  position: string;
  salary: number;
  hiredAt: string;
  active: boolean;
}

// large syllable pools → a big combinatorial space so 10k rows rarely repeat.
// surnames (30) × given-1 (30) × given-2 (30) ≈ 27,000 distinct full names.
const SURNAMES = '김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남'.split('');
const GIVEN1 = '민서도하시지주예수유재승현준나소채다은가라세태진우아리연윤별하'.split('');
const GIVEN2 = '준연윤은우원아진호빈서현수민율찬희린온결별하든슬겸안규성훈재'.split('');

const DEPTS = ['영업', '인사', '재무', '개발', '마케팅', '생산', '구매', '법무', '기획', '디자인'];
export const POSITIONS = ['사원', '주임', '대리', '과장', '차장', '부장'];

// realistic org pyramid (more juniors than seniors) as cumulative weights
const POSITION_CUM: [string, number][] = [
  ['사원', 0.32],
  ['주임', 0.52],
  ['대리', 0.7],
  ['과장', 0.85],
  ['차장', 0.94],
  ['부장', 1.0],
];
// base monthly salary (만원) per rank, and the max plausible years of service
const SALARY_BASE: Record<string, number> = {
  사원: 3000,
  주임: 3800,
  대리: 4600,
  과장: 5800,
  차장: 7200,
  부장: 9000,
};
const MAX_SERVICE: Record<string, number> = {
  사원: 6,
  주임: 10,
  대리: 14,
  과장: 19,
  차장: 24,
  부장: 30,
};

/** mulberry32 — a tiny deterministic PRNG so the dataset is stable across renders */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = <T>(arr: T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length] as T;

/**
 * Generate `count` plausible-looking employees with a seeded PRNG: varied names
 * from a large syllable space, a realistic position pyramid, hire dates
 * correlated with seniority, and salaries derived from rank + service + noise.
 * Deterministic (same `seed` → same rows).
 */
export function makeEmployees(count: number, seed = 20260703): Employee[] {
  const rnd = mulberry32(seed);
  const out: Employee[] = [];

  for (let i = 0; i < count; i++) {
    const name = `${at(SURNAMES, Math.floor(rnd() * SURNAMES.length))}${at(
      GIVEN1,
      Math.floor(rnd() * GIVEN1.length),
    )}${at(GIVEN2, Math.floor(rnd() * GIVEN2.length))}`;

    // weighted position pick
    const roll = rnd();
    const posEntry = POSITION_CUM.find(([, c]) => roll <= c);
    const position = posEntry ? posEntry[0] : '부장';

    // seniority: seniors were hired longer ago
    const maxService = MAX_SERVICE[position] ?? 6;
    const serviceYears = Math.floor(rnd() * (maxService + 1));
    const hireYear = Math.max(2000, 2025 - serviceYears);
    const hireMonth = String(1 + Math.floor(rnd() * 12)).padStart(2, '0');
    const hireDay = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');

    // salary: base by rank + service bonus + ±5% noise, rounded to 10만원
    const base = SALARY_BASE[position] ?? 3000;
    const noise = (rnd() - 0.5) * 0.1 * base;
    const salary = Math.round((base + serviceYears * 130 + noise) / 10) * 10;

    out.push({
      id: `EMP-${String(1000 + i)}`,
      name,
      dept: at(DEPTS, Math.floor(rnd() * DEPTS.length)),
      position,
      salary,
      hiredAt: `${hireYear}-${hireMonth}-${hireDay}`,
      active: rnd() > 0.08,
    });
  }
  return out;
}

export const employeeColumns: ReactColumnDef<Employee>[] = [
  { key: 'id', label: '사번', width: 110 },
  { key: 'name', label: '사원명', flex: 1, minWidth: 140 },
  // dept/position/salary/hiredAt omit width → type-based smart defaults apply
  { key: 'dept', label: '부서', filterable: true },
  // custom sort: by job rank order, not alphabetical
  { key: 'position', label: '직급', sortAccessor: (r) => POSITIONS.indexOf(r.position) },
  { key: 'salary', label: '급여 (만원)', type: 'number', align: 'right' },
  { key: 'hiredAt', label: '입사일', type: 'date' },
  { key: 'active', label: '재직', type: 'boolean', align: 'center', width: 80 },
];
