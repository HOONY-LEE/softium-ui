# @softium/table-react

React bindings for the softium-ui Table: the `useTable` hook, batteries-included
styled components (`Table`, `DataGrid`, `PivotTable`), a minimal spreadsheet
(`Sheet`), built-in cell renderers, i18n, and export helpers (CSV / Excel / JSON / XML).

Part of [softium-ui](https://github.com/HOONY-LEE/softium-ui) — an ERP-focused
React UI library. Logic/view separation follows TanStack Table, but ships a
ready-to-use styled layer so you skip the headless boilerplate.

## Install

```bash
npm i @softium/table-react @softium/table-styles
```

`react` and `react-dom` (`^18` or `^19`) are peer dependencies.

## Usage

Import the stylesheet once at your app entry, then render:

```tsx
import '@softium/table-styles/styles.css';
import { Table, useTable } from '@softium/table-react';

interface Product {
  id: number;
  name: string;
  price: number;
}

const data: Product[] = [
  { id: 1, name: 'Widget', price: 1200 },
  { id: 2, name: 'Gadget', price: 890 },
];

export function Demo() {
  const table = useTable<Product>({
    data,
    columns: [
      { key: 'name', label: 'Name', flex: 1 },
      { key: 'price', label: 'Price', type: 'number', width: 120 },
    ],
  });
  return <Table table={table} />;
}
```

`Sheet` (spreadsheet with formulas) and `DataGrid` / `PivotTable` are exported
from the same entry. See the repo README for the full component list and the
column-state / adapter model.

## Column menu & filters

Every header carries a "⋮" menu (revealed on hover) with sort, pin, autosize,
hide, and a filter editor picked from the column's `type`:

| `type` | filter editor |
|---|---|
| `select` | checklist of the column's distinct values (searchable past 8) |
| `date` | inclusive from–to range |
| `number` | operator (`=` `≠` `>` `≥` `<` `≤` / between) with one or two operands |
| `boolean` | any / true / false |
| `text`, `custom` | contains / equals / starts with / ends with / blank |

```tsx
columns: [
  { key: 'name', label: 'Name', flex: 1 },
  // a closed value set → checklist filter. `filterOptions` pins the order and
  // the choices; omit it to scan the distinct values out of the data instead.
  { key: 'status', label: 'Status', type: 'select', filterOptions: ['open', 'closed'] },
  { key: 'dueAt', label: 'Due', type: 'date' },
  { key: 'price', label: 'Price', type: 'number' },
  // override the derived editor, or opt a column out entirely
  { key: 'notes', label: 'Notes', filterVariant: 'none' },
]
```

Filters combine with AND across columns and are separate from the toolbar's
global search. A filtered column keeps its trigger lit as a badge.

## Theming

Styles are plain CSS custom properties (`--sft-*`) — no Tailwind. Dark mode
follows `prefers-color-scheme` or an explicit `<html data-theme="dark">`.

## License

MIT © Sunghoon Lee
