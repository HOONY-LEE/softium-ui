# @softium/table-styles

Component stylesheet for the softium-ui Table / DataGrid / Sheet. Built on the
shared `@softium/styles` tokens (inlined), with dark mode and responsive rules.
No JavaScript.

Part of [softium-ui](https://github.com/HOONY-LEE/softium-ui). Pairs with
[`@softium/table-react`](https://github.com/HOONY-LEE/softium-ui/tree/main/packages/table-react).

## Install

```bash
npm i @softium/table-styles
```

## Usage

Import once at your app entry:

```ts
import '@softium/table-styles/styles.css';
```

> Prefer the `/styles.css` subpath. The bare `import '@softium/table-styles'`
> also works at runtime, but TypeScript can't type a bare specifier that
> resolves to CSS (`TS2882`), whereas `*.css` is covered by the standard
> bundler ambient types (e.g. `vite/client`).

The published entry is a single flat CSS file with no `@import` statements
(design tokens are inlined), so it also works via a plain `<link>` or a
non-Vite/webpack bundler. The un-inlined source is available at
`@softium/table-styles/source.css` if you'd rather resolve `@softium/styles`
yourself.

## License

MIT © Sunghoon Lee
