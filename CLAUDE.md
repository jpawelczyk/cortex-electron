# CLAUDE.md

> Local-first personal OS. Electron + React + SQLite + Tailwind.

## Commands

```bash
npm run dev      # Start dev mode (Electron + Vite)
npm run test     # Run tests (Vitest)
npm run test:e2e # Run E2E tests (Playwright)
npm run build    # Production build
npm run lint     # Lint + typecheck
```

## Structure

```
src/main/        # Electron main process (SQLite, IPC, services)
src/renderer/    # React app (components, views, stores, hooks)
src/shared/      # Shared types, validation (Zod), constants
src/preload/     # Secure IPC bridge
migrations/      # SQLite migrations
```

## Conventions

- **IDs:** UUIDs everywhere (`crypto.randomUUID()`)
- **Deletes:** Soft delete only (`deleted_at`), never hard delete
- **Dates:** ISO 8601 strings
- **Validation:** Zod schemas at IPC boundary
- **State:** Zustand stores, no prop drilling
- **Styling:** Tailwind + shadcn/ui components
- **Rich text:** Stored as Markdown

## Hard Rules

- ❌ NO network calls without explicit user opt-in
- ❌ NO telemetry
- ❌ NO hard deletes
- ✅ Tests before merge (TDD)
- ✅ Validate all IPC inputs
- ✅ Type everything

## Task Status

Things-inspired: `inbox` → `today` | `upcoming` | `anytime` | `someday` → `logbook`

- `when_date` = "I plan to work on this day"
- `deadline` = "Must be done by this date"
- Tasks inherit context from project (hard rule)

## Docs

| Doc | Content |
|-----|---------|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Overview, stack, data model |
| [SCHEMA](docs/SCHEMA.md) | Full SQL schema |
| [TASK_SYSTEM](docs/TASK_SYSTEM.md) | Task statuses, dates, context |
| [STATE](docs/STATE.md) | Zustand stores |
| [IPC](docs/IPC.md) | Main/renderer communication |
| [SYNC](docs/SYNC.md) | Sync-ready patterns |
| [AI](docs/AI.md) | AI integration layer |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Visual language |
