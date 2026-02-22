# Cortex Coding Agent Handoff

## Context

Cortex is a local-first personal OS (tasks, projects, notes, meetings, stakeholders). You're building on an existing Electron + React codebase that needs to be upgraded from direct SQLite to PowerSync + Supabase for sync and auth.

## Your Mission

Transform the existing cortex-electron codebase into a sync-enabled local-first app using PowerSync and Supabase.

## Read These First

1. **CLAUDE.md** — Architecture, conventions, hard rules
2. **docs/ARCHITECTURE.md** — Stack overview
3. **docs/SYNC.md** — PowerSync integration details
4. **docs/SCHEMA.md** — Database schema
5. **docs/IPC.md** — Main/renderer communication patterns

## Current State

The codebase has:
- ✅ Electron + Vite + React + shadcn/ui
- ✅ better-sqlite3 with direct queries
- ✅ Zustand stores for UI state
- ✅ TipTap editor for notes
- ✅ IPC layer with Zod validation
- ✅ Full schema (tasks, projects, notes, meetings, stakeholders, daily notes)
- ✅ Working UI components

What's missing:
- ❌ PowerSync integration (sync layer)
- ❌ Supabase Auth (replacing Better Auth)
- ❌ Supabase Postgres setup (cloud DB)

## Your Tasks

### Phase 1: PowerSync Integration

1. **Install dependencies:**
   ```bash
   npm install @powersync/node @powersync/common @supabase/supabase-js
   ```

2. **Create PowerSync schema** (`src/main/sync/schema.ts`):
   - Define AppSchema matching existing SQLite tables
   - Use PowerSync's schema format

3. **Create Supabase connector** (`src/main/sync/connector.ts`):
   - Implement `PowerSyncBackendConnector`
   - Handle `fetchCredentials()` with Supabase session
   - Handle `uploadData()` to push changes to Supabase

4. **Initialize PowerSync database** (`src/main/db/index.ts`):
   - Replace direct better-sqlite3 with PowerSync
   - PowerSync uses better-sqlite3 internally
   - Connect on app startup

5. **Update data access layer:**
   - Replace raw SQL queries with PowerSync reactive queries
   - Use `db.watch()` for reactive data
   - Use `db.execute()` for writes

### Phase 2: Supabase Auth

1. **Remove Better Auth** — Delete existing auth code

2. **Add Supabase Auth:**
   - Sign up / sign in flows
   - Session management
   - Token refresh

3. **Connect auth to PowerSync:**
   - PowerSync connector uses Supabase JWT
   - Sync starts after auth

### Phase 3: Supabase Postgres Setup

1. **Create Supabase project**

2. **Set up tables** matching local schema:
   - tasks, projects, notes, meetings, stakeholders, daily_notes
   - Add `user_id` column for multi-tenancy
   - Enable Row Level Security (RLS)

3. **Configure PowerSync Cloud** (or self-host):
   - Connect to Supabase
   - Define sync rules

### Phase 4: Test Sync

1. Run app, create data
2. Verify data appears in Supabase
3. Modify in Supabase, verify local update
4. Test offline → online flow

## Key Constraints

From CLAUDE.md Hard Rules:
- ❌ NO code before tests (TDD)
- ❌ NO loading spinners for data operations
- ❌ NO hard deletes (soft delete only)
- ✅ All operations write to local SQLite first
- ✅ App works fully offline
- ✅ Validate all IPC inputs with Zod

## Architecture Principles

**Local-first means:**
```
User Action → SQLite (instant) → UI Update → Sync (background)
```

**Never:**
```
User Action → Network → Wait → UI Update
```

## File Structure

```
src/
  main/
    db/
      index.ts        # PowerSync database init
      schema.ts       # PowerSync schema definition
    sync/
      connector.ts    # Supabase connector
      rules.ts        # Sync rules (if self-hosting)
    ipc/
      *.ts            # IPC handlers (update for PowerSync)
  renderer/
    hooks/
      use-*.ts        # Data hooks (update for reactive queries)
  shared/
    types/
    validations/
```

## Environment Variables

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
POWERSYNC_URL=https://xxx.powersync.com  # Or self-hosted
```

## Resources

- [PowerSync Docs](https://docs.powersync.com)
- [PowerSync + Supabase Guide](https://docs.powersync.com/integration-guides/supabase)
- [PowerSync Electron Example](https://github.com/powersync-ja/powersync-js/tree/main/demos/example-electron-node)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

## Definition of Done

- [ ] App starts and shows existing UI
- [ ] User can sign up / sign in via Supabase
- [ ] Data writes to local SQLite instantly
- [ ] Data syncs to Supabase Postgres in background
- [ ] Changes on another device sync back
- [ ] App works offline, syncs when back online
- [ ] All existing tests pass
- [ ] New sync code has tests

## Questions?

If anything is unclear, check the docs/ folder first. The architecture decisions are documented there.
