import { pick } from '../i18n';
import type { RecurrenceFreq } from '../types';
import { SegmentTabs } from './SegmentTabs';

export type RecurrenceEndType = 'never' | 'date' | 'count';

export interface RecurrenceSectionProps {
  language: string;
  recurrenceFreq: RecurrenceFreq;
  setRecurrenceFreq: (freq: RecurrenceFreq) => void;
  /** weekdays as Mon=0 … Sun=6 */
  selectedWeekdays: number[];
  setSelectedWeekdays: (weekdays: number[]) => void;
  recurrenceEndType: RecurrenceEndType;
  setRecurrenceEndType: (type: RecurrenceEndType) => void;
  recurrenceCount: string | number;
  setRecurrenceCount: (count: string | number) => void;
  recurrenceEndDate: Date | undefined;
  setRecurrenceEndDate: (date: Date | undefined) => void;
  internalStartDate: Date | undefined;
}

const WEEKDAYS: { value: number; ko: string; en: string }[] = [
  { value: 0, ko: '월', en: 'M' },
  { value: 1, ko: '화', en: 'T' },
  { value: 2, ko: '수', en: 'W' },
  { value: 3, ko: '목', en: 'T' },
  { value: 4, ko: '금', en: 'F' },
  { value: 5, ko: '토', en: 'S' },
  { value: 6, ko: '일', en: 'S' },
];

/**
 * RecurrenceSection — frequency segmented tabs, a weekly weekday picker, and an
 * end-condition selector (never / date / count). Ported from calendary. Fully
 * controlled; all state lives in the parent event modal.
 */
export function RecurrenceSection({
  language,
  recurrenceFreq,
  setRecurrenceFreq,
  selectedWeekdays,
  setSelectedWeekdays,
  recurrenceEndType,
  setRecurrenceEndType,
  recurrenceCount,
  setRecurrenceCount,
  setRecurrenceEndDate,
  internalStartDate,
}: RecurrenceSectionProps) {
  const toggleWeekday = (value: number) => {
    if (selectedWeekdays.includes(value)) {
      setSelectedWeekdays(selectedWeekdays.filter((d) => d !== value));
    } else {
      setSelectedWeekdays([...selectedWeekdays, value].sort((a, b) => a - b));
    }
  };

  const onEndTypeChange = (type: RecurrenceEndType) => {
    setRecurrenceEndType(type);
    if (type === 'date' && internalStartDate) {
      const oneYearLater = new Date(internalStartDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      setRecurrenceEndDate(oneYearLater);
    }
  };

  return (
    <div className="sft-cal-recur">
      <SegmentTabs
        block
        value={recurrenceFreq}
        onValueChange={(v) => setRecurrenceFreq(v as RecurrenceFreq)}
        options={[
          { value: 'DAILY', label: pick(language, '매일', 'Daily') },
          { value: 'WEEKLY', label: pick(language, '매주', 'Weekly') },
          { value: 'MONTHLY', label: pick(language, '매월', 'Monthly') },
          { value: 'YEARLY', label: pick(language, '매년', 'Yearly') },
        ]}
      />

      {recurrenceFreq === 'WEEKLY' && (
        <div className="sft-cal-recur__block">
          <div className="sft-cal-label">{pick(language, '반복 요일', 'Repeat on')}</div>
          <div className="sft-cal-recur__weekdays">
            {WEEKDAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                className="sft-cal-recur__weekday"
                data-active={selectedWeekdays.includes(d.value) || undefined}
                onClick={() => toggleWeekday(d.value)}
              >
                {pick(language, d.ko, d.en)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sft-cal-recur__block">
        <div className="sft-cal-label">{pick(language, '종료', 'Ends')}</div>
        <div className="sft-cal-recur__end">
          <SegmentTabs
            block
            value={recurrenceEndType}
            onValueChange={(v) => onEndTypeChange(v as RecurrenceEndType)}
            options={[
              { value: 'never', label: pick(language, '없음', 'Never') },
              { value: 'date', label: pick(language, '날짜', 'Date') },
              { value: 'count', label: pick(language, '횟수', 'Count') },
            ]}
          />
          <div className="sft-cal-recur__count">
            {recurrenceEndType === 'count' && (
              <>
                <input
                  className="sft-cal-input sft-cal-recur__count-input"
                  type="text"
                  inputMode="numeric"
                  value={String(recurrenceCount)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') setRecurrenceCount('');
                    else if (/^[1-9]\d*$/.test(v)) setRecurrenceCount(Number.parseInt(v, 10));
                  }}
                  onBlur={() => {
                    const n = Number(recurrenceCount);
                    if (recurrenceCount === '' || n < 1) setRecurrenceCount(1);
                  }}
                />
                <span className="sft-cal-recur__count-unit">{pick(language, '회', 'times')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
