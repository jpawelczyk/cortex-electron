// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { SignUp } from './sign-up';

let mockAuthLoading = false;
let mockAuthError: string | null = null;
const mockSignUp = vi.fn();

vi.mock('../../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      signUp: mockSignUp,
      authLoading: mockAuthLoading,
      authError: mockAuthError,
    };
    return selector(state);
  },
}));

describe('SignUp', () => {
  const onSwitchToSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthLoading = false;
    mockAuthError = null;
  });

  it('renders email, password, and confirm password fields', () => {
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  it('renders sign up button', () => {
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('renders link to sign in', () => {
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    const link = screen.getByRole('button', { name: 'Sign in' });
    expect(link).toBeInTheDocument();
  });

  it('calls onSwitchToSignIn when sign in link clicked', async () => {
    const user = userEvent.setup();
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSwitchToSignIn).toHaveBeenCalledOnce();
  });

  it('calls signUp with email and password on submit', async () => {
    const user = userEvent.setup();
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass');
    await user.type(screen.getByLabelText('Confirm password'), 'securepass');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'securepass');
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), '12345');
    await user.type(screen.getByLabelText('Confirm password'), '12345');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 6 characters');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows authError from store', () => {
    mockAuthError = 'User already registered';
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    expect(screen.getByRole('alert')).toHaveTextContent('User already registered');
  });

  it('does not show error when no errors', () => {
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables submit button when loading', () => {
    mockAuthLoading = true;
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    expect(screen.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
  });

  it('shows loading text on button while loading', () => {
    mockAuthLoading = true;
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    expect(screen.getByRole('button', { name: 'Creating account...' })).toBeInTheDocument();
  });

  it('autofocuses the email field', () => {
    render(<SignUp onSwitchToSignIn={onSwitchToSignIn} />);
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });
});
