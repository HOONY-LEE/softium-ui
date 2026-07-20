import { Table, useTable } from '@softium/table-react';
import { Button } from '@softium/ui';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { type Employee, employeeColumns, makeEmployees } from '../data';
import type { Locale } from '../i18n';

export function TablePage({ locale }: { locale: Locale }) {
  const data = useMemo<Employee[]>(() => makeEmployees(10625), []);
  const table = useTable({
    data,
    columns: employeeColumns,
    getRowId: (r) => r.id,
    pageSize: 10,
    persistKey: 'softium.playground.employees.v2',
  });

  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('데이터 테이블', 'Data Table')}</h2>
          <p className="page-desc">
            {t(
              '정렬·필터·검색·선택·페이지네이션 — 편집은 설정(⚙)에서.',
              'Sort, filter, search, select, paginate — edit via the footer gear.',
            )}
          </p>
        </div>
      </div>

      <Table
        table={table}
        locale={locale}
        selectable
        exportable
        exportFileName="employees"
        toolbarActions={
          <Button variant="primary" size="sm" iconLeft={<Plus size={15} />}>
            {t('직원 추가', 'Add')}
          </Button>
        }
      />
    </div>
  );
}
