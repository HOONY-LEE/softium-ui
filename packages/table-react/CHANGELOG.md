# @softium/table-react

## 0.1.1

### Patch Changes

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

## 0.1.0

### Minor Changes

- 460185a: First public release readiness: flat CSS bundles with no bare `@import` (work in
  plain `<link>` / non-Vite bundlers), `"use client"` directive for Next.js App
  Router, per-package LICENSE + README, npm metadata (repository/keywords/author),
  and `publishConfig.access: public`.

### Patch Changes

- Updated dependencies [460185a]
  - @softium/table-core@0.1.0
