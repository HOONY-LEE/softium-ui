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
import { Github, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Locale, shellStrings } from './i18n';
import { type PageKey, nav, navLabel } from './nav';
import { ButtonsPage } from './pages/ButtonsPage';
import { CellTypesPage } from './pages/CellTypesPage';
import { DataGridPage } from './pages/DataGridPage';
import { OverviewPage } from './pages/OverviewPage';
import { PivotPage } from './pages/PivotPage';
import { SheetPage } from './pages/SheetPage';
import { TablePage } from './pages/TablePage';

const REPO_URL = 'https://github.com/HOONY-LEE/softium-ui';

export function App() {
  const [page, setPage] = useState<PageKey>('overview');
  const [locale, setLocale] = useState<Locale>('ko');
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const s = shellStrings[locale];

  // keep <html lang> in sync (theme is owned by <ThemeToggle>)
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const sectionLabel = (section: 'start' | 'components') =>
    section === 'start' ? s.sectionStart : s.sectionComponents;

  // breadcrumb parts for the current page: section label / page title
  const crumb = (() => {
    for (const group of nav) {
      const found = group.items.find((i) => i.key === page);
      if (found) return { root: sectionLabel(group.section), current: navLabel(found, locale) };
    }
    return { root: 'softium-ui', current: '' };
  })();

  const go = (key: PageKey) => {
    setPage(key);
    setDrawerOpen(false);
  };

  const sidebar = (
    <Sidebar
      header={
        <SidebarBrand logo="S" subtitle={s.brandSubtitle}>
          softium-ui
        </SidebarBrand>
      }
      collapsed={collapsed}
      onCollapse={() => setCollapsed(true)}
      onExpand={() => setCollapsed(false)}
    >
      {nav.map((group) => (
        <SidebarSection key={group.section} label={sectionLabel(group.section)} collapsible>
          {group.items.map((item) => (
            <SidebarItem
              key={item.key}
              icon={<item.icon size={16} />}
              tooltip={navLabel(item, locale)}
              active={page === item.key}
              onClick={() => go(item.key)}
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
      menuButton={
        <Button
          size="sm"
          variant="secondary"
          aria-label="open menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={16} />
        </Button>
      }
      logo={
        <nav className="sft-breadcrumb" aria-label="breadcrumb">
          <span className="sft-breadcrumb__root">{crumb.root}</span>
          {crumb.current && (
            <>
              <span className="sft-breadcrumb__sep" aria-hidden="true">
                /
              </span>
              <span className="sft-breadcrumb__current">{crumb.current}</span>
            </>
          )}
        </nav>
      }
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
    />
  );

  return (
    <AppShell
      sidebar={sidebar}
      header={header}
      collapsed={collapsed}
      sidebarOpen={drawerOpen}
      onSidebarClose={() => setDrawerOpen(false)}
    >
      {page === 'overview' && <OverviewPage locale={locale} onNavigate={setPage} />}
      {page === 'table' && <TablePage locale={locale} />}
      {page === 'data-grid' && <DataGridPage locale={locale} />}
      {page === 'sheet' && <SheetPage locale={locale} />}
      {page === 'pivot' && <PivotPage locale={locale} />}
      {page === 'cell-types' && <CellTypesPage locale={locale} />}
      {page === 'button' && <ButtonsPage locale={locale} />}
    </AppShell>
  );
}
