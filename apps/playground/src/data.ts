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

const FIRST = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '채원', '예준', '수아'];
const LAST = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
const DEPTS = ['영업', '인사', '재무', '개발', '마케팅', '생산', '구매'];
const POSITIONS = ['사원', '주임', '대리', '과장', '차장', '부장'];

function pick<T>(arr: T[], i: number): T {
  const v = arr[i % arr.length];
  if (v === undefined) throw new Error('empty pick array');
  return v;
}

export function makeEmployees(count: number): Employee[] {
  const out: Employee[] = [];
  for (let i = 0; i < count; i++) {
    const year = 2008 + (i % 17);
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 27) + 1).padStart(2, '0');
    out.push({
      id: `EMP-${String(1000 + i)}`,
      name: `${pick(LAST, i * 7)}${pick(FIRST, i * 3)}`,
      dept: pick(DEPTS, i),
      position: pick(POSITIONS, i * 5),
      salary: 3200 + ((i * 137) % 6800),
      hiredAt: `${year}-${month}-${day}`,
      active: i % 9 !== 0,
    });
  }
  return out;
}

export const employeeColumns: ReactColumnDef<Employee>[] = [
  { key: 'id', label: '사번', width: 110 },
  { key: 'name', label: '사원명', width: 120 },
  { key: 'dept', label: '부서', width: 100, filterable: true },
  { key: 'position', label: '직급', width: 100 },
  { key: 'salary', label: '급여 (만원)', type: 'number', align: 'right', width: 130 },
  { key: 'hiredAt', label: '입사일', type: 'date', width: 130 },
  {
    key: 'active',
    label: '재직',
    align: 'center',
    width: 80,
    renderCell: ({ value }) => (value ? '🟢' : '⚪️'),
  },
];
