# softium-ui

## 0.2.0

### Minor Changes

- 1a11a78: Add an ag-Grid-style per-column header menu with type-aware filtering.

  Hovering a column header reveals a "⋮" trigger; clicking it opens a menu with sort
  (asc / desc / clear), pin (left / right / none), autosize (this column / all
  columns), hide column, and reset columns — plus a filter editor chosen from the
  column's type:

  - `select` → a checklist of the column's distinct values (searchable past 8 options)
  - `date` → an inclusive from–to range
  - `number` → an operator (= ≠ > ≥ < ≤ / between) with one or two operands
  - `boolean` → any / true / false
  - everything else → contains / equals / starts with / ends with / blank

  Override per column with `filterVariant`, and supply an explicit choice list with
  `filterOptions`. A filtered column keeps its trigger lit as a badge.

  New core exports: `FilterVariant`, `defaultFilterVariant`, `getDistinctValues`, and
  the `startsWith` / `endsWith` / `blank` / `notBlank` filter operators.

  **Fix:** comparison operators (`gt`/`gte`/`lt`/`lte`/`between`/`eq`) coerced values
  with `Number()`, so on a `date` column an ISO string like `"2024-03-15"` became
  `NaN` and every date range matched nothing. Date columns now compare by calendar
  day, and a `Date` object and its ISO string compare equal with no timezone drift.

  **Breaking (UI):** clicking a column header no longer sorts — sorting moved into
  the "⋮" menu, so a stray click on a header can't silently reorder the table. The
  header label now only drags to reorder. This also retires shift-click multi-sort;
  `table.toggleSort(key, true)` and `table.setSortRules([...])` still build
  multi-column sorts programmatically, and the priority superscript still renders
  for them.

### Patch Changes

- Updated dependencies [1a11a78]
  - @softium/table-core@0.2.0
  - @softium/table-react@0.2.0
  - @softium/table-styles@0.3.0

## 0.1.3

### Patch Changes

- b88cd32: Add npm version + license badges to the package READMEs so the npm page shows
  the current version and license at a glance.
- Updated dependencies [b88cd32]
  - @softium/sheet@0.3.1

## 0.1.2

### Patch Changes

- Updated dependencies [a242161]
  - @softium/sheet@0.3.0

## 0.1.1

### Patch Changes

- 7a80d5f: Add `Workbook`: a Google-Sheets-style tab bar over multiple `Sheet` grids —
  tabs along the bottom, a `+` on the right to append, double-click (or
  Enter/F2) on a tab to rename, and an `×` on the active tab to delete (blocked
  when one sheet remains).

  Inactive sheets stay mounted and are hidden with CSS instead of being
  unmounted, so each grid keeps its own values, formats, column sizes and
  undo/redo history across tab switches.

- Updated dependencies [7a80d5f]
  - @softium/sheet@0.2.0

## 0.1.0

### Minor Changes

- 8bf27bb: Add `softium-ui`, an all-in-one package: one install and one stylesheet for
  Table/DataGrid, Sheet, Calendar and the app-shell primitives. It re-exports the
  individual `@softium/*` packages (which remain published separately), resolving
  the `Header` clash by exposing the app-shell one as `AppHeader`, and ships a
  single flat CSS that inlines the design tokens only once (~18 KB smaller than
  importing each package's stylesheet).

  `@softium/table-styles` also gains a `./styles.css` subpath export. Importing
  the bare package specifier resolves to CSS, which TypeScript cannot type
  (`TS2882`); the `.css` subpath is covered by standard bundler ambient types.
  The table README's usage example is corrected too — the prop is `table=`, not
  `instance=`.

### Patch Changes

- Updated dependencies [8bf27bb]
  - @softium/table-styles@0.2.0
  - @softium/table-react@0.1.1
