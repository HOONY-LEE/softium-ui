export type { LocaleKey, TableMessages } from './messages';
export { defaultMessages, en, ko, locales } from './messages';

import type { LocaleKey, TableMessages } from './messages';
import { defaultMessages, locales } from './messages';

/**
 * Resolve the effective message catalog from a `locale`/`messages` prop pair.
 * Precedence: explicit `messages` overrides > named `locale` catalog > default (ko).
 */
export function resolveMessages(
  locale?: LocaleKey,
  overrides?: Partial<TableMessages>,
): TableMessages {
  const base: TableMessages = locale ? locales[locale] : defaultMessages;
  return overrides ? { ...base, ...overrides } : base;
}
