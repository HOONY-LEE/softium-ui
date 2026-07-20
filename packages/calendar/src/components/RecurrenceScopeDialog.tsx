import { pick } from '../i18n';
import type { DeleteType } from './DeleteOptionsDialog';

export interface RecurrenceScopeDialogProps {
  language: string;
  selectedScope: DeleteType;
  setSelectedScope: (type: DeleteType) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const OPTIONS: { value: DeleteType; ko: string; en: string }[] = [
  { value: 'this', ko: '이 일정만', en: 'This event only' },
  { value: 'following', ko: '이후 모든 일정', en: 'This and following events' },
  { value: 'all', ko: '모든 반복 일정', en: 'All recurring events' },
];

/**
 * RecurrenceScopeDialog — the recurring-event drag-move scope picker (this /
 * this & following / all), shown in a small centered dialog. Same shape as
 * DeleteOptionsDialog but a separate component: the confirm action here is
 * "move" (primary button), not "delete" (danger button), and the two flows
 * are independent enough that sharing one component wasn't worth the prop
 * branching.
 */
export function RecurrenceScopeDialog({
  language,
  selectedScope,
  setSelectedScope,
  onCancel,
  onConfirm,
}: RecurrenceScopeDialogProps) {
  return (
    <div className="sft-cal-overlay" onMouseDown={onCancel}>
      <div
        className="sft-cal-confirm"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sft-cal-confirm__title">
          {pick(language, '반복 일정 이동', 'Move recurring event')}
        </div>
        <div className="sft-cal-confirm__options">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className="sft-cal-delopt sft-cal-delopt--accent"
              data-active={selectedScope === o.value || undefined}
              onClick={() => setSelectedScope(o.value)}
            >
              <span className="sft-cal-delopt__radio" aria-hidden="true" />
              {pick(language, o.ko, o.en)}
            </button>
          ))}
        </div>
        <div className="sft-cal-confirm__actions">
          <button type="button" className="sft-cal-btn sft-cal-btn--outline" onClick={onCancel}>
            {pick(language, '취소', 'Cancel')}
          </button>
          <button type="button" className="sft-cal-btn sft-cal-btn--primary" onClick={onConfirm}>
            {pick(language, '이동', 'Move')}
          </button>
        </div>
      </div>
    </div>
  );
}
