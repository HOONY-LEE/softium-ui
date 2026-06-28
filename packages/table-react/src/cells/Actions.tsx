import { type ReactNode, useState } from 'react';

export interface ActionItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  /** danger styling (e.g. delete) */
  danger?: boolean;
  onClick: () => void;
}

export interface ActionsProps {
  /** shown inline as icon buttons (e.g. edit / delete) */
  inline?: ActionItem[];
  /** collapsed under a ⋯ (kebab) menu */
  menu?: ActionItem[];
  /** kebab trigger label. Default '⋯'. */
  kebabLabel?: ReactNode;
}

/** Actions — row action buttons: inline icon buttons and/or a ⋯ overflow menu. */
export function Actions({ inline = [], menu = [], kebabLabel = '⋯' }: ActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="sft-actions">
      {inline.map((a) => (
        <button
          type="button"
          key={a.key}
          className="sft-actions__btn"
          data-danger={a.danger || undefined}
          title={typeof a.label === 'string' ? a.label : undefined}
          onClick={a.onClick}
        >
          {a.icon ?? a.label}
        </button>
      ))}

      {menu.length > 0 && (
        <span className="sft-actions__kebab-wrap">
          <button
            type="button"
            className="sft-actions__btn"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {kebabLabel}
          </button>
          {open && (
            <>
              <button
                type="button"
                className="sft-actions__backdrop"
                aria-label="close menu"
                onClick={() => setOpen(false)}
              />
              <span className="sft-actions__menu" role="menu">
                {menu.map((a) => (
                  <button
                    type="button"
                    key={a.key}
                    className="sft-actions__menu-item"
                    role="menuitem"
                    data-danger={a.danger || undefined}
                    onClick={() => {
                      setOpen(false);
                      a.onClick();
                    }}
                  >
                    {a.icon != null && <span className="sft-actions__menu-icon">{a.icon}</span>}
                    {a.label}
                  </button>
                ))}
              </span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
