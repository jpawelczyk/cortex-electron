import { useLayoutEffect, useRef, type RefObject } from 'react';

const FLIP_DURATION = 300;
const ENTER_DURATION = 200;
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
 * 2. Snapshot current positions BEFORE starting new animations
 *    (avoids polluting stored rects with animation transforms).
 * 3. Compare with stored positions from the previous render.
 * 4. Animate the delta via Web Animations API.
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

    // 2. Snapshot current positions BEFORE starting new animations.
    //    This is critical: getBoundingClientRect() includes Web Animation
    //    transforms, so reading after el.animate() would store the animated
    //    offset instead of the true layout position, causing animations to
    //    restart incorrectly on rapid re-renders.
    const newPositions = new Map<string, DOMRect>();
    for (const child of container.children) {
      const key = (child as HTMLElement).dataset.flipKey;
      if (key) newPositions.set(key, child.getBoundingClientRect());
    }
    positions.current = newPositions;

    // 3-4. Compare with old positions and animate deltas
    if (supportsAnimate && oldPositions.size > 0) {
      for (const child of container.children) {
        const el = child as HTMLElement;
        const key = el.dataset.flipKey;
        if (!key) continue;

        const oldRect = oldPositions.get(key);
        if (!oldRect) {
          // New element — animate it entering
          const animation = el.animate(
            [
              { opacity: 0, transform: 'translateY(-8px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: ENTER_DURATION, easing: FLIP_EASING },
          );
          activeAnimations.current.set(key, animation);
          animation.onfinish = () => activeAnimations.current.delete(key);
          continue;
        }

        const newRect = newPositions.get(key);
        if (!newRect) continue;

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
  });
}
