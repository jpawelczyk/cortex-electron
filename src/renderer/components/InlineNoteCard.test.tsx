// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InlineNoteCard } from './InlineNoteCard';

const mockCreateNote = vi.fn();
const mockSelectNote = vi.fn();
const mockOnClose = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createNote: mockCreateNote,
      selectNote: mockSelectNote,
    };
    return selector(state);
  },
}));

describe('InlineNoteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNote.mockResolvedValue({
      id: 'new-note',
      title: 'Test',
      content: null,
      context_id: null,
      project_id: null,
      is_pinned: false,
      created_at: '2026-02-20T00:00:00.000Z',
      updated_at: '2026-02-20T00:00:00.000Z',
      deleted_at: null,
    });
  });

  it('renders a title input with placeholder', () => {
    render(<InlineNoteCard onClose={mockOnClose} />);
    expect(screen.getByPlaceholderText('New note')).toBeInTheDocument();
  });

  it('auto-focuses the title input', () => {
    render(<InlineNoteCard onClose={mockOnClose} />);
    expect(screen.getByPlaceholderText('New note')).toHaveFocus();
  });

  it('creates a note on Enter, selects it, and closes', async () => {
    render(<InlineNoteCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New note');

    fireEvent.change(input, { target: { value: 'My Note' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateNote).toHaveBeenCalledWith({ title: 'My Note' });
    await waitFor(() => {
      expect(mockSelectNote).toHaveBeenCalledWith('new-note');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('does not create when title is empty', () => {
    render(<InlineNoteCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New note');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('does not create when title is only whitespace', () => {
    render(<InlineNoteCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New note');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('trims whitespace from the title', async () => {
    render(<InlineNoteCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New note');

    fireEvent.change(input, { target: { value: '  Trimmed  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateNote).toHaveBeenCalledWith({ title: 'Trimmed' });
  });

  it('dismisses on Escape without creating', () => {
    render(<InlineNoteCard onClose={mockOnClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockCreateNote).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('saves on click outside when title has content', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <InlineNoteCard onClose={mockOnClose} />
      </div>,
    );
    const input = screen.getByPlaceholderText('New note');
    fireEvent.change(input, { target: { value: 'Click away note' } });
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(mockCreateNote).toHaveBeenCalledWith({ title: 'Click away note' });
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('dismisses on click outside when title is empty', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <InlineNoteCard onClose={mockOnClose} />
      </div>,
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(mockCreateNote).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('does not dismiss when clicking inside the card', () => {
    render(<InlineNoteCard onClose={mockOnClose} />);
    fireEvent.mouseDown(screen.getByTestId('inline-note-card'));

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
