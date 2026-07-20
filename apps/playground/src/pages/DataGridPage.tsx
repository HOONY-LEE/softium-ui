import { DataGrid, type ReactColumnDef, useTable } from '@softium/table-react';
import { useCallback, useMemo, useState } from 'react';
import { type Employee, makeEmployees } from '../data';
import type { Locale } from '../i18n';

export function DataGridPage({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const [data, setData] = useState<Employee[]>(() => makeEmployees(12043));

  const columns = useMemo<ReactColumnDef<Employee>[]>(
    () => [
      { key: 'id', label: '사번', width: 110 },
      { key: 'name', label: '사원명', flex: 1, minWidth: 140, editable: true },
      { key: 'dept', label: '부서', editable: true },
      { key: 'position', label: '직급', editable: true },
      {
        key: 'salary',
        label: '급여 (만원)',
        type: 'number',
        align: 'right',
        editable: true,
        copyable: false,
      },
      { key: 'hiredAt', label: '입사일', type: 'date' },
    ],
    [],
  );

  const table = useTable({ data, columns, getRowId: (r) => r.id, pageSize: 10 });

  // batch commit: apply every staged change at once when Save is pressed
  const onSave = useCallback((changes: { rowId: string; columnKey: string; value: unknown }[]) => {
    setData((prev) =>
      prev.map((r) => {
        const mine = changes.filter((c) => c.rowId === r.id);
        if (mine.length === 0) return r;
        const next = { ...r };
        for (const c of mine) (next as Record<string, unknown>)[c.columnKey] = c.value;
        return next;
      }),
    );
  }, []);

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('데이터 그리드', 'Data Grid')}</h2>
          <p className="page-desc">
            {t(
              '편집 모드형 데이터 그리드 — 「편집」으로 켜고 「저장/취소」로 반영.',
              'Toggle-edit data grid — press “Edit”, then “Save” or “Cancel”.',
            )}
          </p>
        </div>
      </div>

      <DataGrid
        table={table}
        locale={locale}
        exportable
        exportFileName="employees"
        editMode="toggle"
        commitMode="batch"
        onSave={onSave}
      />
    </div>
  );
}
