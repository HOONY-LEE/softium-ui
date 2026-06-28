import type { ReactNode } from 'react';

export interface AvatarProps {
  /** image URL (profile / product). Falls back to initials when missing or broken. */
  src?: string;
  /** name used for initials fallback + alt text */
  name?: string;
  /** diameter in px. Default 28. */
  size?: number;
  /** optional secondary text shown next to the avatar */
  children?: ReactNode;
}

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  // CJK names have no spaces — take the last 2 chars; latin — first letters of words
  if (parts.length === 1) return parts[0]?.slice(-2) ?? '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
}

/** Avatar — circular thumbnail (image or initials), optionally with a label. */
export function Avatar({ src, name, size = 28, children }: AvatarProps) {
  return (
    <span className="sft-avatar-cell">
      <span className="sft-avatar" style={{ width: size, height: size }} aria-hidden={!name}>
        {src ? (
          <img className="sft-avatar__img" src={src} alt={name ?? ''} />
        ) : (
          <span className="sft-avatar__initials">{initials(name)}</span>
        )}
      </span>
      {children != null && <span className="sft-avatar-cell__label">{children}</span>}
    </span>
  );
}
