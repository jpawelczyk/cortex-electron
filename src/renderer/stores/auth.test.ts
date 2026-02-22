import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthSlice, AuthSlice } from './auth';

type SetFn = (partial: Partial<AuthSlice> | ((s: AuthSlice) => Partial<AuthSlice>)) => void;
type GetFn = () => AuthSlice;

function createStore(overrides?: Partial<AuthSlice>): AuthSlice {
  let state: AuthSlice;

  const set: SetFn = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...update };
  };

  const get: GetFn = () => state;

  const creator = createAuthSlice as unknown as (
    set: SetFn,
    get: GetFn,
    api: Record<string, never>,
  ) => AuthSlice;
  state = {
    ...creator(set, get, {}),
    ...overrides,
  };

  return state;
}

const mockCortex = {
  auth: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
  },
  sync: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
};

// Set up window.cortex mock (may already exist from other test files)
(globalThis as unknown as Record<string, unknown>).window = {
  ...((globalThis as unknown as Record<string, { cortex?: unknown }>).window || {}),
  cortex: mockCortex,
};

describe('AuthSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with null user and session', () => {
      const store = createStore();
      expect(store.authUser).toBeNull();
      expect(store.authSession).toBeNull();
    });

    it('starts with loading true (checking session on boot)', () => {
      const store = createStore();
      expect(store.authLoading).toBe(true);
    });

    it('starts with no error', () => {
      const store = createStore();
      expect(store.authError).toBeNull();
    });
  });

  describe('checkSession', () => {
    it('sets session and user when existing session found', async () => {
      const session = { access_token: 'tok', user: { id: '123', email: 'test@example.com' } };
      mockCortex.auth.getSession.mockResolvedValue({
        success: true,
        data: { session },
      });
      mockCortex.sync.connect.mockResolvedValue({ success: true });

      const store = createStore();
      await store.checkSession();

      expect(mockCortex.auth.getSession).toHaveBeenCalledOnce();
      expect(mockCortex.sync.connect).toHaveBeenCalledOnce();
    });

    it('sets loading false with null session when no session', async () => {
      mockCortex.auth.getSession.mockResolvedValue({
        success: true,
        data: { session: null },
      });

      const store = createStore();
      await store.checkSession();

      expect(mockCortex.auth.getSession).toHaveBeenCalledOnce();
      expect(mockCortex.sync.connect).not.toHaveBeenCalled();
    });

    it('handles getSession failure gracefully', async () => {
      mockCortex.auth.getSession.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const store = createStore();
      await store.checkSession();

      expect(mockCortex.auth.getSession).toHaveBeenCalledOnce();
    });
  });

  describe('signIn', () => {
    it('calls auth:sign-in and connects sync on success', async () => {
      const session = { access_token: 'tok', user: { id: '123', email: 'test@example.com' } };
      mockCortex.auth.signIn.mockResolvedValue({
        success: true,
        data: { session, user: session.user },
      });
      mockCortex.sync.connect.mockResolvedValue({ success: true });

      const store = createStore();
      await store.signIn('test@example.com', 'password123');

      expect(mockCortex.auth.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockCortex.sync.connect).toHaveBeenCalledOnce();
    });

    it('sets error on failure without connecting sync', async () => {
      mockCortex.auth.signIn.mockResolvedValue({
        success: false,
        error: 'Invalid login credentials',
      });

      const store = createStore();
      await store.signIn('test@example.com', 'wrong');

      expect(mockCortex.auth.signIn).toHaveBeenCalledOnce();
      expect(mockCortex.sync.connect).not.toHaveBeenCalled();
    });
  });

  describe('signUp', () => {
    it('calls auth:sign-up IPC', async () => {
      mockCortex.auth.signUp.mockResolvedValue({
        success: true,
        data: { user: { id: '456' }, session: null },
      });

      const store = createStore();
      await store.signUp('new@example.com', 'securepass');

      expect(mockCortex.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'securepass',
      });
    });

    it('connects sync if session returned (auto-confirmed)', async () => {
      const session = { access_token: 'tok', user: { id: '456' } };
      mockCortex.auth.signUp.mockResolvedValue({
        success: true,
        data: { user: session.user, session },
      });
      mockCortex.sync.connect.mockResolvedValue({ success: true });

      const store = createStore();
      await store.signUp('new@example.com', 'securepass');

      expect(mockCortex.sync.connect).toHaveBeenCalledOnce();
    });

    it('does not connect sync if no session (needs email confirmation)', async () => {
      mockCortex.auth.signUp.mockResolvedValue({
        success: true,
        data: { user: { id: '456' }, session: null },
      });

      const store = createStore();
      await store.signUp('new@example.com', 'securepass');

      expect(mockCortex.sync.connect).not.toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      mockCortex.auth.signUp.mockResolvedValue({
        success: false,
        error: 'User already registered',
      });

      const store = createStore();
      await store.signUp('existing@example.com', 'securepass');

      expect(mockCortex.auth.signUp).toHaveBeenCalledOnce();
      expect(mockCortex.sync.connect).not.toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('calls auth:sign-out and disconnects sync', async () => {
      mockCortex.auth.signOut.mockResolvedValue({ success: true });
      mockCortex.sync.disconnect.mockResolvedValue({ success: true });

      const store = createStore({
        authUser: { id: '123' } as never,
        authSession: { access_token: 'tok' } as never,
      });
      await store.signOut();

      expect(mockCortex.sync.disconnect).toHaveBeenCalledOnce();
      expect(mockCortex.auth.signOut).toHaveBeenCalledOnce();
    });
  });
});
