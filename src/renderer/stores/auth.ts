import { StateCreator } from 'zustand';
import type { SettingsSlice } from './settings';

export interface AuthSlice {
  authUser: unknown | null;
  authSession: unknown | null;
  authLoading: boolean;
  authError: string | null;
  authConfigured: boolean | null; // null = not yet checked

  checkSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function hydrateProfileFromUser(
  user: unknown,
  setUserProfile: SettingsSlice['setUserProfile'],
): void {
  const meta = (user as { user_metadata?: { first_name?: string; last_name?: string } } | null)
    ?.user_metadata;
  if (meta) {
    setUserProfile(meta.first_name ?? '', meta.last_name ?? '');
  }
}

export const createAuthSlice: StateCreator<AuthSlice & SettingsSlice, [], [], AuthSlice> = (set, get) => ({
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

      if (session.user) {
        hydrateProfileFromUser(session.user, get().setUserProfile);
      }

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
    const user = result.data?.user ?? null;
    set({
      authSession: session ?? null,
      authUser: user,
      authLoading: false,
      authError: null,
    });

    if (user) {
      hydrateProfileFromUser(user, get().setUserProfile);
    }

    // Connect sync after successful sign in
    await window.cortex.sync.connect();
  },

  signUp: async (email: string, password: string, firstName?: string, lastName?: string) => {
    set({ authLoading: true, authError: null });

    const result = await window.cortex.auth.signUp({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }) as {
      success: boolean;
      data?: { session: unknown | null; user: unknown };
      error?: string;
    };

    if (!result.success) {
      set({ authLoading: false, authError: result.error ?? 'Sign up failed' });
      return;
    }

    const user = result.data?.user ?? null;
    set({
      authUser: user,
      authSession: result.data?.session ?? null,
      authLoading: false,
      authError: null,
    });

    if (user) {
      hydrateProfileFromUser(user, get().setUserProfile);
    }

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
