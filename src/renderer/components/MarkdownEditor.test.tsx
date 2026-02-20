// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// Mock all milkdown packages since they need browser APIs
function createChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {
    create: () => Promise.resolve({ destroy: vi.fn(), action: vi.fn() }),
  };
  chain.config = () => chain;
  chain.use = () => chain;
  return chain;
}
vi.mock('@milkdown/core', () => ({
  Editor: { make: () => createChain() },
  rootCtx: Symbol('rootCtx'),
  defaultValueCtx: Symbol('defaultValueCtx'),
}));
vi.mock('@milkdown/preset-commonmark', () => ({ commonmark: [] }));
vi.mock('@milkdown/preset-gfm', () => ({ gfm: [] }));
vi.mock('@milkdown/theme-nord', () => ({ nord: [] }));
vi.mock('@milkdown/plugin-listener', () => ({
  listener: [],
  listenerCtx: Symbol('listenerCtx'),
}));
vi.mock('@milkdown/utils', () => ({ replaceAll: vi.fn(() => vi.fn()) }));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor', () => {
  it('renders the editor container', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    expect(screen.getByTestId('milkdown-editor')).toBeInTheDocument();
  });

  it('has the milkdown-editor class', () => {
    render(<MarkdownEditor value="# Hello" onChange={vi.fn()} />);
    const el = screen.getByTestId('milkdown-editor');
    expect(el).toHaveClass('milkdown-editor');
  });
});
