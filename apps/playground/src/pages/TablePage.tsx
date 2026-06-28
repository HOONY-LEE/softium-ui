import { Table, useTable } from '@softium/table-react';
import { Button, Switch } from '@softium/ui';
import { useMemo, useState } from 'react';
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

  // every table option is an independent switch
  const [scrollX, setScrollX] = useState(false);
  const [stickyHeader, setStickyHeader] = useState(false);
  const [rowBorders, setRowBorders] = useState(false);
  const [columnBorders, setColumnBorders] = useState(false);
  const [striped, setStriped] = useState(true);

  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('데이터 테이블', 'Data Table')}</h2>
          <p className="page-desc">
            {t(
              '정렬·필터·검색·컬럼 조작·선택·페이지네이션을 한 컴포넌트로. (전체 10,000행)',
              'Sort, filter, search, column ops, selection, pagination — one component. (10,000 rows)',
            )}
          </p>
        </div>
      </div>

      <div className="table-settings">
        <span className="table-settings__label">{t('테이블 설정', 'Settings')}</span>
        <Switch
          checked={rowBorders}
          onChange={setRowBorders}
          label={t('행 경계선', 'Row borders')}
        />
        <Switch
          checked={columnBorders}
          onChange={setColumnBorders}
          label={t('열 경계선', 'Column borders')}
        />
        <Switch checked={striped} onChange={setStriped} label={t('줄무늬', 'Striped')} />
        <Switch checked={scrollX} onChange={setScrollX} label={t('좌우 스크롤', 'H-scroll')} />
        <Switch
          checked={stickyHeader}
          onChange={setStickyHeader}
          label={t('헤더 고정', 'Sticky header')}
        />
      </div>

      <Table
        table={table}
        locale={locale}
        selectable
        scrollX={scrollX}
        rowBorders={rowBorders}
        columnBorders={columnBorders}
        striped={striped}
        maxHeight={stickyHeader ? 360 : undefined}
        toolbarActions={
          <Button variant="primary" size="sm" iconLeft="＋">
            {t('직원 추가', 'Add')}
          </Button>
        }
      />
    </div>
  );
}
