import { Table, useTable } from '@softium/table-react';
import { Button } from '@softium/ui';
import { useMemo } from 'react';
import { type Employee, employeeColumns, makeEmployees } from '../data';
import type { Locale } from '../i18n';

export function TablePage({ locale }: { locale: Locale }) {
  // fixed dataset; paging (page-size selector lives in the footer) keeps the DOM light
  const data = useMemo<Employee[]>(() => makeEmployees(10000), []);
  const table = useTable({
    data,
    columns: employeeColumns,
    getRowId: (r) => r.id,
    pageSize: 10,
    persistKey: 'softium.playground.employees',
  });

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{locale === 'ko' ? '데이터 테이블' : 'Data Table'}</h2>
          <p className="page-desc">
            {locale === 'ko'
              ? '정렬·필터·검색·컬럼 조작·선택·페이지네이션을 한 컴포넌트로. (전체 10,000행)'
              : 'Sort, filter, search, column ops, selection, pagination — one component. (10,000 rows)'}
          </p>
        </div>
      </div>

      <Table
        table={table}
        locale={locale}
        selectable
        toolbarActions={
          <Button variant="primary" size="sm" iconLeft="＋">
            {locale === 'ko' ? '직원 추가' : 'Add'}
          </Button>
        }
      />
    </div>
  );
}
