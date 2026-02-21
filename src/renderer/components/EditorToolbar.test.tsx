// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { EditorToolbar } from './EditorToolbar';
import { type Editor } from '@tiptap/react';

function createMockEditor(): Editor {
  const chainable = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleTaskList: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };

  return {
    chain: vi.fn(() => chainable),
    isActive: vi.fn(() => false),
    storage: {
      markdown: { getMarkdown: vi.fn(() => '# Hello') },
    },
  } as unknown as Editor;
}

describe('EditorToolbar', () => {
  it('renders all toolbar buttons', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('H1')).toBeInTheDocument();
    expect(screen.getByTitle('H2')).toBeInTheDocument();
    expect(screen.getByTitle('H3')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet list')).toBeInTheDocument();
    expect(screen.getByTitle('Numbered list')).toBeInTheDocument();
    expect(screen.getByTitle('Task list')).toBeInTheDocument();
    expect(screen.getByTitle('Quote')).toBeInTheDocument();
    expect(screen.getByTitle('Code block')).toBeInTheDocument();
    expect(screen.getByTitle('Link')).toBeInTheDocument();
    expect(screen.getByTitle('Divider')).toBeInTheDocument();
    expect(screen.getByTitle('Copy markdown')).toBeInTheDocument();
  });

  it('calls toggleBold when Bold button is clicked', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    await user.click(screen.getByTitle('Bold'));
    const chain = editor.chain();
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.toggleBold).toHaveBeenCalled();
  });

  it('calls toggleItalic when Italic button is clicked', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    await user.click(screen.getByTitle('Italic'));
    const chain = editor.chain();
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.toggleItalic).toHaveBeenCalled();
  });

  it('calls toggleHeading for heading buttons', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    await user.click(screen.getByTitle('H1'));
    const chain = editor.chain();
    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 1 });

    await user.click(screen.getByTitle('H2'));
    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 2 });

    await user.click(screen.getByTitle('H3'));
    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 3 });
  });

  it('calls list toggles when list buttons are clicked', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    await user.click(screen.getByTitle('Bullet list'));
    const chain = editor.chain();
    expect(chain.toggleBulletList).toHaveBeenCalled();

    await user.click(screen.getByTitle('Numbered list'));
    expect(chain.toggleOrderedList).toHaveBeenCalled();

    await user.click(screen.getByTitle('Task list'));
    expect(chain.toggleTaskList).toHaveBeenCalled();
  });

  it('calls toggleBlockquote when Quote button is clicked', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    await user.click(screen.getByTitle('Quote'));
    const chain = editor.chain();
    expect(chain.toggleBlockquote).toHaveBeenCalled();
  });

  it('calls toggleCodeBlock when Code block button is clicked', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    await user.click(screen.getByTitle('Code block'));
    const chain = editor.chain();
    expect(chain.toggleCodeBlock).toHaveBeenCalled();
  });

  it('calls setHorizontalRule when Divider button is clicked', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    await user.click(screen.getByTitle('Divider'));
    const chain = editor.chain();
    expect(chain.setHorizontalRule).toHaveBeenCalled();
  });

  it('copies markdown when Copy button is clicked', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByTitle('Copy markdown'));
    expect(writeText).toHaveBeenCalledWith('# Hello');
  });

  it('prompts for URL and sets link when Link button is clicked', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');

    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByTitle('Link'));

    expect(window.prompt).toHaveBeenCalledWith('URL');
    const chain = editor.chain();
    expect(chain.setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
  });

  it('does not set link when prompt is cancelled', async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    vi.spyOn(window, 'prompt').mockReturnValue(null);

    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByTitle('Link'));

    const chain = editor.chain();
    expect(chain.setLink).not.toHaveBeenCalled();
  });
});
