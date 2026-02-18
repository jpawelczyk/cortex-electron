import { useLayoutEffect, useRef, type RefObject } from 'react';

const FLIP_DURATION = 300;
const FLIP_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

/**
 * FLIP animation hook for smooth list reordering.
 *
 * Children of the container must have a `data-flip-key` attribute
 * with a stable unique identifier.
 *
 * How it works (all in a single useLayoutEffect, before paint):
 * 1. Cancel any in-flight FLIP animations (so getBoundingClientRect
 *    returns the true layout position, not a mid-animation offset).
 * 2. Read each child's current bounding rect (the "Last" position).
 * 3. Compare with stored "First" positions from the previous render.
 * 4. Animate the delta via Web Animations API.
 * 5. Store current positions for the next render.
 */
export function useFlipAnimation(containerRef: RefObject<HTMLElement | null>) {
  const positions = useRef(new Map<string, DOMRect>());
  const activeAnimations = useRef(new Map<string, Animation>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const supportsAnimate = typeof Element.prototype.animate === 'function';

    // 1. Cancel in-flight animations so rects reflect true layout positions
    if (supportsAnimate) {
      for (const anim of activeAnimations.current.values()) {
        anim.cancel();
      }
      activeAnimations.current.clear();
    }

    const oldPositions = positions.current;

    // 2-3. Read new positions and animate deltas
    if (supportsAnimate && oldPositions.size > 0) {
      for (const child of container.children) {
        const el = child as HTMLElement;
        const key = el.dataset.flipKey;
        if (!key) continue;

        const oldRect = oldPositions.get(key);
        if (!oldRect) continue;

        const newRect = el.getBoundingClientRect();
        const deltaY = oldRect.top - newRect.top;
        if (Math.abs(deltaY) < 1) continue;

        const animation = el.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: FLIP_DURATION, easing: FLIP_EASING },
        );
        activeAnimations.current.set(key, animation);
        animation.onfinish = () => activeAnimations.current.delete(key);
      }
    }

    // 4. Snapshot positions for next render
    const next = new Map<string, DOMRect>();
    for (const child of container.children) {
      const key = (child as HTMLElement).dataset.flipKey;
      if (key) next.set(key, child.getBoundingClientRect());
    }
    positions.current = next;
  });
}
