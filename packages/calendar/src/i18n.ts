/** The calendar ships ko/en strings inline (like the source), chosen by `language`. */
export type CalLocale = 'ko' | 'en';

export function pick(language: string, ko: string, en: string): string {
  return language === 'ko' ? ko : en;
}
