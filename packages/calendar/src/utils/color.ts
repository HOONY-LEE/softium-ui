/** Apple-style category color presets (ported from calendary). */
export const COLOR_PRESETS = [
  '#E30000',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#30B0C7',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF3B30',
  '#A2845E',
];

const DEFAULT_COLOR = '#E30000';

/** nearest preset to an arbitrary hex, by RGB euclidean distance */
export function findClosestPresetColor(hex: string): string {
  const parse = (h: string): [number, number, number] => {
    const c = h.replace('#', '');
    return [
      Number.parseInt(c.substring(0, 2), 16),
      Number.parseInt(c.substring(2, 4), 16),
      Number.parseInt(c.substring(4, 6), 16),
    ];
  };
  try {
    const [r, g, b] = parse(hex);
    let minDist = Number.POSITIVE_INFINITY;
    let closest = COLOR_PRESETS[0] as string;
    for (const preset of COLOR_PRESETS) {
      const [pr, pg, pb] = parse(preset);
      const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (dist < minDist) {
        minDist = dist;
        closest = preset;
      }
    }
    return closest;
  } catch {
    return DEFAULT_COLOR;
  }
}

/** hex → rgba at the given alpha (used for the event-chip fill tint) */
export function withAlpha(color: string | undefined, alpha: number): string {
  const hex = (color ?? DEFAULT_COLOR).replace('#', '');
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
