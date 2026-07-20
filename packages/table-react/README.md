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
import '@softium/table-styles';
import { Table, useTable } from '@softium/table-react';

const data = [
  { id: 1, name: 'Widget', price: 1200 },
  { id: 2, name: 'Gadget', price: 890 },
];

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price', align: 'right' },
];

export function Demo() {
  const table = useTable({ data, columns });
  return <Table instance={table} />;
}
```

`Sheet` (spreadsheet with formulas) and `DataGrid` / `PivotTable` are exported
from the same entry. See the repo README for the full component list and the
column-state / adapter model.

## Theming

Styles are plain CSS custom properties (`--sft-*`) — no Tailwind. Dark mode
follows `prefers-color-scheme` or an explicit `<html data-theme="dark">`.

## License

MIT © Sunghoon Lee
