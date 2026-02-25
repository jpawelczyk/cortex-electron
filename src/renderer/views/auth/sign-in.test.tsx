// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { SignIn } from './sign-in';

let mockAuthLoading = false;
let mockAuthError: string | null = null;
const mockSignIn = vi.fn();

vi.mock('../../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      signIn: mockSignIn,
      authLoading: mockAuthLoading,
      authError: mockAuthError,
    };
    return selector(state);
  },
}));

describe('SignIn', () => {
  const onSwitchToSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthLoading = false;
    mockAuthError = null;
  });

  it('calls signIn with email and password on submit', async () => {
    const user = userEvent.setup();
    render(<SignIn onSwitchToSignUp={onSwitchToSignUp} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('shows error message when authError is set', () => {
    mockAuthError = 'Invalid login credentials';
    render(<SignIn onSwitchToSignUp={onSwitchToSignUp} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials');
  });

  it('disables submit button when loading', () => {
    mockAuthLoading = true;
    render(<SignIn onSwitchToSignUp={onSwitchToSignUp} />);
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  });
});
