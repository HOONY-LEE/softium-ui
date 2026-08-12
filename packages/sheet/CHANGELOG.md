# @softium/sheet

## 0.3.0

### Minor Changes

- a242161: The formatting toolbar no longer wraps to a second row when space runs out.
  It now collapses Google-Sheets style: groups that don't fit are moved into a
  trailing "⋮" button that opens them in a popover.

  Group widths are probed from an out-of-flow hidden copy rather than the live
  bar, because the bar's own content would otherwise widen the shrink-wrapping
  wrapper and feed an inflated width back into the fit calculation. That also
  keeps the bar at `overflow: visible`, so the group dropdowns (number format,
  borders, Σ …) still hang below it instead of being clipped.

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
