import {
  AppShell,
  Button,
  Header,
  Sidebar,
  SidebarBrand,
  SidebarItem,
  SidebarSection,
  ThemeToggle,
} from '@softium/ui';
import { Github, PanelLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Locale, shellStrings } from './i18n';
import { type PageKey, nav, navLabel } from './nav';
import { ButtonsPage } from './pages/ButtonsPage';
import { CellTypesPage } from './pages/CellTypesPage';
import { OverviewPage } from './pages/OverviewPage';
import { TablePage } from './pages/TablePage';

const REPO_URL = 'https://github.com/HOONY-LEE/softium-ui';

export function App() {
  const [page, setPage] = useState<PageKey>('overview');
  const [locale, setLocale] = useState<Locale>('ko');
  const [collapsed, setCollapsed] = useState(false);
  const s = shellStrings[locale];

  // keep <html lang> in sync (theme is owned by <ThemeToggle>)
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const sectionLabel = (section: 'start' | 'components') =>
    section === 'start' ? s.sectionStart : s.sectionComponents;

  const currentTitle = (() => {
    for (const group of nav) {
      const found = group.items.find((i) => i.key === page);
      if (found) return navLabel(found, locale);
    }
    return 'softium-ui';
  })();

  const sidebar = (
    <Sidebar>
      <SidebarBrand logo="S" subtitle={s.brandSubtitle}>
        softium-ui
      </SidebarBrand>
      {nav.map((group) => (
        <SidebarSection key={group.section} label={sectionLabel(group.section)}>
          {group.items.map((item) => (
            <SidebarItem
              key={item.key}
              icon={<item.icon size={16} />}
              active={page === item.key}
              onClick={() => setPage(item.key)}
            >
              {navLabel(item, locale)}
            </SidebarItem>
          ))}
        </SidebarSection>
      ))}
    </Sidebar>
  );

  const header = (
    <Header
      actions={
        <>
          <div className="locale-switch" role="group" aria-label="language">
            <Button
              size="sm"
              variant={locale === 'ko' ? 'primary' : 'ghost'}
              onClick={() => setLocale('ko')}
            >
              한국어
            </Button>
            <Button
              size="sm"
              variant={locale === 'en' ? 'primary' : 'ghost'}
              onClick={() => setLocale('en')}
            >
              EN
            </Button>
          </div>
          <ThemeToggle />
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<Github size={15} />}
            onClick={() => window.open(REPO_URL, '_blank')}
          >
            {s.github}
          </Button>
        </>
      }
    >
      <Button
        size="sm"
        variant="ghost"
        aria-label="toggle sidebar"
        onClick={() => setCollapsed((v) => !v)}
      >
        <PanelLeft size={16} />
      </Button>
      <h1 className="sft-header__title">{currentTitle}</h1>
    </Header>
  );

  return (
    <AppShell sidebar={sidebar} header={header} collapsed={collapsed}>
      {page === 'overview' && <OverviewPage locale={locale} onNavigate={setPage} />}
      {page === 'table' && <TablePage locale={locale} />}
      {page === 'cell-types' && <CellTypesPage locale={locale} />}
      {page === 'button' && <ButtonsPage locale={locale} />}
    </AppShell>
  );
}
