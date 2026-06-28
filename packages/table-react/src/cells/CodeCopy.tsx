import { useState } from 'react';

export interface CodeCopyProps {
  value: string;
  /** label shown; defaults to the value */
  children?: string;
}

/** CodeCopy — monospace value with a copy-to-clipboard button + brief feedback. */
export function CodeCopy({ value, children }: CodeCopyProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable (insecure context) — no-op
    }
  }

  return (
    <span className="sft-code">
      <code className="sft-code__text">{children ?? value}</code>
      <button
        type="button"
        className="sft-code__copy"
        data-copied={copied || undefined}
        title="copy"
        aria-label="copy"
        onClick={copy}
      >
        {copied ? '✓' : '⧉'}
      </button>
    </span>
  );
}
