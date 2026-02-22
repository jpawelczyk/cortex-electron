# CLAUDE.md

Cortex is a local-first, AI-native personal operating system — more focused than Notion, more powerful than Obsidian, AI-native but never AI-dependent, highly opinionated. Local SQLite is the source of truth. All reads and writes are instant. Cloud sync is invisible background infrastructure.

## Architecture

```
Electron + React + shadcn/ui + Lucide
           ↓
     Local SQLite (better-sqlite3)
           ↓
     PowerSync (sync layer)
           ↓
     Supabase (Postgres + Auth)
```

**Core principle:** The app NEVER waits on network for user operations. Local DB handles everything. Sync happens async.

## Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron |
| UI | React + Vite + shadcn/ui + Lucide |
| Local DB | SQLite (better-sqlite3) |
| Sync | PowerSync |
| Cloud DB | Supabase Postgres |
| Auth | Supabase Auth |
| State | Zustand |
| Validation | Zod |
| Editor | TipTap (Markdown storage) |

## Commands

```bash
npm run dev       # Electron + Vite dev mode
npm run build     # Production build
npm run test      # Vitest
npm run test:e2e  # Playwright
npm run lint      # Lint + typecheck
npm run rebuild   # Rebuild native modules for Electron
```

**Run `npm run rebuild` after:** `npm install`, upgrading Electron, or switching architectures.

## Structure

```
src/main/        # Electron main process (SQLite, IPC, services)
src/renderer/    # React app (components, views, stores, hooks)
src/shared/      # Shared types, validation (Zod), constants
src/preload/     # Secure IPC bridge
migrations/      # SQLite migrations
```

## Entities

Tasks, Projects, Notes, Meetings, Stakeholders, Daily Notes. Full schema in [SCHEMA](docs/SCHEMA.md).

## Conventions

- **IDs:** UUIDs everywhere (`crypto.randomUUID()`)
- **Deletes:** Soft delete only (`deleted_at`), never hard delete
- **Dates:** ISO 8601 strings
- **Validation:** Zod schemas at IPC boundary
- **State:** Zustand stores, no prop drilling
- **Styling:** Tailwind + shadcn/ui
- **Rich text:** Stored as Markdown

## Testing

- Vitest for unit/integration
- Playwright for E2E
- Test before commit

## Hard Rules

- ❌ NO loading spinners for data operations
- ❌ NO telemetry without explicit opt-in
- ❌ NO hard deletes
- ✅ All operations write to local SQLite first
- ✅ Sync failures are silent and retry automatically
- ✅ App works fully offline
- ✅ Validate all IPC inputs
- ✅ Type everything

## Local-First Principles

1. **Instant writes:** User creates task → written to SQLite → UI updates → done. Sync happens later.
2. **Offline-first:** No network? App works perfectly. Sync catches up when online.
3. **Conflict resolution:** PowerSync handles field-level LWW. Same-field conflicts → last write wins.
4. **No loading states for data:** Data is always local. Only show loading for heavy operations (AI, export).

## Data Flow

```
User Action
    ↓
SQLite Write (0ms)
    ↓
UI Update (immediate)
    ↓
PowerSync Queue (background)
    ↓
Supabase Postgres (async)
    ↓
Other Devices Sync
```

## AI Integration

Two-tier model:

1. **Self-hosted AI (local sync):** AI assistant syncs as a device, queries local SQLite replica directly.
2. **External AI (API):** Future Hono API layer for external AI tools to query cloud Postgres (out of scope for MVP).

AI agents are users with `type: 'ai'` for audit trails.

## Task Status

Things-inspired: `inbox` → `today` | `upcoming` | `anytime` | `someday` → `logbook`

- `when_date` = "I plan to work on this day"
- `deadline` = "Must be done by this date"
- Tasks inherit context from project (hard rule)

## Future Additions

| When | What |
|------|------|
| When needed | Yjs for text CRDTs (character-level merge) |
| When needed | Hono API layer (AI/external access) |
| At scale | Self-hosted PowerSync + Postgres |
| Later | Mobile (React Native + PowerSync SDK) |

## Docs

| Doc | Content |
|-----|---------|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Overview, stack, data model |
| [SCHEMA](docs/SCHEMA.md) | Full SQL schema |
| [TASK_SYSTEM](docs/TASK_SYSTEM.md) | Task statuses, dates, context |
| [PROJECTS](docs/PROJECTS.md) | Project statuses, completion rules, staleness |
| [CONTEXTS](docs/CONTEXTS.md) | Context system, filtering, selector UI |
| [NOTES](docs/NOTES.md) | Notes system, markdown editing |
| [STATE](docs/STATE.md) | Zustand stores |
| [IPC](docs/IPC.md) | Main/renderer communication |
| [SYNC](docs/SYNC.md) | PowerSync setup, conflict handling |
| [AI](docs/AI.md) | AI integration patterns |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Visual language |
| [TESTING](docs/TESTING.md) | Testing patterns |
