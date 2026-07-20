# @softium/sheet

A minimal, A1-addressed spreadsheet for React: an editable grid with a no-`eval`
formula engine (`SUM`, `IF`, `VLOOKUP`, `INDEX`/`MATCH`, `COUNTIF`, and more),
relative/absolute references, copy / cut / paste (+ paste-values-only), a fill
handle with series detection, cell formatting (fonts, number formats, borders,
merge), and undo/redo. Token-CSS themed — no Tailwind.

Part of [softium-ui](https://github.com/HOONY-LEE/softium-ui). This is a separate,
positional track from the schema-bound `@softium/table-react` Table/DataGrid.

## Install

```bash
npm i @softium/sheet
```

`react` and `react-dom` (`^18` or `^19`) are peer dependencies.

## Usage

Import the stylesheet once, then render `<Sheet>`:

```tsx
import '@softium/sheet/styles.css';
import { Sheet } from '@softium/sheet';

export function Demo() {
  return (
    <Sheet
      rows={20}
      cols={7}
      initial={{ A1: 'Qty', B1: 'Price', C1: 'Total', C2: '=A2*B2' }}
      onChange={(cells) => console.log(cells)}
    />
  );
}
```

The formula engine (`evaluateCell`, `cellAddr`, `colToIndex`, `indexToCol`) is
also exported if you want to evaluate cells outside the component.

## Theming

Plain CSS custom properties (`--sft-*`). Dark mode via `prefers-color-scheme`
or `<html data-theme="dark">`. The published stylesheet inlines the shared
tokens, so the one import is self-contained.

## License

MIT © Sunghoon Lee
