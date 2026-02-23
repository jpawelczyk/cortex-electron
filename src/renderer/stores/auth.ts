import { StateCreator } from 'zustand';

export interface AuthSlice {
  authUser: unknown | null;
  authSession: unknown | null;
  authLoading: boolean;
  authError: string | null;
  authConfigured: boolean | null; // null = not yet checked

  checkSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  authUser: null,
  authSession: null,
  authLoading: true,
  authError: null,
  authConfigured: null,

  checkSession: async () => {
    try {
      // Check if auth/sync is configured at all
      const configured = await window.cortex.auth.isConfigured();
      if (!configured) {
        // No sync config — skip auth, go straight to app
        set({ authConfigured: false, authLoading: false, authSession: 'offline' });
        return;
      }

      set({ authConfigured: true });

      const result = await window.cortex.auth.getSession() as {
        success: boolean;
        data?: { session: unknown & { user?: unknown } | null };
        error?: string;
      };

      if (!result.success || !result.data?.session) {
        set({ authLoading: false, authSession: null, authUser: null });
        return;
      }

      const session = result.data.session as { user?: unknown };
      set({ authSession: session, authUser: session.user ?? null, authLoading: false });

      // Connect sync if we have a session
      await window.cortex.sync.connect();
    } catch (err) {
      console.error('[AuthSlice] checkSession failed:', err);
      set({ authLoading: false, authSession: null, authUser: null });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ authLoading: true, authError: null });

    const result = await window.cortex.auth.signIn({ email, password }) as {
      success: boolean;
      data?: { session: unknown & { user?: unknown }; user: unknown };
      error?: string;
    };

    if (!result.success) {
      set({ authLoading: false, authError: result.error ?? 'Sign in failed' });
      return;
    }

    const session = result.data?.session as { user?: unknown } | undefined;
    set({
      authSession: session ?? null,
      authUser: result.data?.user ?? null,
      authLoading: false,
      authError: null,
    });

    // Connect sync after successful sign in
    await window.cortex.sync.connect();
  },

  signUp: async (email: string, password: string) => {
    set({ authLoading: true, authError: null });

    const result = await window.cortex.auth.signUp({ email, password }) as {
      success: boolean;
      data?: { session: unknown | null; user: unknown };
      error?: string;
    };

    if (!result.success) {
      set({ authLoading: false, authError: result.error ?? 'Sign up failed' });
      return;
    }

    set({
      authUser: result.data?.user ?? null,
      authSession: result.data?.session ?? null,
      authLoading: false,
      authError: null,
    });

    // Connect sync if session was returned (auto-confirmed user)
    if (result.data?.session) {
      await window.cortex.sync.connect();
    }
  },

  signOut: async () => {
    await window.cortex.sync.disconnect();
    await window.cortex.auth.signOut();
    set({ authUser: null, authSession: null, authError: null });
  },
});
