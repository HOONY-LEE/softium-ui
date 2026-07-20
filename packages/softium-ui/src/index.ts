/**
 * softium-ui — the all-in-one entry point.
 *
 *   npm i softium-ui
 *   import 'softium-ui/styles.css';
 *   import { Table, Sheet, Calendar, Button } from 'softium-ui';
 *
 * Everything here is re-exported from the individual `@softium/*` packages,
 * which remain published and installable on their own. Prefer those directly
 * if you only need one component and care about install size.
 *
 * Name collisions are resolved rather than silently dropped (an ambiguous
 * `export *` would exclude the symbol in ESM and error in TypeScript):
 *   - `Header` exists in both @softium/ui (the app-shell bar) and
 *     @softium/table-react (the table's header row) → the app-shell one is
 *     re-exported as `AppHeader` / `AppHeaderProps`.
 *   - `VERSION` exists in several packages → this package exports its own.
 *
 * @softium/table-react already re-exports the headless @softium/table-core
 * types (ColumnDef, Row, adapters, …), so table-core is not star-exported
 * again here; use the `softium-ui/core` subpath if you want it explicitly.
 */

export const VERSION = '0.0.0';

// Table / DataGrid / PivotTable + cell renderers + export helpers
// (also carries the re-exported @softium/table-core headless types)
export * from '@softium/table-react';

// Spreadsheet + formula engine
export * from '@softium/sheet';

// Calendar (month/week/day/year views, recurrence, event modal)
export * from '@softium/calendar';

// App-shell primitives. Star-exporting would collide on Header/HeaderProps
// and VERSION, so these are listed explicitly.
export {
  AppShell,
  Button,
  Header as AppHeader,
  Sidebar,
  SidebarBrand,
  SidebarItem,
  SidebarSection,
  Switch,
  ThemeToggle,
  useTheme,
} from '@softium/ui';

export type {
  AppShellProps,
  ButtonProps,
  ButtonSize,
  ButtonVariant,
  HeaderProps as AppHeaderProps,
  SidebarBrandProps,
  SidebarItemProps,
  SidebarProps,
  SidebarSectionProps,
  SwitchProps,
  Theme,
  ThemeToggleProps,
  UseThemeOptions,
} from '@softium/ui';
