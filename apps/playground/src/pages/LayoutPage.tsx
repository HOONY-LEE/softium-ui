import { Button, Header, Sidebar, SidebarBrand, SidebarItem, SidebarSection } from '@softium/ui';
import {
  Bell,
  Grid3x3,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Table,
} from 'lucide-react';
import { useState } from 'react';
import type { Locale } from '../i18n';

const DEMO_ITEMS = [
  { key: 'overview', icon: LayoutDashboard, ko: '개요', en: 'Overview' },
  { key: 'table', icon: Table, ko: '데이터 테이블', en: 'Data Table' },
  { key: 'grid', icon: Grid3x3, ko: '데이터 그리드', en: 'Data Grid' },
];

export function LayoutPage({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState('overview');

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('레이아웃', 'Layout')}</h2>
          <p className="page-desc">
            {t(
              '이 문서 사이트 자체를 구성하는 3개 컴포넌트 — AppShell(전체 골격) · Header(상단바) · Sidebar(내비게이션). 아래는 축소판 미리보기이며, 접기 버튼과 항목 클릭이 실제로 동작합니다.',
              'The 3 components that make up this very docs site — AppShell (overall skeleton) · Header (top bar) · Sidebar (navigation). The scaled-down preview below is fully interactive: try the collapse toggle and clicking items.',
            )}
          </p>
        </div>
      </div>

      <section className="demo-card">
        <h3 className="demo-card__title">{t('미리보기', 'Preview')}</h3>
        <div className="layout-demo">
          <div className="layout-demo__aside" style={{ width: collapsed ? 64 : 200 }}>
            <Sidebar
              header={
                <SidebarBrand logo="S" subtitle="Playground">
                  softium-ui
                </SidebarBrand>
              }
              collapsed={collapsed}
              onCollapse={() => setCollapsed(true)}
              onExpand={() => setCollapsed(false)}
            >
              <SidebarSection label={t('컴포넌트', 'Components')} collapsible>
                {DEMO_ITEMS.map((item) => (
                  <SidebarItem
                    key={item.key}
                    icon={<item.icon size={16} />}
                    tooltip={locale === 'ko' ? item.ko : item.en}
                    active={active === item.key}
                    onClick={() => setActive(item.key)}
                  >
                    {locale === 'ko' ? item.ko : item.en}
                  </SidebarItem>
                ))}
              </SidebarSection>
            </Sidebar>
          </div>

          <div className="layout-demo__main">
            <Header
              menuButton={
                <Button size="sm" variant="secondary" aria-label="menu">
                  <Menu size={15} />
                </Button>
              }
              logo={
                <nav className="sft-breadcrumb">
                  <span className="sft-breadcrumb__root">{t('컴포넌트', 'Components')}</span>
                  <span className="sft-breadcrumb__sep">/</span>
                  <span className="sft-breadcrumb__current">
                    {locale === 'ko'
                      ? DEMO_ITEMS.find((i) => i.key === active)?.ko
                      : DEMO_ITEMS.find((i) => i.key === active)?.en}
                  </span>
                </nav>
              }
              actions={
                <>
                  <Button size="sm" variant="ghost" aria-label="search">
                    <Search size={15} />
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="notifications">
                    <Bell size={15} />
                  </Button>
                </>
              }
            />
            <div className="layout-demo__content">
              {t(
                '본문 영역 — 페이지 컴포넌트가 여기에 렌더링됩니다.',
                'Content area — page components render here.',
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="demo-card">
        <h3 className="demo-card__title">AppShell</h3>
        <p className="page-desc" style={{ margin: 0 }}>
          {t(
            '고정 사이드바 + 스크롤되는 본문의 전체 골격. collapsed로 사이드바를 아이콘 레일로 접고, sidebarOpen/onSidebarClose로 모바일 드로어(오버레이 포함)를 제어합니다. 태블릿 폭에서는 자동으로 레일 모드가 됩니다.',
            'The overall skeleton: a fixed sidebar + a scrolling body. `collapsed` shrinks the sidebar to an icon rail; `sidebarOpen`/`onSidebarClose` drive a mobile off-canvas drawer with a backdrop. Auto-collapses to a rail at tablet widths.',
          )}
        </p>
      </section>

      <section className="demo-card">
        <h3 className="demo-card__title">Header</h3>
        <p className="page-desc" style={{ margin: 0 }}>
          {t(
            '상단바. menuButton(모바일 전용 햄버거) · logo(브랜드/브레드크럼) · nav(가운데) · actions(우측 정렬)까지 네 개의 슬롯을 지원합니다.',
            'The top bar. Four slots: menuButton (mobile-only hamburger), logo (brand/breadcrumb), nav (center), and actions (right-aligned).',
          )}
        </p>
      </section>

      <section className="demo-card">
        <h3 className="demo-card__title">Sidebar</h3>
        <p className="page-desc" style={{ margin: 0 }}>
          {t(
            '내비게이션. header/footer 슬롯, collapsed + onCollapse/onExpand(내장 접기 버튼), SidebarSection의 collapsible(그룹 접기), SidebarItem의 tooltip(접힘 상태에서 hover 시 표시)을 지원합니다.',
            'Navigation. Supports header/footer slots, collapsed + onCollapse/onExpand (a built-in collapse button), SidebarSection.collapsible (group toggling), and SidebarItem.tooltip (shown on hover while collapsed).',
          )}
        </p>
        <div className="demo-row" style={{ marginTop: 'var(--sft-space-3)' }}>
          <Button
            size="sm"
            variant="secondary"
            iconLeft={collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? t('펼치기', 'Expand') : t('접기', 'Collapse')}
          </Button>
        </div>
      </section>
    </div>
  );
}
