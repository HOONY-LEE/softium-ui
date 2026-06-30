import { type PivotAggregate, PivotTable } from '@softium/table-react';
import { useMemo, useState } from 'react';
import { type Employee, makeEmployees } from '../data';
import type { Locale } from '../i18n';

type Field = 'dept' | 'position' | 'active';

const FIELD_LABEL: Record<Field, { ko: string; en: string }> = {
  dept: { ko: '부서', en: 'Dept' },
  position: { ko: '직급', en: 'Position' },
  active: { ko: '재직', en: 'Active' },
};
const AGG_LABEL: Record<PivotAggregate, { ko: string; en: string }> = {
  sum: { ko: '합계', en: 'Sum' },
  avg: { ko: '평균', en: 'Avg' },
  count: { ko: '개수', en: 'Count' },
  min: { ko: '최소', en: 'Min' },
  max: { ko: '최대', en: 'Max' },
};

export function PivotPage({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const data = useMemo<Employee[]>(() => makeEmployees(300), []);

  const [rowField, setRowField] = useState<Field>('dept');
  const [colField, setColField] = useState<Field>('position');
  const [aggregate, setAggregate] = useState<PivotAggregate>('sum');

  const config = useMemo(
    () => ({ rows: [rowField], columns: [colField], value: 'salary' as const, aggregate }),
    [rowField, colField, aggregate],
  );

  const fields: Field[] = ['dept', 'position', 'active'];
  const aggs: PivotAggregate[] = ['sum', 'avg', 'count', 'min', 'max'];

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('피벗', 'Pivot')}</h2>
          <p className="page-desc">
            {t(
              '행·열 필드로 그룹핑하고 값(급여)을 집계하는 교차표. AG-Grid 피벗 형태. (전체 300명)',
              'Cross-tab grouping rows × columns and aggregating a value (salary). AG-Grid-style pivot. (300 people)',
            )}
          </p>
        </div>
      </div>

      <div className="pivot-config">
        <label className="pivot-config__field">
          <span>{t('행', 'Rows')}</span>
          <select value={rowField} onChange={(e) => setRowField(e.target.value as Field)}>
            {fields.map((f) => (
              <option key={f} value={f}>
                {FIELD_LABEL[f][locale]}
              </option>
            ))}
          </select>
        </label>
        <label className="pivot-config__field">
          <span>{t('열', 'Cols')}</span>
          <select value={colField} onChange={(e) => setColField(e.target.value as Field)}>
            {fields.map((f) => (
              <option key={f} value={f}>
                {FIELD_LABEL[f][locale]}
              </option>
            ))}
          </select>
        </label>
        <label className="pivot-config__field">
          <span>{t('집계 (급여)', 'Agg (salary)')}</span>
          <select
            value={aggregate}
            onChange={(e) => setAggregate(e.target.value as PivotAggregate)}
          >
            {aggs.map((a) => (
              <option key={a} value={a}>
                {AGG_LABEL[a][locale]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <PivotTable
        data={data}
        config={config}
        totalLabel={t('합계', 'Total')}
        formatValue={(n) => Math.round(n).toLocaleString()}
      />
    </div>
  );
}
