import type { ReactNode } from 'react';

export interface EmailProps {
  value: string | null | undefined;
  /** render as a mailto: link. Default true. */
  link?: boolean;
}

/** Email — a mailto link (truncates when narrow). */
export function Email({ value, link = true }: EmailProps): ReactNode {
  if (!value) return null;
  if (!link) return <span className="sft-email">{value}</span>;
  return (
    <a className="sft-link sft-email" href={`mailto:${value}`}>
      {value}
    </a>
  );
}
