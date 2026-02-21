// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// Mock TipTap packages since they need browser APIs
const mockEditor = {
  commands: { setContent: vi.fn() },
  storage: { markdown: { getMarkdown: vi.fn(() => '') } },
  chain: vi.fn(() => mockEditor),
  focus: vi.fn(() => mockEditor),
  run: vi.fn(),
  isActive: vi.fn(() => false),
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('@tiptap/react', () => ({
  useEditor: () => mockEditor,
  EditorContent: ({ editor }: { editor: unknown }) =>
    editor ? <div data-testid="tiptap-editor" /> : null,
}));
vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: () => [] },
}));
vi.mock('@tiptap/extension-link', () => ({
  default: { configure: () => [] },
}));
vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: () => [] },
}));
vi.mock('@tiptap/extension-task-list', () => ({
  default: [],
}));
vi.mock('@tiptap/extension-task-item', () => ({
  default: { configure: () => [] },
}));
vi.mock('tiptap-markdown', () => ({
  Markdown: { configure: () => [] },
}));

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor', () => {
  it('renders the editor container', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
  });

  it('renders the toolbar', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('H1')).toBeInTheDocument();
    expect(screen.getByTitle('Copy markdown')).toBeInTheDocument();
  });

  it('renders toolbar and editor inside wrapper', () => {
    const { container } = render(<MarkdownEditor value="" onChange={vi.fn()} />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.querySelector('[data-testid="tiptap-editor"]')).toBeInTheDocument();
  });
});
