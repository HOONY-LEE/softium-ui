# softium-ui

Every softium-ui component in **one install, one stylesheet** — the ERP-focused
React set: `Table` / `DataGrid` / `PivotTable`, `Sheet` (spreadsheet with a
formula engine), `Calendar`, and the app-shell primitives (`AppShell`,
`Button`, `Sidebar`, `ThemeToggle`).

## Install

```bash
npm i softium-ui
```

`react` and `react-dom` (`^18` or `^19`) are peer dependencies.

## Usage

```tsx
import 'softium-ui/styles.css';
import { Table, Sheet, Calendar, Button, useTable } from 'softium-ui';

interface Order {
  id: number;
  item: string;
  amount: number;
}

const data: Order[] = [{ id: 1, item: 'Widget', amount: 1200 }];

export function App() {
  const table = useTable<Order>({
    data,
    columns: [
      { key: 'item', label: 'Item', flex: 1 },
      { key: 'amount', label: 'Amount', type: 'number', width: 120 },
    ],
  });

  return (
    <>
      <Table table={table} />
      <Sheet rows={10} cols={5} initial={{ A1: '10', B1: '=A1*2' }} />
      <Calendar language="en" />
      <Button>Save</Button>
    </>
  );
}
```

One `styles.css` covers every component — the shared design tokens are inlined
once, and the file has no `@import`, so it also works via a plain `<link>`.

## Individual packages

This is a convenience wrapper. Each component also ships on its own if you'd
rather install only what you use:

| Package | Contents |
|---|---|
| [`@softium/table-react`](https://www.npmjs.com/package/@softium/table-react) | Table / DataGrid / PivotTable, `useTable`, cell renderers |
| [`@softium/table-core`](https://www.npmjs.com/package/@softium/table-core) | headless core (no React) |
| [`@softium/sheet`](https://www.npmjs.com/package/@softium/sheet) | spreadsheet + formula engine |
| [`@softium/calendar`](https://www.npmjs.com/package/@softium/calendar) | month / week / day / year calendar |
| [`@softium/ui`](https://www.npmjs.com/package/@softium/ui) | Button, AppShell, Sidebar, ThemeToggle |
| [`@softium/styles`](https://www.npmjs.com/package/@softium/styles) | design tokens + theme |

Subpath entries mirror them if you want a narrower import from this package:

```ts
import { Table } from 'softium-ui/table';
import { Sheet } from 'softium-ui/sheet';
```

### Naming

Two packages export a `Header`, so the app-shell one is re-exported here as
**`AppHeader`** (`@softium/table-react`'s table header keeps the `Header`
name). Import from the individual package if you want the original names.

## Theming

Plain CSS custom properties (`--sft-*`). Dark mode follows
`prefers-color-scheme` or an explicit `<html data-theme="dark">`.

## License

MIT © Sunghoon Lee
