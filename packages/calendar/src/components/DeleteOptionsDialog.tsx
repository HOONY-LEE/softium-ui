import { pick } from '../i18n';

export type DeleteType = 'this' | 'following' | 'all';

export interface DeleteOptionsDialogProps {
  language: string;
  selectedDeleteType: DeleteType;
  setSelectedDeleteType: (type: DeleteType) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const OPTIONS: { value: DeleteType; ko: string; en: string }[] = [
  { value: 'this', ko: '이 일정만', en: 'This event only' },
  { value: 'following', ko: '이후 모든 일정', en: 'This and following events' },
  { value: 'all', ko: '모든 반복 일정', en: 'All recurring events' },
];

/**
 * DeleteOptionsDialog — the recurring-event delete scope picker (this / this &
 * following / all), shown in a small centered dialog. Ported from calendary.
 */
export function DeleteOptionsDialog({
  language,
  selectedDeleteType,
  setSelectedDeleteType,
  onCancel,
  onDelete,
}: DeleteOptionsDialogProps) {
  return (
    <div className="sft-cal-overlay" onMouseDown={onCancel}>
      <div
        className="sft-cal-confirm"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sft-cal-confirm__title">
          {pick(language, '반복 일정 삭제', 'Delete recurring event')}
        </div>
        <div className="sft-cal-confirm__options">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className="sft-cal-delopt"
              data-active={selectedDeleteType === o.value || undefined}
              onClick={() => setSelectedDeleteType(o.value)}
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
          <button type="button" className="sft-cal-btn sft-cal-btn--danger" onClick={onDelete}>
            {pick(language, '삭제', 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
