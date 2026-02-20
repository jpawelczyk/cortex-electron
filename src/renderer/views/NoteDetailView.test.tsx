// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { Note, Context, Project } from '@shared/types';

// Mock MarkdownEditor to avoid milkdown DOM issues
vi.mock('../components/MarkdownEditor', () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="mock-editor" value={value} onChange={e => onChange(e.target.value)} />
  ),
}));

const mockUpdateNote = vi.fn();
const mockDeleteNote = vi.fn();
const mockDeselectNote = vi.fn();

let mockNotes: Note[] = [];
let mockContexts: Context[] = [];
let mockProjects: Project[] = [];

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      notes: mockNotes,
      updateNote: mockUpdateNote,
      deleteNote: mockDeleteNote,
      deselectNote: mockDeselectNote,
      contexts: mockContexts,
      projects: mockProjects,
    };
    return selector(state as unknown as Record<string, unknown>);
  },
}));

import { NoteDetailView } from './NoteDetailView';

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'note-1',
    title: 'My Test Note',
    content: '# Hello world',
    context_id: null,
    project_id: null,
    is_pinned: false,
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-18T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function makeContext(overrides?: Partial<Context>): Context {
  return {
    id: 'ctx-1',
    name: 'Work',
    color: '#00ff00',
    icon: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: 'proj-1',
    title: 'Test Project',
    description: null,
    status: 'active',
    context_id: null,
    sort_order: 0,
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-18T00:00:00.000Z',
    completed_at: null,
    deleted_at: null,
    ...overrides,
  };
}

describe('NoteDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockNotes = [makeNote()];
    mockContexts = [];
    mockProjects = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Rendering ---

  it('renders note title in input', () => {
    render(<NoteDetailView noteId="note-1" />);
    expect(screen.getByDisplayValue('My Test Note')).toBeInTheDocument();
  });

  it('renders the mock editor with note content', () => {
    render(<NoteDetailView noteId="note-1" />);
    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();
  });

  it('renders "Note not found" when note does not exist', () => {
    mockNotes = [];
    render(<NoteDetailView noteId="nonexistent" />);
    expect(screen.getByText('Note not found')).toBeInTheDocument();
  });

  // --- Back navigation ---

  it('renders back button', () => {
    render(<NoteDetailView noteId="note-1" />);
    expect(screen.getByTestId('back-to-notes')).toBeInTheDocument();
  });

  it('clicking back button calls deselectNote', () => {
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('back-to-notes'));
    expect(mockDeselectNote).toHaveBeenCalled();
  });

  // --- Pin toggle ---

  it('pin toggle calls updateNote with is_pinned toggled (false -> true)', () => {
    mockNotes = [makeNote({ is_pinned: false })];
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('pin-toggle'));
    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { is_pinned: true });
  });

  it('pin toggle calls updateNote with is_pinned toggled (true -> false)', () => {
    mockNotes = [makeNote({ is_pinned: true })];
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('pin-toggle'));
    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { is_pinned: false });
  });

  // --- Delete confirmation ---

  it('shows delete button initially', () => {
    render(<NoteDetailView noteId="note-1" />);
    expect(screen.getByTestId('delete-note')).toBeInTheDocument();
  });

  it('clicking delete shows confirmation', () => {
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('delete-note'));
    expect(screen.getByTestId('confirm-delete')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-delete')).toBeInTheDocument();
  });

  it('confirming delete calls deleteNote and deselectNote', async () => {
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('delete-note'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-delete'));
    });
    expect(mockDeleteNote).toHaveBeenCalledWith('note-1');
    expect(mockDeselectNote).toHaveBeenCalled();
  });

  it('cancel delete hides confirmation', () => {
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('delete-note'));
    fireEvent.click(screen.getByTestId('cancel-delete'));
    expect(screen.queryByTestId('confirm-delete')).not.toBeInTheDocument();
    expect(mockDeleteNote).not.toHaveBeenCalled();
  });

  // --- Debounced title editing ---

  it('does not save title immediately on typing', () => {
    render(<NoteDetailView noteId="note-1" />);
    const input = screen.getByDisplayValue('My Test Note');
    fireEvent.change(input, { target: { value: 'Updated title' } });
    expect(mockUpdateNote).not.toHaveBeenCalled();
  });

  it('auto-saves title after debounce delay', () => {
    render(<NoteDetailView noteId="note-1" />);
    const input = screen.getByDisplayValue('My Test Note');
    fireEvent.change(input, { target: { value: 'Updated title' } });
    vi.advanceTimersByTime(500);
    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { title: 'Updated title' });
  });

  // --- Context picker ---

  it('shows "No context" when note has no context', () => {
    mockNotes = [makeNote({ context_id: null })];
    render(<NoteDetailView noteId="note-1" />);
    expect(screen.getByTestId('note-context-picker')).toHaveTextContent('No context');
  });

  it('shows context name when note has a context', () => {
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    mockNotes = [makeNote({ context_id: 'ctx-1' })];
    render(<NoteDetailView noteId="note-1" />);
    expect(screen.getByTestId('note-context-picker')).toHaveTextContent('Work');
  });

  it('opens context picker and shows contexts', () => {
    mockContexts = [
      makeContext({ id: 'ctx-1', name: 'Work' }),
      makeContext({ id: 'ctx-2', name: 'Personal' }),
    ];
    mockNotes = [makeNote({ context_id: null })];
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('note-context-picker'));
    expect(screen.getByRole('option', { name: /none/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /work/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /personal/i })).toBeInTheDocument();
  });

  it('calls updateNote with context_id when context is selected', () => {
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    mockNotes = [makeNote({ context_id: null })];
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('note-context-picker'));
    fireEvent.click(screen.getByRole('option', { name: /work/i }));
    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { context_id: 'ctx-1' });
  });

  it('calls updateNote with null when "None" context is selected', () => {
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    mockNotes = [makeNote({ context_id: 'ctx-1' })];
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('note-context-picker'));
    fireEvent.click(screen.getByRole('option', { name: /none/i }));
    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { context_id: null });
  });

  // --- Project picker ---

  it('shows "No project" when note has no project', () => {
    mockNotes = [makeNote({ project_id: null })];
    render(<NoteDetailView noteId="note-1" />);
    expect(screen.getByTestId('note-project-picker')).toHaveTextContent('No project');
  });

  it('shows project title when note has a project', () => {
    mockProjects = [makeProject({ id: 'proj-1', title: 'Test Project' })];
    mockNotes = [makeNote({ project_id: 'proj-1' })];
    render(<NoteDetailView noteId="note-1" />);
    expect(screen.getByTestId('note-project-picker')).toHaveTextContent('Test Project');
  });

  it('opens project picker and shows projects', () => {
    mockProjects = [
      makeProject({ id: 'proj-1', title: 'Project A' }),
      makeProject({ id: 'proj-2', title: 'Project B' }),
    ];
    mockNotes = [makeNote({ project_id: null })];
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('note-project-picker'));
    expect(screen.getByRole('option', { name: /none/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /project a/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /project b/i })).toBeInTheDocument();
  });

  it('calls updateNote with project_id when project is selected', () => {
    mockProjects = [makeProject({ id: 'proj-1', title: 'Test Project' })];
    mockNotes = [makeNote({ project_id: null })];
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('note-project-picker'));
    fireEvent.click(screen.getByRole('option', { name: /test project/i }));
    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { project_id: 'proj-1' });
  });

  it('calls updateNote with null when "None" project is selected', () => {
    mockProjects = [makeProject({ id: 'proj-1', title: 'Test Project' })];
    mockNotes = [makeNote({ project_id: 'proj-1' })];
    render(<NoteDetailView noteId="note-1" />);
    fireEvent.click(screen.getByTestId('note-project-picker'));
    fireEvent.click(screen.getByRole('option', { name: /none/i }));
    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { project_id: null });
  });
});
