import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Sheet } from './Sheet';

let idSeq = 0;
const uid = () => `sheet-${(idSeq++).toString(36)}`;

interface WorkbookSheet {
  id: string;
  name: string;
  /** seed values, applied once when the sheet first mounts */
  initial?: Record<string, string>;
}

export interface WorkbookProps {
  /** initial tabs; defaults to a single "Sheet1" */
  initialSheets?: { name?: string; initial?: Record<string, string> }[];
  /** row count for every sheet (each can still grow via its own "+") */
  rows?: number;
  /** column count for every sheet */
  cols?: number;
  /** fires whenever any sheet's cells change, tagged with which sheet */
  onChange?: (sheetId: string, cells: Record<string, string>) => void;
  className?: string;
}

/** "Sheet1", "Sheet2", … skipping names already taken */
function nextSheetName(existing: WorkbookSheet[]): string {
  const taken = new Set(existing.map((s) => s.name));
  for (let i = existing.length + 1; ; i++) {
    const name = `Sheet${i}`;
    if (!taken.has(name)) return name;
  }
}

/**
 * Workbook — a Google-Sheets-style tab bar over multiple `Sheet` grids: a tab
 * strip along the bottom, a "+" to append, and double-click (or Enter/F2) on a
 * tab to rename it.
 *
 * Every sheet stays mounted and inactive ones are hidden with CSS rather than
 * unmounted. That keeps each grid's own state — values, formats, column sizes
 * and undo/redo history — alive across tab switches without lifting Sheet's
 * whole document into this component. The trade-off is that all sheets hold
 * DOM; fine for the handful of tabs a workbook realistically has, and worth
 * revisiting (unmount + restore a serialized doc) if that ever changes.
 */
export function Workbook({ initialSheets, rows, cols, onChange, className }: WorkbookProps) {
  const [sheets, setSheets] = useState<WorkbookSheet[]>(() =>
    (initialSheets?.length ? initialSheets : [{}]).map((s, i) => ({
      id: uid(),
      name: s.name ?? `Sheet${i + 1}`,
      initial: s.initial,
    })),
  );
  const [activeId, setActiveId] = useState(() => sheets[0]?.id ?? '');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const tabStripRef = useRef<HTMLDivElement | null>(null);

  // select the freshly-typed text as soon as the rename editor mounts
  useEffect(() => {
    if (!renamingId) return;
    renameInputRef.current?.select();
  }, [renamingId]);

  const addSheet = () => {
    const sheet: WorkbookSheet = { id: uid(), name: nextSheetName(sheets) };
    setSheets((prev) => [...prev, sheet]);
    setActiveId(sheet.id);
    // a newly appended tab can sit past the strip's right edge
    requestAnimationFrame(() => {
      const strip = tabStripRef.current;
      if (strip) strip.scrollLeft = strip.scrollWidth;
    });
  };

  const removeSheet = (id: string) => {
    if (sheets.length <= 1) return; // a workbook always keeps one sheet
    const index = sheets.findIndex((s) => s.id === id);
    const next = sheets.filter((s) => s.id !== id);
    setSheets(next);
    if (activeId === id) {
      // fall back to the neighbour on the left, else the new first tab
      setActiveId((next[Math.max(0, index - 1)] ?? next[0])?.id ?? '');
    }
  };

  const startRename = (sheet: WorkbookSheet) => {
    setDraftName(sheet.name);
    setRenamingId(sheet.id);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const name = draftName.trim();
    // an empty name would leave an unclickable tab — keep the previous one
    if (name) setSheets((prev) => prev.map((s) => (s.id === renamingId ? { ...s, name } : s)));
    setRenamingId(null);
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, sheet: WorkbookSheet) => {
    if (e.key === 'F2' || e.key === 'Enter') {
      e.preventDefault();
      startRename(sheet);
    }
  };

  return (
    <div className={className ? `sft-sheet-wb ${className}` : 'sft-sheet-wb'}>
      <div className="sft-sheet-wb__panels">
        {sheets.map((sheet) => (
          <div
            key={sheet.id}
            className="sft-sheet-wb__panel"
            data-active={sheet.id === activeId || undefined}
            role="tabpanel"
            aria-label={sheet.name}
          >
            <Sheet
              rows={rows}
              cols={cols}
              initial={sheet.initial}
              onChange={onChange ? (cells) => onChange(sheet.id, cells) : undefined}
            />
          </div>
        ))}
      </div>

      <div className="sft-sheet-wb__tabbar">
        <div className="sft-sheet-wb__tabs" role="tablist" aria-label="시트 목록" ref={tabStripRef}>
          {sheets.map((sheet) => {
            const active = sheet.id === activeId;
            if (renamingId === sheet.id) {
              return (
                <input
                  key={sheet.id}
                  ref={renameInputRef}
                  className="sft-sheet-wb__rename"
                  value={draftName}
                  aria-label="시트 이름"
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setRenamingId(null);
                    }
                  }}
                />
              );
            }
            return (
              <div className="sft-sheet-wb__tabwrap" key={sheet.id}>
                <button
                  type="button"
                  className="sft-sheet-wb__tab"
                  data-active={active || undefined}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveId(sheet.id)}
                  onDoubleClick={() => startRename(sheet)}
                  onKeyDown={(e) => onTabKeyDown(e, sheet)}
                  title={`${sheet.name} — 더블클릭하면 이름 변경`}
                >
                  {sheet.name}
                </button>
                {active && sheets.length > 1 && (
                  <button
                    type="button"
                    className="sft-sheet-wb__close"
                    aria-label={`${sheet.name} 삭제`}
                    title="시트 삭제"
                    onClick={() => removeSheet(sheet.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="sft-sheet-wb__add"
          onClick={addSheet}
          aria-label="시트 추가"
          title="시트 추가"
        >
          +
        </button>
      </div>
    </div>
  );
}
