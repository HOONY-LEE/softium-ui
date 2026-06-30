import { type PivotConfig, pivot } from '@softium/table-core';
import { type ReactNode, useMemo } from 'react';

export interface PivotTableProps<T> {
  data: T[];
  config: PivotConfig<T>;
  /** format an aggregated number for display. Default toLocaleString. */
  formatValue?: (n: number) => string;
  /** label for the totals row/column. Default '합계'. */
  totalLabel?: string;
  /** placeholder for empty cells. Default '–'. */
  emptyText?: string;
  className?: string;
}

/**
 * PivotTable — AG-Grid-style cross-tab. Groups rows × columns and aggregates a
 * value field (sum/count/avg/min/max) with row, column, and grand totals. Pure
 * derivation via `pivot()`; the original data is never mutated.
 */
export function PivotTable<T>({
  data,
  config,
  formatValue = (n) => n.toLocaleString(),
  totalLabel = '합계',
  emptyText = '–',
  className,
}: PivotTableProps<T>): ReactNode {
  const p = useMemo(() => pivot(data, config), [data, config]);
  const fmt = (n: number | null) => (n == null ? emptyText : formatValue(n));
  const rowLabel = p.rowFields.join(' / ');
  const colLabel = p.columnFields.join(' / ');

  return (
    <div className={className ? `sft-pivot ${className}` : 'sft-pivot'}>
      <table className="sft-pivot__table">
        <thead>
          <tr>
            <th className="sft-pivot__corner" scope="col">
              <span className="sft-pivot__rowfield">{rowLabel}</span>
              <span className="sft-pivot__colfield">{colLabel}</span>
            </th>
            {p.columnKeys.map((c) => (
              <th className="sft-pivot__colhead" scope="col" key={c.join(' ')}>
                {c.join(' / ')}
              </th>
            ))}
            <th className="sft-pivot__colhead sft-pivot__total" scope="col">
              {totalLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {p.rowKeys.map((r, ri) => (
            <tr key={r.join(' ')}>
              <th className="sft-pivot__rowhead" scope="row">
                {r.join(' / ')}
              </th>
              {p.columnKeys.map((c, ci) => (
                <td className="sft-pivot__cell" key={c.join(' ')}>
                  {fmt(p.values[ri]?.[ci] ?? null)}
                </td>
              ))}
              <td className="sft-pivot__cell sft-pivot__total">{fmt(p.rowTotals[ri] ?? null)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="sft-pivot__rowhead sft-pivot__total" scope="row">
              {totalLabel}
            </th>
            {p.columnTotals.map((ct, ci) => (
              <td
                className="sft-pivot__cell sft-pivot__total"
                // biome-ignore lint/suspicious/noArrayIndexKey: column totals align to columnKeys order
                key={ci}
              >
                {fmt(ct)}
              </td>
            ))}
            <td className="sft-pivot__cell sft-pivot__total sft-pivot__grand">
              {fmt(p.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
