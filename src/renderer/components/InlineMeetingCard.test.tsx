// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InlineMeetingCard } from './InlineMeetingCard';

const mockCreateMeeting = vi.fn();
const mockNavigateTab = vi.fn();
const mockOnClose = vi.fn();
let mockActiveContextIds: string[] = [];

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createMeeting: mockCreateMeeting,
      navigateTab: mockNavigateTab,
      activeContextIds: mockActiveContextIds,
    };
    return selector(state);
  },
}));

describe('InlineMeetingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveContextIds = [];
    mockCreateMeeting.mockResolvedValue({
      id: 'new-meeting',
      title: 'Test',
    });
  });

  // --- Auto-apply context from filter ---

  it('auto-applies context_id when single context filter is active', async () => {
    mockActiveContextIds = ['ctx-1'];
    render(<InlineMeetingCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New meeting');

    fireEvent.change(input, { target: { value: 'Filtered meeting' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockCreateMeeting).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Filtered meeting', context_id: 'ctx-1' })
      );
    });
  });

  it('does not auto-apply context_id when filter is empty', () => {
    render(<InlineMeetingCard onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('New meeting');

    fireEvent.change(input, { target: { value: 'Unfiltered meeting' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateMeeting).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unfiltered meeting' })
    );
    expect(mockCreateMeeting).toHaveBeenCalledWith(
      expect.not.objectContaining({ context_id: expect.anything() })
    );
  });
});
