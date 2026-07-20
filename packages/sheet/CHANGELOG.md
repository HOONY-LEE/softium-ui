# @softium/sheet

## 0.2.0

### Minor Changes

- 7a80d5f: Add `Workbook`: a Google-Sheets-style tab bar over multiple `Sheet` grids —
  tabs along the bottom, a `+` on the right to append, double-click (or
  Enter/F2) on a tab to rename, and an `×` on the active tab to delete (blocked
  when one sheet remains).

  Inactive sheets stay mounted and are hidden with CSS instead of being
  unmounted, so each grid keeps its own values, formats, column sizes and
  undo/redo history across tab switches.

## 0.1.0

### Minor Changes

- 460185a: First public release readiness: flat CSS bundles with no bare `@import` (work in
  plain `<link>` / non-Vite bundlers), `"use client"` directive for Next.js App
  Router, per-package LICENSE + README, npm metadata (repository/keywords/author),
  and `publishConfig.access: public`.

### Patch Changes

- Updated dependencies [460185a]
  - @softium/styles@0.1.0
