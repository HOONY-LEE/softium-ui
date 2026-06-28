import { Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { type Theme, useTheme } from '../hooks/useTheme';
import { Button } from './Button';

export interface ThemeToggleProps {
  /** optional controlled value; when omitted the component manages its own theme */
  theme?: Theme;
  onToggle?: () => void;
  /** shown in light mode (click → dark). Defaults to a moon icon. */
  labelLight?: ReactNode;
  /** shown in dark mode (click → light). Defaults to a sun icon. */
  labelDark?: ReactNode;
}

/**
 * ThemeToggle — flips light/dark. Uncontrolled by default (manages + persists its
 * own theme); pass `theme` + `onToggle` to control it from outside.
 */
export function ThemeToggle({
  theme: controlled,
  onToggle,
  labelLight = <Moon size={16} />,
  labelDark = <Sun size={16} />,
}: ThemeToggleProps) {
  const internal = useTheme();
  const theme = controlled ?? internal.theme;
  const toggle = onToggle ?? internal.toggleTheme;

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle theme">
      {theme === 'light' ? labelLight : labelDark}
    </Button>
  );
}
