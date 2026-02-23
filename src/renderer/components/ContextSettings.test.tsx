// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ContextSettings } from './ContextSettings';
import type { Context, Task, Project } from '@shared/types';

const mockCreateContext = vi.fn().mockResolvedValue({} as Context);
const mockUpdateContext = vi.fn().mockResolvedValue({} as Context);
const mockDeleteContext = vi.fn().mockResolvedValue(undefined);
const mockOnOpenChange = vi.fn();

let mockContexts: Context[] = [];
let mockTasks: Task[] = [];
let mockProjects: Project[] = [];

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      contexts: mockContexts,
      tasks: mockTasks,
      projects: mockProjects,
      createContext: mockCreateContext,
      updateContext: mockUpdateContext,
      deleteContext: mockDeleteContext,
    };
    return selector(state);
  },
}));

const fakeContext = (overrides: Partial<Context> = {}): Context => ({
  id: 'ctx-1',
  name: 'Work',
  color: '#f97316',
  icon: 'Briefcase',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

const fakeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test task',
  notes: null,
  status: 'inbox',
  when_date: null,
  deadline: null,
  project_id: null,
  heading_id: null,
  context_id: null,
  priority: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  stale_at: null,
  assignee_id: null,
  ...overrides,
});

const fakeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  title: 'Test project',
  description: null,
  status: 'active',
  context_id: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  owner_type: 'user' as const,
  owner_stakeholder_id: null,
  ...overrides,
});

describe('ContextSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContexts = [];
    mockTasks = [];
    mockProjects = [];
  });

  const renderModal = () =>
    render(<ContextSettings open={true} onOpenChange={mockOnOpenChange} />);

  describe('list', () => {
    it('renders all existing contexts', () => {
      mockContexts = [
        fakeContext({ id: 'ctx-1', name: 'Work' }),
        fakeContext({ id: 'ctx-2', name: 'Personal', color: '#22c55e' }),
        fakeContext({ id: 'ctx-3', name: 'Research', color: '#06b6d4' }),
      ];
      renderModal();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
    });

    it('shows colored dot for each context', () => {
      mockContexts = [fakeContext({ color: '#f97316' })];
      renderModal();
      const dot = screen.getByTestId('settings-dot-ctx-1');
      expect(dot).toHaveStyle({ backgroundColor: '#f97316' });
    });

    it('shows Lucide icon for known icon names', () => {
      mockContexts = [fakeContext({ icon: 'Briefcase' })];
      renderModal();
      const row = screen.getByTestId('context-row-ctx-1');
      expect(row.querySelector('.lucide-briefcase')).toBeInTheDocument();
    });

    it('shows empty state when no contexts', () => {
      mockContexts = [];
      renderModal();
      expect(screen.getByText(/no contexts/i)).toBeInTheDocument();
    });
  });

  describe('add', () => {
    it('creates a context when form is filled and saved', async () => {
      mockContexts = [];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /add context/i }));
      const nameInput = screen.getByPlaceholderText(/context name/i);
      fireEvent.change(nameInput, { target: { value: 'Side Projects' } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      });
      expect(mockCreateContext).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Side Projects' }),
      );
    });

    it('does not save when name is empty', () => {
      mockContexts = [];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /add context/i }));
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      expect(mockCreateContext).not.toHaveBeenCalled();
    });

    it('passes selected color to createContext', async () => {
      mockContexts = [];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /add context/i }));
      const nameInput = screen.getByPlaceholderText(/context name/i);
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      // Click a color swatch
      fireEvent.click(screen.getByTestId('color-swatch-#22c55e'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      });
      expect(mockCreateContext).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#22c55e' }),
      );
    });

    it('passes selected icon to createContext', async () => {
      mockContexts = [];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /add context/i }));
      const nameInput = screen.getByPlaceholderText(/context name/i);
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByTestId('icon-option-Home'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      });
      expect(mockCreateContext).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'Home' }),
      );
    });

    it('resets form after successful create', async () => {
      mockContexts = [];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /add context/i }));
      const nameInput = screen.getByPlaceholderText(/context name/i);
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      });
      expect(screen.queryByPlaceholderText(/context name/i)).not.toBeInTheDocument();
    });
  });

  describe('edit', () => {
    it('clicking edit shows input with current name', () => {
      mockContexts = [fakeContext({ name: 'Work' })];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      const input = screen.getByDisplayValue('Work');
      expect(input).toBeInTheDocument();
    });

    it('saving edit calls updateContext with new values', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      const input = screen.getByDisplayValue('Work');
      fireEvent.change(input, { target: { value: 'Office' } });
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      expect(mockUpdateContext).toHaveBeenCalledWith(
        'ctx-1',
        expect.objectContaining({ name: 'Office' }),
      );
    });

    it('cancelling edit reverts to display mode', () => {
      mockContexts = [fakeContext({ name: 'Work' })];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      expect(screen.getByDisplayValue('Work')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByDisplayValue('Work')).not.toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  describe('delete', () => {
    it('clicking delete shows confirmation with item count', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      mockTasks = [
        fakeTask({ id: 't1', context_id: 'ctx-1' }),
        fakeTask({ id: 't2', context_id: 'ctx-1' }),
      ];
      mockProjects = [fakeProject({ id: 'p1', context_id: 'ctx-1' })];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(screen.getByText(/3 items/i)).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('confirming delete calls deleteContext', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
      expect(mockDeleteContext).toHaveBeenCalledWith('ctx-1');
    });

    it('cancelling delete hides confirmation', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
    });

    it('shows 0 items when no tasks or projects use the context', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      mockTasks = [];
      mockProjects = [];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(screen.getByText(/0 items/i)).toBeInTheDocument();
    });
  });

  describe('color picker', () => {
    it('renders color swatches in add form', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /add context/i }));
      expect(screen.getByTestId('color-swatch-#f97316')).toBeInTheDocument();
      expect(screen.getByTestId('color-swatch-#22c55e')).toBeInTheDocument();
      expect(screen.getByTestId('color-swatch-#06b6d4')).toBeInTheDocument();
    });

    it('clicking a swatch selects it (visual ring)', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /add context/i }));
      const swatch = screen.getByTestId('color-swatch-#8b5cf6');
      fireEvent.click(swatch);
      expect(swatch.className).toContain('ring');
    });
  });
});
