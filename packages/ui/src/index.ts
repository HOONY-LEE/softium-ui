/**
 * @softium/ui
 *
 * General React primitives + app-shell layout for softium-ui.
 * Remember to import the stylesheet once:
 *   import '@softium/ui/styles.css';
 */

export const VERSION = '0.0.0';

export { Button } from './components/Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './components/Button';

export { AppShell } from './components/AppShell';
export type { AppShellProps } from './components/AppShell';

export {
  Sidebar,
  SidebarBrand,
  SidebarItem,
  SidebarSection,
} from './components/Sidebar';
export type {
  SidebarBrandProps,
  SidebarItemProps,
  SidebarProps,
  SidebarSectionProps,
} from './components/Sidebar';

export { Header } from './components/Header';
export type { HeaderProps } from './components/Header';

export { ThemeToggle } from './components/ThemeToggle';
export type { ThemeToggleProps } from './components/ThemeToggle';

export { Switch } from './components/Switch';
export type { SwitchProps } from './components/Switch';

export { useTheme } from './hooks/useTheme';
export type { Theme, UseThemeOptions } from './hooks/useTheme';
