# softium-ui

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
