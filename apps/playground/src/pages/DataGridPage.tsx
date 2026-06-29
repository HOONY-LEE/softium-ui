import { DataGrid, type ReactColumnDef, useTable } from '@softium/table-react';
import { useCallback, useMemo, useState } from 'react';
import { type Employee, makeEmployees } from '../data';
import type { Locale } from '../i18n';

export function DataGridPage({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const [data, setData] = useState<Employee[]>(() => makeEmployees(50));

  const columns = useMemo<ReactColumnDef<Employee>[]>(
    () => [
      { key: 'id', label: '사번', width: 110 },
      { key: 'name', label: '사원명', flex: 1, minWidth: 140, editable: true },
      { key: 'dept', label: '부서', editable: true },
      { key: 'position', label: '직급', editable: true },
      { key: 'salary', label: '급여 (만원)', type: 'number', align: 'right', editable: true },
      { key: 'hiredAt', label: '입사일', type: 'date' },
    ],
    [],
  );

  const table = useTable({ data, columns, getRowId: (r) => r.id, pageSize: 10 });

  const onCellChange = useCallback((rowId: string, key: string, value: unknown) => {
    setData((prev) => prev.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)));
  }, []);

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('데이터 그리드', 'Data Grid')}</h2>
          <p className="page-desc">
            {t(
              '데이터 테이블 + 셀 인라인 편집. 편집 가능한 셀(사원명·부서·직급·급여)을 더블클릭하거나 클릭 후 입력 → Enter 저장, Esc 취소.',
              'Data Table + inline cell editing. Double-click an editable cell (name/dept/position/salary), type, then Enter to commit / Esc to cancel.',
            )}
          </p>
        </div>
      </div>

      <DataGrid table={table} locale={locale} onCellChange={onCellChange} />
    </div>
  );
}
