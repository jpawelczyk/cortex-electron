# Auth & Sync Connection Handoff

## Context

PowerSync + Supabase integration is complete. Now we need:
1. Auth UI (sign up / sign in with Supabase Auth)
2. Connect sync after successful auth

## Read First

- `CLAUDE.md` — Hard rules, conventions
- `src/main/sync/connector.ts` — Supabase connector (already built)
- `src/main/db/index.ts` — PowerSync database init

## Task 1: Auth UI

Create sign-in and sign-up screens using Supabase Auth.

### Files to Create

```
src/renderer/
  views/
    auth/
      sign-in.tsx       # Sign in form
      sign-up.tsx       # Sign up form
      auth-layout.tsx   # Shared layout wrapper
  hooks/
    use-auth.ts         # Auth state hook
  stores/
    auth-store.ts       # Zustand store for auth state
```

### Auth Store

```typescript
// src/renderer/stores/auth-store.ts
import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}
```

### Sign In Component

```typescript
// src/renderer/views/auth/sign-in.tsx
// Form with email + password
// On submit: call IPC to main process for Supabase signIn
// On success: store session, redirect to app
// On error: show error message
```

### Sign Up Component

```typescript
// src/renderer/views/auth/sign-up.tsx
// Form with email + password + confirm password
// On submit: call IPC to main process for Supabase signUp
// Handle email confirmation flow if enabled
```

### IPC Handlers for Auth

```typescript
// src/main/ipc/auth.ts
import { ipcMain } from 'electron';
import { SupabaseConnector } from '../sync/connector';

// Get or create connector instance
let connector: SupabaseConnector | null = null;

export function getConnector(): SupabaseConnector {
  if (!connector) {
    connector = new SupabaseConnector({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
      powersyncUrl: process.env.POWERSYNC_URL!,
    });
  }
  return connector;
}

ipcMain.handle('auth:sign-in', async (_, { email, password }) => {
  const { data, error } = await getConnector().client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
});

ipcMain.handle('auth:sign-up', async (_, { email, password }) => {
  const { data, error } = await getConnector().client.auth.signUp({
    email,
    password,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
});

ipcMain.handle('auth:sign-out', async () => {
  const { error } = await getConnector().client.auth.signOut();
  if (error) return { success: false, error: error.message };
  return { success: true };
});

ipcMain.handle('auth:get-session', async () => {
  const { data, error } = await getConnector().client.auth.getSession();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
});
```

### Preload Bridge

```typescript
// Add to src/preload/index.ts
auth: {
  signIn: (credentials: { email: string; password: string }) => 
    ipcRenderer.invoke('auth:sign-in', credentials),
  signUp: (credentials: { email: string; password: string }) => 
    ipcRenderer.invoke('auth:sign-up', credentials),
  signOut: () => ipcRenderer.invoke('auth:sign-out'),
  getSession: () => ipcRenderer.invoke('auth:get-session'),
}
```

## Task 2: Connect Sync After Auth

After successful auth, connect PowerSync to start syncing.

### Update Main Process

```typescript
// src/main/index.ts (or wherever app init happens)
import { getPowerSyncDatabase } from './db';
import { getConnector } from './ipc/auth';

// After auth success, connect sync
ipcMain.handle('sync:connect', async () => {
  try {
    const db = getPowerSyncDatabase();
    const connector = getConnector();
    await db.connect(connector);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('sync:disconnect', async () => {
  try {
    const db = getPowerSyncDatabase();
    await db.disconnect();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
```

### Auth Flow

```
App Start
    ↓
Check existing session (auth:get-session)
    ↓
┌─────────────────────────────────────┐
│ Has valid session?                  │
├──────────────┬──────────────────────┤
│     YES      │         NO           │
│      ↓       │          ↓           │
│ sync:connect │  Show Sign In screen │
│      ↓       │          ↓           │
│   Show App   │  User signs in       │
│              │          ↓           │
│              │  auth:sign-in        │
│              │          ↓           │
│              │  sync:connect        │
│              │          ↓           │
│              │      Show App        │
└──────────────┴──────────────────────┘
```

### App Entry Point

```typescript
// src/renderer/App.tsx
function App() {
  const { session, loading } = useAuth();
  
  useEffect(() => {
    // Check for existing session on mount
    window.api.auth.getSession().then(result => {
      if (result.success && result.data.session) {
        setSession(result.data.session);
        // Connect sync
        window.api.sync.connect();
      }
    });
  }, []);

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthRoutes />;
  return <AppRoutes />;
}
```

## Testing

Write tests first (TDD):

```typescript
// src/main/ipc/auth.test.ts
describe('auth:sign-in', () => {
  it('returns session on valid credentials', async () => { ... });
  it('returns error on invalid credentials', async () => { ... });
});

// src/renderer/views/auth/sign-in.test.tsx
describe('SignIn', () => {
  it('calls auth:sign-in on form submit', async () => { ... });
  it('shows error message on failure', async () => { ... });
  it('redirects to app on success', async () => { ... });
});
```

## UI Guidelines

From `docs/DESIGN_SYSTEM.md`:
- Dark theme
- shadcn/ui components (Input, Button, Card)
- Minimal chrome
- No loading spinners for instant operations (auth is network, so spinner OK here)

## Definition of Done

- [ ] Sign in form works with Supabase
- [ ] Sign up form works with Supabase  
- [ ] Session persists across app restarts
- [ ] Sync connects automatically after auth
- [ ] Sign out disconnects sync and clears session
- [ ] Auth state available in Zustand store
- [ ] All new code has tests
- [ ] Existing tests still pass
