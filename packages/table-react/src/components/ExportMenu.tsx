import type { ExportFormat } from '@softium/table-core';
import { ChevronDown, Download } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { downloadTableExport } from '../export/download';
import { useTableContext } from './context';

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'csv', label: 'CSV' },
  { format: 'xlsx', label: 'Excel (.xlsx)' },
  { format: 'json', label: 'JSON' },
  { format: 'xml', label: 'XML' },
];

/**
 * ExportMenu — the toolbar's export button: a dropdown of CSV / Excel / JSON /
 * XML, each downloading the current (filtered + sorted) rows. Shown when the
 * table is created with `exportable`.
 */
export function ExportMenu<T>(): ReactNode {
  const { table, messages, exportFileName } = useTableContext<T>();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="sft-export" ref={rootRef}>
      <button
        type="button"
        className="sft-export__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Download size={15} />
        <span>{messages.exportLabel}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="sft-export__menu" role="menu">
          {FORMATS.map(({ format, label }) => (
            <button
              key={format}
              type="button"
              className="sft-export__item"
              role="menuitem"
              onClick={() => {
                downloadTableExport(table, format, { fileName: exportFileName });
                setOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
