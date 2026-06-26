import { Table, useTable } from '@softium/table-react';
import { Button } from '@softium/ui';
import { useEffect, useMemo, useState } from 'react';
import { type Employee, employeeColumns, makeEmployees } from '../data';
import type { Locale } from '../i18n';

const ROW_OPTIONS = [10, 100, 1000, 10000];

export function TablePage({ locale }: { locale: Locale }) {
  const [rowCount, setRowCount] = useState(10);

  const data = useMemo<Employee[]>(() => makeEmployees(rowCount), [rowCount]);
  const table = useTable({
    data,
    columns: employeeColumns,
    getRowId: (r) => r.id,
    pageSize: 10,
    persistKey: 'softium.playground.employees',
  });

  const paginated = rowCount < 10000;
  useEffect(() => {
    const want = paginated ? 10 : 0;
    if (table.getPageSize() !== want) table.setPageSize(want);
  }, [paginated, table]);

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{locale === 'ko' ? '데이터 테이블' : 'Data Table'}</h2>
          <p className="page-desc">
            {locale === 'ko'
              ? '정렬·필터·검색·컬럼 조작·가상화·선택·페이지네이션을 한 컴포넌트로.'
              : 'Sort, filter, search, column ops, virtualization, selection, pagination — one component.'}
          </p>
        </div>
        <div className="row-toggle">
          <span className="row-toggle__label">{locale === 'ko' ? '행 수' : 'Rows'}</span>
          {ROW_OPTIONS.map((n) => (
            <Button
              key={n}
              size="sm"
              variant={rowCount === n ? 'primary' : 'secondary'}
              onClick={() => setRowCount(n)}
            >
              {n.toLocaleString()}
            </Button>
          ))}
        </div>
      </div>

      <Table table={table} locale={locale} selectable height={paginated ? undefined : 460} />

      <p className="code-note">
        <code>
          {rowCount.toLocaleString()} rows · {paginated ? 'pagination' : 'virtualized'} ·{' '}
          {'<Table table={table} selectable />'}
        </code>
      </p>
    </div>
  );
}
