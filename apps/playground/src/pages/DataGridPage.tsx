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
              '편집 모드형 데이터 그리드. 평소엔 읽기 전용이고, 우측 상단 「편집」을 눌러야 셀을 고칠 수 있습니다. 변경한 셀은 노란색으로 표시(미저장)되고, 「저장」을 누르면 모든 변경이 한 번에 반영됩니다. 「취소」는 모든 변경을 되돌립니다. 셀을 클릭한 뒤 Ctrl/Cmd+C로 값을 복사할 수 있으며(칼럼별로 켜고 끌 수 있음), 이 예시에서는 「급여」컬럼만 복사를 막아뒀습니다.',
              'Toggle-edit data grid. Read-only by default — press “Edit” (top right) to edit cells. Changed cells are highlighted amber (unsaved); “Save” commits all changes at once, “Cancel” discards them. Click a cell then Ctrl/Cmd+C to copy its value — configurable per column; this demo disables copying on the “Salary” column.',
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
