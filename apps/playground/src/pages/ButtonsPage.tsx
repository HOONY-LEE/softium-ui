import { Button, type ButtonVariant } from '@softium/ui';
import { ArrowRight, Plus } from 'lucide-react';
import type { Locale } from '../i18n';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];

export function ButtonsPage({ locale }: { locale: Locale }) {
  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">Button</h2>
          <p className="page-desc">
            {locale === 'ko'
              ? '의도적으로 먼저 시드한 단 하나의 프리미티브. 나머지는 실사용에서 추출합니다.'
              : 'The one primitive seeded up front. Everything else is extracted from real usage.'}
          </p>
        </div>
      </div>

      <section className="demo-card">
        <h3 className="demo-card__title">{locale === 'ko' ? '변형' : 'Variants'}</h3>
        <div className="demo-row">
          {VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
        </div>
      </section>

      <section className="demo-card">
        <h3 className="demo-card__title">{locale === 'ko' ? '크기' : 'Sizes'}</h3>
        <div className="demo-row demo-row--center">
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="md">
            Medium
          </Button>
        </div>
      </section>

      <section className="demo-card">
        <h3 className="demo-card__title">{locale === 'ko' ? '아이콘 · 상태' : 'Icon · State'}</h3>
        <div className="demo-row">
          <Button variant="primary" iconLeft={<Plus size={15} />}>
            {locale === 'ko' ? '추가' : 'Add'}
          </Button>
          <Button variant="secondary" iconRight={<ArrowRight size={15} />}>
            {locale === 'ko' ? '다음' : 'Next'}
          </Button>
          <Button variant="primary" disabled>
            {locale === 'ko' ? '비활성' : 'Disabled'}
          </Button>
        </div>
      </section>
    </div>
  );
}
