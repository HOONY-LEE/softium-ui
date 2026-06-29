import { Columns3, Settings2, SlidersHorizontal } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { ColumnEditor } from './ColumnEditor';
import { type TableSettings, useTableContext } from './context';

type Popup = 'columns' | 'table' | null;

/**
 * Settings — the footer gear. Opens a context menu (Edit columns / Edit table);
 * each item opens a popover for editing columns or the table's display settings.
 */
export function Settings<T>(): ReactNode {
  const { messages, settings, setSetting } = useTableContext<T>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [popup, setPopup] = useState<Popup>(null);

  const close = () => {
    setMenuOpen(false);
    setPopup(null);
  };

  const toggles: { key: keyof TableSettings; label: string }[] = [
    { key: 'rowBorders', label: messages.settingRowBorders },
    { key: 'columnBorders', label: messages.settingColumnBorders },
    { key: 'striped', label: messages.settingStriped },
    { key: 'scrollX', label: messages.settingScrollX },
    { key: 'stickyHeader', label: messages.settingStickyHeader },
  ];

  return (
    <div className="sft-settings">
      <button
        type="button"
        className="sft-settings__trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen || popup !== null}
        title={messages.settings}
        onClick={() => {
          setPopup(null);
          setMenuOpen((v) => !v);
        }}
      >
        <Settings2 size={16} />
      </button>

      {(menuOpen || popup) && (
        <button
          type="button"
          className="sft-settings__backdrop"
          aria-label="close"
          onClick={close}
        />
      )}

      {menuOpen && (
        <div className="sft-settings__menu" role="menu">
          <button
            type="button"
            className="sft-settings__item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setPopup('columns');
            }}
          >
            <Columns3 size={15} />
            {messages.editColumns}
          </button>
          <button
            type="button"
            className="sft-settings__item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setPopup('table');
            }}
          >
            <SlidersHorizontal size={15} />
            {messages.editTable}
          </button>
        </div>
      )}

      {popup === 'columns' && (
        <div className="sft-settings__popover" role="dialog" aria-label={messages.editColumns}>
          <div className="sft-settings__popover-title">{messages.editColumns}</div>
          <ColumnEditor />
        </div>
      )}

      {popup === 'table' && (
        <div className="sft-settings__popover" role="dialog" aria-label={messages.editTable}>
          <div className="sft-settings__popover-title">{messages.editTable}</div>
          <div className="sft-settings__toggles">
            {toggles.map((tg) => (
              <label className="sft-setrow" key={tg.key}>
                <span className="sft-setrow__label">{tg.label}</span>
                <input
                  type="checkbox"
                  checked={settings[tg.key]}
                  onChange={(e) => setSetting(tg.key, e.target.checked)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
