import { Table, useTable } from '@softium/table-react';
import { Button } from '@softium/ui';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { type Employee, employeeColumns, makeEmployees } from '../data';
import type { Locale } from '../i18n';

export function TablePage({ locale }: { locale: Locale }) {
  const data = useMemo<Employee[]>(() => makeEmployees(10000), []);
  const table = useTable({
    data,
    columns: employeeColumns,
    getRowId: (r) => r.id,
    pageSize: 10,
    persistKey: 'softium.playground.employees',
  });

  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('데이터 테이블', 'Data Table')}</h2>
          <p className="page-desc">
            {t(
              '정렬·필터·검색·선택·페이지네이션을 한 컴포넌트로. 편집은 우측 하단 설정(⚙)에서. (전체 10,000행)',
              'Sort, filter, search, select, paginate — one component. Edit via the footer gear. (10,000 rows)',
            )}
          </p>
        </div>
      </div>

      <Table
        table={table}
        locale={locale}
        indexColumn
        selectable
        toolbarActions={
          <Button variant="primary" size="sm" iconLeft={<Plus size={15} />}>
            {t('직원 추가', 'Add')}
          </Button>
        }
      />
    </div>
  );
}
