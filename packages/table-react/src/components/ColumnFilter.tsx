/**
 * Per-column filter editors, tailored to the column's `filterVariant`:
 *
 *   set     — enum checklist of the column's distinct values (`in`)
 *   date    — an inclusive from–to calendar range (`between` / `gte` / `lte`)
 *   number  — an operator plus one or two numeric operands
 *   boolean — any / true / false
 *   text    — an operator plus a text operand
 *
 * Each editor writes a single structured `Filter` for its column through
 * `table.setColumnFilter`, and clears it (null) when the input goes empty — so an
 * untouched editor never contributes a filter.
 */

import { type Filter, type FilterOperator, getDistinctValues } from '@softium/table-core';
import { Search } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import type { TableMessages } from '../i18n';
import type { ResolvedReactColumn } from '../types';
import { useTableContext } from './context';

export interface ColumnFilterProps<T> {
  column: ResolvedReactColumn<T>;
}

type Emit = (filter: Filter | null) => void;

interface EditorProps<T> {
  column: ResolvedReactColumn<T>;
  current: Filter | null;
  emit: Emit;
  messages: TableMessages;
}

export function ColumnFilter<T>({ column }: ColumnFilterProps<T>): ReactNode {
  const { table, messages } = useTableContext<T>();
  const current = table.getFilters().find((f) => f.columnKey === column.key) ?? null;
  const emit: Emit = (filter) => table.setColumnFilter(column.key, filter);
  const props = { column, current, emit, messages };

  switch (column.filterVariant) {
    case 'set':
      return <SetFilter {...props} data={table.data} />;
    case 'date':
      return <DateFilter {...props} />;
    case 'number':
      return <NumberFilter {...props} />;
    case 'boolean':
      return <BooleanFilter {...props} />;
    case 'none':
      return null;
    default:
      return <TextFilter {...props} />;
  }
}

// ── set (enum checklist) ────────────────────────────────────────────
/** above this many options the editor grows a search box */
const SEARCHABLE_AT = 8;

function SetFilter<T>({
  column,
  current,
  emit,
  messages,
  data,
}: EditorProps<T> & { data: T[] }): ReactNode {
  const options = useMemo(
    () => (column.filterOptions ? [...column.filterOptions] : getDistinctValues(data, column.key)),
    [column.filterOptions, column.key, data],
  );
  const [query, setQuery] = useState('');

  // no filter ⇒ everything is (implicitly) selected
  const selected = useMemo(() => {
    if (current?.operator === 'in' && Array.isArray(current.value)) {
      return new Set(current.value.map((v) => String(v)));
    }
    return new Set(options);
  }, [current, options]);

  const shown = useMemo(() => {
    if (!query) return options;
    const q = query.toLocaleLowerCase();
    return options.filter((o) => o.toLocaleLowerCase().includes(q));
  }, [options, query]);

  /** selecting every option means "no constraint", so store no filter at all */
  function commit(next: Set<string>) {
    if (next.size === options.length) emit(null);
    else emit({ columnKey: column.key, operator: 'in', value: [...next] });
  }

  function toggle(option: string) {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    commit(next);
  }

  // the header checkbox acts on what's currently listed (i.e. the search results)
  const shownAllSelected = shown.length > 0 && shown.every((o) => selected.has(o));
  function toggleShown() {
    const next = new Set(selected);
    for (const o of shown) {
      if (shownAllSelected) next.delete(o);
      else next.add(o);
    }
    commit(next);
  }

  return (
    <div className="sft-colfilter">
      {options.length > SEARCHABLE_AT && (
        <div className="sft-colfilter__search">
          <Search size={13} aria-hidden="true" />
          <input
            type="text"
            value={query}
            placeholder={messages.filterSearchPlaceholder}
            aria-label={messages.filterSearchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="sft-colfilter__empty">{messages.noMatches}</div>
      ) : (
        <div className="sft-colfilter__options">
          <label className="sft-colfilter__option sft-colfilter__option--all">
            <input type="checkbox" checked={shownAllSelected} onChange={toggleShown} />
            <span>{messages.selectAll}</span>
          </label>
          {shown.map((option) => (
            <label className="sft-colfilter__option" key={option}>
              <input
                type="checkbox"
                checked={selected.has(option)}
                onChange={() => toggle(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── date range ──────────────────────────────────────────────────────
function DateFilter<T>({ column, current, emit, messages }: EditorProps<T>): ReactNode {
  const asText = (v: unknown) => (typeof v === 'string' ? v : '');
  const [from, setFrom] = useState(() => {
    if (current?.operator === 'between' || current?.operator === 'gte') {
      return asText(current.value);
    }
    return '';
  });
  const [to, setTo] = useState(() => {
    if (current?.operator === 'between') return asText(current.value2);
    if (current?.operator === 'lte') return asText(current.value);
    return '';
  });

  /** both bounds → between; one bound → an open-ended comparison; neither → cleared */
  function commit(nextFrom: string, nextTo: string) {
    if (nextFrom && nextTo) {
      emit({ columnKey: column.key, operator: 'between', value: nextFrom, value2: nextTo });
    } else if (nextFrom) {
      emit({ columnKey: column.key, operator: 'gte', value: nextFrom });
    } else if (nextTo) {
      emit({ columnKey: column.key, operator: 'lte', value: nextTo });
    } else {
      emit(null);
    }
  }

  return (
    <div className="sft-colfilter">
      <label className="sft-colfilter__field">
        <span className="sft-colfilter__field-label">{messages.filterFrom}</span>
        <input
          type="date"
          className="sft-colfilter__input"
          value={from}
          max={to || undefined}
          onChange={(e) => {
            setFrom(e.target.value);
            commit(e.target.value, to);
          }}
        />
      </label>
      <label className="sft-colfilter__field">
        <span className="sft-colfilter__field-label">{messages.filterTo}</span>
        <input
          type="date"
          className="sft-colfilter__input"
          value={to}
          min={from || undefined}
          onChange={(e) => {
            setTo(e.target.value);
            commit(from, e.target.value);
          }}
        />
      </label>
    </div>
  );
}

// ── number ──────────────────────────────────────────────────────────
const NUMBER_OPS: FilterOperator[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'];

function NumberFilter<T>({ column, current, emit, messages }: EditorProps<T>): ReactNode {
  const asText = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const [op, setOp] = useState<FilterOperator>(() =>
    current && NUMBER_OPS.includes(current.operator) ? current.operator : 'eq',
  );
  const [value, setValue] = useState(() => asText(current?.value));
  const [value2, setValue2] = useState(() => asText(current?.value2));

  function commit(nextOp: FilterOperator, a: string, b: string) {
    if (a === '' || (nextOp === 'between' && b === '')) {
      emit(null);
      return;
    }
    emit(
      nextOp === 'between'
        ? { columnKey: column.key, operator: 'between', value: Number(a), value2: Number(b) }
        : { columnKey: column.key, operator: nextOp, value: Number(a) },
    );
  }

  return (
    <div className="sft-colfilter">
      <select
        className="sft-colfilter__op"
        value={op}
        aria-label={messages.filterLabel}
        onChange={(e) => {
          const next = e.target.value as FilterOperator;
          setOp(next);
          commit(next, value, value2);
        }}
      >
        {NUMBER_OPS.map((o) => (
          <option value={o} key={o}>
            {operatorLabel(o, messages)}
          </option>
        ))}
      </select>
      <input
        type="number"
        className="sft-colfilter__input"
        value={value}
        // a range's first operand is its lower bound, not a bare "value"
        placeholder={op === 'between' ? messages.filterMin : messages.filterValuePlaceholder}
        aria-label={op === 'between' ? messages.filterMin : messages.filterValuePlaceholder}
        onChange={(e) => {
          setValue(e.target.value);
          commit(op, e.target.value, value2);
        }}
      />
      {op === 'between' && (
        <input
          type="number"
          className="sft-colfilter__input"
          value={value2}
          placeholder={messages.filterMax}
          aria-label={messages.filterMax}
          onChange={(e) => {
            setValue2(e.target.value);
            commit(op, value, e.target.value);
          }}
        />
      )}
    </div>
  );
}

// ── boolean ─────────────────────────────────────────────────────────
function BooleanFilter<T>({ column, current, emit, messages }: EditorProps<T>): ReactNode {
  const active = current?.operator === 'eq' ? String(current.value) : 'any';
  const choices: { key: string; label: string }[] = [
    { key: 'any', label: messages.filterAny },
    { key: 'true', label: messages.filterTrue },
    { key: 'false', label: messages.filterFalse },
  ];

  return (
    <div className="sft-colfilter">
      <div className="sft-seg sft-colfilter__seg">
        {choices.map((c) => (
          <button
            type="button"
            key={c.key}
            className="sft-seg__btn"
            data-active={active === c.key || undefined}
            onClick={() =>
              emit(
                c.key === 'any'
                  ? null
                  : { columnKey: column.key, operator: 'eq', value: c.key === 'true' },
              )
            }
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── text ────────────────────────────────────────────────────────────
const TEXT_OPS: FilterOperator[] = [
  'contains',
  'eq',
  'neq',
  'startsWith',
  'endsWith',
  'blank',
  'notBlank',
];

/** operators that stand alone — they take no operand */
const UNARY_OPS = new Set<FilterOperator>(['blank', 'notBlank']);

function TextFilter<T>({ column, current, emit, messages }: EditorProps<T>): ReactNode {
  const [op, setOp] = useState<FilterOperator>(() =>
    current && TEXT_OPS.includes(current.operator) ? current.operator : 'contains',
  );
  const [value, setValue] = useState(() =>
    typeof current?.value === 'string' ? current.value : '',
  );

  function commit(nextOp: FilterOperator, nextValue: string) {
    if (UNARY_OPS.has(nextOp)) {
      emit({ columnKey: column.key, operator: nextOp, value: null });
      return;
    }
    emit(nextValue === '' ? null : { columnKey: column.key, operator: nextOp, value: nextValue });
  }

  return (
    <div className="sft-colfilter">
      <select
        className="sft-colfilter__op"
        value={op}
        aria-label={messages.filterLabel}
        onChange={(e) => {
          const next = e.target.value as FilterOperator;
          setOp(next);
          commit(next, value);
        }}
      >
        {TEXT_OPS.map((o) => (
          <option value={o} key={o}>
            {operatorLabel(o, messages)}
          </option>
        ))}
      </select>
      {!UNARY_OPS.has(op) && (
        <input
          type="text"
          className="sft-colfilter__input"
          value={value}
          placeholder={messages.filterValuePlaceholder}
          aria-label={messages.filterValuePlaceholder}
          onChange={(e) => {
            setValue(e.target.value);
            commit(op, e.target.value);
          }}
        />
      )}
    </div>
  );
}

function operatorLabel(op: FilterOperator, m: TableMessages): string {
  switch (op) {
    case 'contains':
      return m.opContains;
    case 'eq':
      return m.opEquals;
    case 'neq':
      return m.opNotEquals;
    case 'startsWith':
      return m.opStartsWith;
    case 'endsWith':
      return m.opEndsWith;
    case 'blank':
      return m.opBlank;
    case 'notBlank':
      return m.opNotBlank;
    case 'gt':
      return m.opGt;
    case 'gte':
      return m.opGte;
    case 'lt':
      return m.opLt;
    case 'lte':
      return m.opLte;
    case 'between':
      return m.opBetween;
    default:
      return op;
  }
}
