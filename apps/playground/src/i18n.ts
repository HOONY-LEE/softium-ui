export type Locale = 'ko' | 'en';

export const shellStrings = {
  ko: {
    brandSubtitle: 'Playground',
    sectionStart: '시작하기',
    sectionComponents: '컴포넌트',
    overview: '개요',
    github: 'GitHub',
  },
  en: {
    brandSubtitle: 'Playground',
    sectionStart: 'Getting started',
    sectionComponents: 'Components',
    overview: 'Overview',
    github: 'GitHub',
  },
} satisfies Record<Locale, Record<string, string>>;
