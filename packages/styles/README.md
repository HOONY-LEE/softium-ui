# @softium/styles

Shared design tokens (CSS custom properties) + base theme for all softium-ui
packages. Light/dark mode included. No JavaScript.

Part of [softium-ui](https://github.com/HOONY-LEE/softium-ui).

## Install

```bash
npm i @softium/styles
```

## Usage

Import once at your app entry:

```ts
import '@softium/styles';
```

This defines the `--sft-*` custom properties (colors, spacing, radii, z-index,
typography), the dark theme, and a minimal opt-in base layer. Component
packages (`@softium/table-styles`, `@softium/calendar`, `@softium/ui`) already
inline these tokens into their own stylesheets, so you only import this
directly if you're building custom UI on the same token system.

Subpath entries are available if you want just one layer:

```ts
import '@softium/styles/tokens.css';
import '@softium/styles/theme.css';
import '@softium/styles/base.css';
```

## Dark mode

Automatic via `prefers-color-scheme`, or force it with `<html data-theme="dark">`
(or `data-theme="light"` to lock light).

## License

MIT © Sunghoon Lee
