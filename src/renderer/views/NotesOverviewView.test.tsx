// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NotesOverviewView } from './NotesOverviewView';

let mockNotes: Record<string, unknown>[] = [];
let mockActiveContextIds: string[] = [];
let mockContexts: Record<string, unknown>[] = [];
const mockFetchNotes = vi.fn();
const mockCreateNote = vi.fn().mockResolvedValue({ id: 'new-note-id', title: 'Untitled' });
const mockSelectNote = vi.fn();
const mockSetAutoFocusNoteTitle = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      notes: mockNotes,
      notesLoading: false,
      contexts: mockContexts,
      activeContextIds: mockActiveContextIds,
      fetchNotes: mockFetchNotes,
      createNote: mockCreateNote,
      selectNote: mockSelectNote,
      setAutoFocusNoteTitle: mockSetAutoFocusNoteTitle,
    };
    return selector(state);
  },
}));

const fakeNote = (overrides: Record<string, unknown> = {}) => ({
  id: 'note-1',
  title: 'Test Note',
  content: null,
  context_id: null,
  project_id: null,
  is_pinned: false,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-18T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

const fakeContext = (overrides: Record<string, unknown> = {}) => ({
  id: 'ctx-1',
  name: 'Work',
  color: '#3b82f6',
  icon: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('NotesOverviewView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotes = [];
    mockActiveContextIds = [];
    mockContexts = [];
  });

  it('renders "Notes" heading', () => {
    render(<NotesOverviewView />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('shows empty state when no notes', () => {
    render(<NotesOverviewView />);
    expect(screen.getByTestId('notes-empty')).toBeInTheDocument();
  });

  it('renders note rows with titles', () => {
    mockNotes = [
      fakeNote({ id: 'n1', title: 'My First Note' }),
      fakeNote({ id: 'n2', title: 'My Second Note' }),
    ];
    render(<NotesOverviewView />);
    expect(screen.getByText('My First Note')).toBeInTheDocument();
    expect(screen.getByText('My Second Note')).toBeInTheDocument();
    expect(screen.getAllByTestId('note-row')).toHaveLength(2);
  });

  it('pinned notes appear first regardless of sort', () => {
    mockNotes = [
      fakeNote({ id: 'n1', title: 'Regular Note', is_pinned: false, updated_at: '2026-02-20T00:00:00.000Z' }),
      fakeNote({ id: 'n2', title: 'Pinned Note', is_pinned: true, updated_at: '2026-02-01T00:00:00.000Z' }),
    ];
    render(<NotesOverviewView />);
    const rows = screen.getAllByTestId('note-row');
    expect(rows[0]).toHaveTextContent('Pinned Note');
    expect(rows[1]).toHaveTextContent('Regular Note');
  });

  it('shows context badge when note has context', () => {
    mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
    mockNotes = [fakeNote({ id: 'n1', context_id: 'ctx-1' })];
    render(<NotesOverviewView />);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('does not show context badge when note has no context', () => {
    mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
    mockNotes = [fakeNote({ id: 'n1', context_id: null })];
    render(<NotesOverviewView />);
    expect(screen.queryByText('Work')).not.toBeInTheDocument();
  });

  it('filters by active context', () => {
    mockActiveContextIds = ['ctx-work'];
    mockNotes = [
      fakeNote({ id: 'n1', title: 'Work Note', context_id: 'ctx-work' }),
      fakeNote({ id: 'n2', title: 'Personal Note', context_id: 'ctx-personal' }),
    ];
    render(<NotesOverviewView />);
    expect(screen.getByText('Work Note')).toBeInTheDocument();
    expect(screen.queryByText('Personal Note')).not.toBeInTheDocument();
  });

  it('shows all notes when no context filter is active', () => {
    mockActiveContextIds = [];
    mockNotes = [
      fakeNote({ id: 'n1', title: 'Work Note', context_id: 'ctx-work' }),
      fakeNote({ id: 'n2', title: 'Personal Note', context_id: 'ctx-personal' }),
      fakeNote({ id: 'n3', title: 'No Context Note', context_id: null }),
    ];
    render(<NotesOverviewView />);
    expect(screen.getByText('Work Note')).toBeInTheDocument();
    expect(screen.getByText('Personal Note')).toBeInTheDocument();
    expect(screen.getByText('No Context Note')).toBeInTheDocument();
  });

  it('hides notes without context when filter is active', () => {
    mockActiveContextIds = ['ctx-work'];
    mockNotes = [
      fakeNote({ id: 'n1', title: 'No Context Note', context_id: null }),
    ];
    render(<NotesOverviewView />);
    expect(screen.queryByText('No Context Note')).not.toBeInTheDocument();
  });

  it('sorts by updated (default)', () => {
    mockNotes = [
      fakeNote({ id: 'n1', title: 'Older', updated_at: '2026-02-01T00:00:00.000Z' }),
      fakeNote({ id: 'n2', title: 'Newer', updated_at: '2026-02-20T00:00:00.000Z' }),
    ];
    render(<NotesOverviewView />);
    const rows = screen.getAllByTestId('note-row');
    expect(rows[0]).toHaveTextContent('Newer');
    expect(rows[1]).toHaveTextContent('Older');
  });

  it('sorts by created when selected', () => {
    mockNotes = [
      fakeNote({ id: 'n1', title: 'Created Earlier', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-02-20T00:00:00.000Z' }),
      fakeNote({ id: 'n2', title: 'Created Later', created_at: '2026-02-15T00:00:00.000Z', updated_at: '2026-02-01T00:00:00.000Z' }),
    ];
    render(<NotesOverviewView />);
    fireEvent.change(screen.getByTestId('notes-sort'), { target: { value: 'created' } });
    const rows = screen.getAllByTestId('note-row');
    expect(rows[0]).toHaveTextContent('Created Later');
    expect(rows[1]).toHaveTextContent('Created Earlier');
  });

  it('sorts by title A-Z when selected', () => {
    mockNotes = [
      fakeNote({ id: 'n1', title: 'Zebra' }),
      fakeNote({ id: 'n2', title: 'Apple' }),
    ];
    render(<NotesOverviewView />);
    fireEvent.change(screen.getByTestId('notes-sort'), { target: { value: 'title' } });
    const rows = screen.getAllByTestId('note-row');
    expect(rows[0]).toHaveTextContent('Apple');
    expect(rows[1]).toHaveTextContent('Zebra');
  });

  it('clicking a note row calls selectNote', () => {
    mockNotes = [fakeNote({ id: 'n1', title: 'Clickable Note' })];
    render(<NotesOverviewView />);
    fireEvent.click(screen.getByTestId('note-row'));
    expect(mockSelectNote).toHaveBeenCalledWith('n1');
  });

  it('fetches notes on mount', () => {
    render(<NotesOverviewView />);
    expect(mockFetchNotes).toHaveBeenCalled();
  });

  it('shows content preview when note has content', () => {
    mockNotes = [fakeNote({ id: 'n1', content: 'This is the note content' })];
    render(<NotesOverviewView />);
    expect(screen.getByText('This is the note content')).toBeInTheDocument();
  });

  it('strips markdown from content preview', () => {
    mockNotes = [fakeNote({ id: 'n1', content: '# Heading **bold** text' })];
    render(<NotesOverviewView />);
    expect(screen.getByText('Heading bold text')).toBeInTheDocument();
  });

  it('shows only link text, not URL, in content preview', () => {
    mockNotes = [fakeNote({ id: 'n1', content: '[Click here](https://example.com)' })];
    render(<NotesOverviewView />);
    expect(screen.getByText('Click here')).toBeInTheDocument();
  });

  it('does not show URL from markdown link in content preview', () => {
    mockNotes = [fakeNote({ id: 'n1', content: '[Click here](https://example.com)' })];
    render(<NotesOverviewView />);
    expect(screen.queryByText(/example\.com/)).not.toBeInTheDocument();
  });

  it('returns empty string for null content in preview', () => {
    mockNotes = [fakeNote({ id: 'n1', content: null })];
    render(<NotesOverviewView />);
    // The preview element should not exist (no preview text)
    const rows = screen.getAllByTestId('note-row');
    expect(rows[0]).not.toHaveTextContent('undefined');
    expect(rows[0]).not.toHaveTextContent('null');
  });

  it('does not show deleted notes', () => {
    mockNotes = [
      fakeNote({ id: 'n1', title: 'Active Note', deleted_at: null }),
      fakeNote({ id: 'n2', title: 'Deleted Note', deleted_at: '2026-02-19T00:00:00.000Z' }),
    ];
    render(<NotesOverviewView />);
    expect(screen.getByText('Active Note')).toBeInTheDocument();
    expect(screen.queryByText('Deleted Note')).not.toBeInTheDocument();
  });

  describe('note creation', () => {
    it('shows a "New Note" trigger button', () => {
      render(<NotesOverviewView />);
      expect(screen.getByTestId('new-note-trigger')).toBeInTheDocument();
    });

    it('creates note and navigates to detail view when clicked', async () => {
      render(<NotesOverviewView />);
      fireEvent.click(screen.getByTestId('new-note-trigger'));

      await vi.waitFor(() => {
        expect(mockCreateNote).toHaveBeenCalledWith({ title: 'Untitled' });
        expect(mockSelectNote).toHaveBeenCalledWith('new-note-id');
      });
    });
  });
});
