// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { EditorToolbar } from './EditorToolbar';

function createHandlers() {
  return {
    onBold: vi.fn(),
    onItalic: vi.fn(),
    onH1: vi.fn(),
    onH2: vi.fn(),
    onH3: vi.fn(),
    onBulletList: vi.fn(),
    onOrderedList: vi.fn(),
    onTaskList: vi.fn(),
    onLink: vi.fn(),
    onCode: vi.fn(),
    onCopy: vi.fn(),
  };
}

describe('EditorToolbar', () => {
  it('renders all toolbar buttons', () => {
    const handlers = createHandlers();
    render(<EditorToolbar {...handlers} />);

    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet list')).toBeInTheDocument();
    expect(screen.getByTitle('Numbered list')).toBeInTheDocument();
    expect(screen.getByTitle('Task list')).toBeInTheDocument();
    expect(screen.getByTitle('Link')).toBeInTheDocument();
    expect(screen.getByTitle('Code block')).toBeInTheDocument();
    expect(screen.getByTitle('Copy')).toBeInTheDocument();
  });

  it('calls onBold when Bold button is clicked', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<EditorToolbar {...handlers} />);

    await user.click(screen.getByTitle('Bold'));
    expect(handlers.onBold).toHaveBeenCalledOnce();
  });

  it('calls onItalic when Italic button is clicked', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<EditorToolbar {...handlers} />);

    await user.click(screen.getByTitle('Italic'));
    expect(handlers.onItalic).toHaveBeenCalledOnce();
  });

  it('calls heading handlers when heading buttons are clicked', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<EditorToolbar {...handlers} />);

    await user.click(screen.getByTitle('Heading 1'));
    expect(handlers.onH1).toHaveBeenCalledOnce();

    await user.click(screen.getByTitle('Heading 2'));
    expect(handlers.onH2).toHaveBeenCalledOnce();

    await user.click(screen.getByTitle('Heading 3'));
    expect(handlers.onH3).toHaveBeenCalledOnce();
  });

  it('calls list handlers when list buttons are clicked', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<EditorToolbar {...handlers} />);

    await user.click(screen.getByTitle('Bullet list'));
    expect(handlers.onBulletList).toHaveBeenCalledOnce();

    await user.click(screen.getByTitle('Numbered list'));
    expect(handlers.onOrderedList).toHaveBeenCalledOnce();

    await user.click(screen.getByTitle('Task list'));
    expect(handlers.onTaskList).toHaveBeenCalledOnce();
  });

  it('calls onLink when Link button is clicked', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<EditorToolbar {...handlers} />);

    await user.click(screen.getByTitle('Link'));
    expect(handlers.onLink).toHaveBeenCalledOnce();
  });

  it('calls onCode when Code block button is clicked', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<EditorToolbar {...handlers} />);

    await user.click(screen.getByTitle('Code block'));
    expect(handlers.onCode).toHaveBeenCalledOnce();
  });

  it('calls onCopy when Copy button is clicked', async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    render(<EditorToolbar {...handlers} />);

    await user.click(screen.getByTitle('Copy'));
    expect(handlers.onCopy).toHaveBeenCalledOnce();
  });

  it('renders dividers between button groups', () => {
    const handlers = createHandlers();
    const { container } = render(<EditorToolbar {...handlers} />);
    const dividers = container.querySelectorAll('[data-testid="toolbar-divider"]');
    expect(dividers.length).toBe(3);
  });
});
