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
  commandsCtx: Symbol('commandsCtx'),
}));
vi.mock('@milkdown/preset-commonmark', () => ({
  commonmark: [],
  toggleStrongCommand: { key: Symbol('toggleStrong') },
  toggleEmphasisCommand: { key: Symbol('toggleEmphasis') },
  wrapInHeadingCommand: { key: Symbol('wrapInHeading') },
  wrapInBulletListCommand: { key: Symbol('wrapInBulletList') },
  wrapInOrderedListCommand: { key: Symbol('wrapInOrderedList') },
  toggleLinkCommand: { key: Symbol('toggleLink') },
  createCodeBlockCommand: { key: Symbol('createCodeBlock') },
}));
vi.mock('@milkdown/preset-gfm', () => ({ gfm: [] }));
vi.mock('@milkdown/theme-nord', () => ({ nord: [] }));
vi.mock('@milkdown/plugin-listener', () => ({
  listener: [],
  listenerCtx: Symbol('listenerCtx'),
}));
vi.mock('@milkdown/utils', () => ({
  replaceAll: vi.fn(() => vi.fn()),
  callCommand: vi.fn(() => vi.fn()),
}));

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

  it('renders the toolbar', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Copy')).toBeInTheDocument();
  });

  it('wraps editor and toolbar in a bordered container', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    const wrapper = screen.getByTestId('milkdown-editor').closest('[data-testid="editor-wrapper"]');
    expect(wrapper).toBeInTheDocument();
  });
});
