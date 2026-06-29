import type { ReactNode } from 'react';

export interface PhoneProps {
  /** raw value, e.g. "01052596024" */
  value: string | number | null | undefined;
  /** render as a tel: link. Default true. */
  link?: boolean;
  /** override the formatter (default formats Korean numbers) */
  format?: (digits: string) => string;
}

/** Format Korean phone numbers: 01052596024 → 010-5259-6024, 0212345678 → 02-1234-5678. */
export function formatPhoneKR(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (!d) return raw;
  if (d.startsWith('02')) {
    if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return raw;
}

export function Phone({ value, link = true, format = formatPhoneKR }: PhoneProps): ReactNode {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value);
  const display = format(raw);
  if (!link) return <span className="sft-phone">{display}</span>;
  return (
    <a className="sft-link sft-phone" href={`tel:${raw.replace(/\D/g, '')}`}>
      {display}
    </a>
  );
}
