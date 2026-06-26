/**
 * useVirtualRows — fixed-height row windowing (SPEC §5).
 *
 * Reference: @tanstack/virtual. Implemented directly (no dependency) because our
 * needs are narrow: fixed row height, a single vertical scroll parent, overscan.
 *
 * Returns the slice [startIndex, endIndex) to render, the translateY offset that
 * positions that slice, and the total scroll height that sizes the scrollbar.
 */

import { type RefObject, useEffect, useState } from 'react';

export interface VirtualWindow {
  enabled: boolean;
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
}

export interface UseVirtualRowsOptions {
  count: number;
  rowHeight: number;
  /** extra rows rendered above/below the viewport to mask fast scrolling */
  overscan?: number;
  enabled?: boolean;
}

export function useVirtualRows(
  scrollRef: RefObject<HTMLElement | null>,
  { count, rowHeight, overscan = 8, enabled = true }: UseVirtualRowsOptions,
): VirtualWindow {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    const onScroll = () => setScrollTop(el.scrollTop);
    setViewportHeight(el.clientHeight);
    setScrollTop(el.scrollTop);

    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [scrollRef, enabled]);

  const totalHeight = count * rowHeight;

  if (!enabled || viewportHeight === 0) {
    return { enabled, startIndex: 0, endIndex: count, offsetY: 0, totalHeight };
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(count, startIndex + visibleCount);
  const offsetY = startIndex * rowHeight;

  return { enabled, startIndex, endIndex, offsetY, totalHeight };
}
