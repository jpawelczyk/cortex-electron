// Global test setup
import { vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock framer-motion to skip animations in tests.
// AnimatePresence keeps exiting elements in the DOM during exit animations,
// which breaks assertions that count rendered items after dismissal.
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(
      ({ layout: _layout, variants: _variants, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: Record<string, unknown>, ref: unknown) =>
        React.createElement('div', { ...props, ref } as React.HTMLAttributes<HTMLDivElement>),
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Clean up between tests
beforeEach(() => {
  // Reset any global state if needed
});

afterEach(() => {
  // Cleanup
});
