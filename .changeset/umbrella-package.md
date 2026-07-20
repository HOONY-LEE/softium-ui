---
"softium-ui": minor
"@softium/table-styles": minor
"@softium/table-react": patch
---

Add `softium-ui`, an all-in-one package: one install and one stylesheet for
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
