# @softium/ui

General React primitives and app-shell layout for softium-ui: `Button`,
`AppShell` (responsive sidebar + header with a mobile drawer), `Sidebar`,
`Header`, `ThemeToggle`, and a `useTheme` hook.

Part of [softium-ui](https://github.com/HOONY-LEE/softium-ui).

## Install

```bash
npm i @softium/ui
```

`react` and `react-dom` (`^18` or `^19`) are peer dependencies.

## Usage

```tsx
import '@softium/ui/styles.css';
import { AppShell, Button, ThemeToggle } from '@softium/ui';

export function App() {
  return (
    <AppShell header={<ThemeToggle />} sidebar={/* nav */ null}>
      <Button variant="primary">Save</Button>
    </AppShell>
  );
}
```

## Theming

Plain CSS custom properties (`--sft-*`). Dark mode via `prefers-color-scheme`
or `<html data-theme="dark">`; `ThemeToggle` / `useTheme` flip the explicit
attribute. The stylesheet inlines the shared tokens, so this import is
self-contained.

## License

MIT © Sunghoon Lee
