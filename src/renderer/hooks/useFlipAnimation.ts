import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const FLIP_DURATION = 300;
const FLIP_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

/**
 * FLIP animation hook for smooth list reordering.
 *
 * Children of the container must have a `data-flip-key` attribute
 * with a stable unique identifier.
 *
 * How it works:
 * - `useEffect` (after paint) stores each child's bounding rect.
 * - `useLayoutEffect` (before paint) compares new positions against
 *   stored old positions and animates the delta using Web Animations API.
 */
export function useFlipAnimation(containerRef: RefObject<HTMLElement | null>) {
  const positions = useRef(new Map<string, DOMRect>());

  // Before paint: compare old positions with new DOM positions and animate
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || positions.current.size === 0) return;
    if (typeof Element.prototype.animate !== 'function') return;

    for (const child of container.children) {
      const el = child as HTMLElement;
      const key = el.dataset.flipKey;
      if (!key) continue;

      const oldRect = positions.current.get(key);
      if (!oldRect) continue;

      const newRect = el.getBoundingClientRect();
      const deltaY = oldRect.top - newRect.top;
      if (Math.abs(deltaY) < 1) continue;

      el.animate(
        [
          { transform: `translateY(${deltaY}px)` },
          { transform: 'translateY(0)' },
        ],
        { duration: FLIP_DURATION, easing: FLIP_EASING },
      );
    }
  });

  // After paint: snapshot positions for next comparison
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const next = new Map<string, DOMRect>();
    for (const child of container.children) {
      const key = (child as HTMLElement).dataset.flipKey;
      if (key) next.set(key, child.getBoundingClientRect());
    }
    positions.current = next;
  });
}
