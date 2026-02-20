// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InlineProjectCard } from './InlineProjectCard';

const mockCreateProject = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createProject: mockCreateProject,
    };
    return selector(state);
  },
}));

describe('InlineProjectCard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateProject.mockResolvedValue({
      id: 'new-proj',
      title: 'Test',
      status: 'planned',
    });
  });

  it('renders a title input with placeholder', () => {
    render(<InlineProjectCard onClose={mockOnClose} />);
    expect(screen.getByPlaceholderText('New project')).toBeInTheDocument();
  });

  it('auto-focuses the title input', () => {
    render(<InlineProjectCard onClose={mockOnClose} />);
    expect(screen.getByPlaceholderText('New project')).toHaveFocus();
  });

  it('creates a project with status planned on Enter and closes', async () => {
    render(<InlineProjectCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New project');

    fireEvent.change(input, { target: { value: 'My Project' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateProject).toHaveBeenCalledWith({
      title: 'My Project',
      status: 'planned',
    });
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('does not create when title is empty', () => {
    render(<InlineProjectCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New project');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('does not create when title is only whitespace', () => {
    render(<InlineProjectCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New project');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('trims whitespace from the title', () => {
    render(<InlineProjectCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New project');

    fireEvent.change(input, { target: { value: '  Trimmed  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateProject).toHaveBeenCalledWith({
      title: 'Trimmed',
      status: 'planned',
    });
  });

  it('dismisses on Escape without creating', () => {
    render(<InlineProjectCard onClose={mockOnClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('saves on click outside when title has content', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <InlineProjectCard onClose={mockOnClose} />
      </div>,
    );
    const input = screen.getByPlaceholderText('New project');
    fireEvent.change(input, { target: { value: 'Click away project' } });
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(mockCreateProject).toHaveBeenCalledWith({
      title: 'Click away project',
      status: 'planned',
    });
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('dismisses on click outside when title is empty', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <InlineProjectCard onClose={mockOnClose} />
      </div>,
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(mockCreateProject).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('does not dismiss when clicking inside the card', () => {
    render(<InlineProjectCard onClose={mockOnClose} />);
    fireEvent.mouseDown(screen.getByTestId('inline-project-card'));

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
