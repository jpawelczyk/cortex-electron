# CLAUDE.md

Cortex is a local-first, privacy-focused personal operating system and "external brain" for managing your work — more focused than Notion, more powerful than Obsidian, AI-native but never AI-dependent, highly opinionated.

## Commands

```bash
npm run dev      # Start dev mode (Electron + Vite)
npm run test     # Run tests (Vitest)
npm run test:e2e # Run E2E tests (Playwright)
npm run build    # Production build
npm run lint     # Lint + typecheck
```

## Native Modules

This project uses `better-sqlite3`, a native Node module. Electron bundles its own Node version, so native modules must be rebuilt for Electron.

```bash
npm run rebuild:electron   # Rebuild native modules for Electron
```

**Run this after:**
- `npm install`
- Upgrading Electron
- Switching machines/architectures

**Symptoms if you forget:** `NODE_MODULE_VERSION` mismatch error on startup.

**Note:** `npm rebuild` rebuilds for system Node, not Electron. Always use `rebuild:electron`.

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
- ❌ NO code before tests (see TDD below)
- ✅ Validate all IPC inputs
- ✅ Type everything

## TDD (Non-Negotiable)

**Test-driven, not "with tests".** Write tests FIRST, then implementation.

```
1. Write failing test (what behavior do I need?)
2. Write minimal code to pass
3. Refactor (tests still pass)
```

**Never:**
- Write implementation before test
- Change tests to match broken code
- Write tests just for coverage numbers

**Before committing any test, ask:**
- Did I write this before the implementation?
- What breaks if I delete this test?

→ Full philosophy: [TESTING.md](docs/TESTING.md)

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
| [TESTING](docs/TESTING.md) | TDD philosophy, patterns |
