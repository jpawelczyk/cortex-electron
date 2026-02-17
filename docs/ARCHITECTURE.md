# Architecture

> A local-first, privacy-focused personal OS for managing your work — more focused than Notion, more powerful than Obsidian, AI-native but never AI-dependent, highly opinionated.

## Philosophy

| Principle | Meaning |
|-----------|---------|
| **Local-first** | Data lives on your machine — always. Works offline. Sync is optional. |
| **Privacy by architecture** | No telemetry, no cloud dependencies. Your data never leaves unless you opt in. |
| **Single-user** | Optimized for one person's workflow. Not a team tool. |
| **Opinionated simplicity** | Few features, done well. No plugin sprawl. |
| **Data portability** | SQLite + Markdown. You can leave anytime. |
| **Fast & light** | Sub-100ms interactions. No spinners. |
| **AI-native, not AI-dependent** | Designed for AI integration, but fully functional without it. |
| **Visual appeal** | Futuristic UI, but never form over function. |

### Anti-Goals

- Team collaboration / multiplayer
- Plugin ecosystem
- File-based storage (we're not Obsidian)
- Everything-app bloat (we're not Notion)

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Runtime** | Electron | Cross-platform desktop, always-on |
| **Renderer** | React 18+ | Component model, ecosystem |
| **Build** | Vite | Fast HMR, native ESM |
| **Database** | SQLite (better-sqlite3) | Local, fast, sync-ready |
| **ORM** | Drizzle ORM | Type-safe, SQLite-native |
| **State** | Zustand | Simple, fast, no boilerplate |
| **Styling** | Tailwind CSS | Utility-first |
| **Components** | shadcn/ui | Radix + Tailwind, copy-paste |
| **Editor** | Milkdown | Markdown-native WYSIWYG |
| **Testing** | Vitest + Playwright | Unit + E2E |
| **Packaging** | electron-builder | Cross-platform builds |

## Project Structure

```
cortex-electron/
├── docs/
│   ├── ARCHITECTURE.md     # This file (overview)
│   ├── SCHEMA.md           # Database schema
│   ├── TASK_SYSTEM.md      # Task model (Things-inspired)
│   ├── STATE.md            # Zustand stores
│   ├── IPC.md              # Electron IPC & security
│   ├── SYNC.md             # Sync-ready patterns
│   ├── AI.md               # AI integration layer
│   └── DESIGN_SYSTEM.md    # Visual language
├── src/
│   ├── main/               # Electron main process
│   │   ├── database/       # SQLite, migrations
│   │   ├── ipc/            # IPC handlers
│   │   └── services/       # Business logic
│   ├── renderer/           # React app
│   │   ├── components/     # UI components
│   │   ├── views/          # Page-level views
│   │   ├── stores/         # Zustand stores
│   │   └── hooks/          # Custom hooks
│   ├── shared/             # Types, validation, constants
│   └── preload/            # Secure IPC bridge
├── migrations/             # SQLite migrations
└── tests/                  # Unit, integration, e2e
```

## Data Model

```
┌─────────────┐       ┌─────────────┐
│  Contexts   │       │ Stakeholders│  (global, no context)
└──────┬──────┘       └──────┬──────┘
       │ 1                   │ M
       ▼ M                   ▼ M
┌─────────────┐       ┌─────────────┐
│  Projects   │◄──────│  Meetings   │
└──────┬──────┘       └─────────────┘
       │ 1
       ▼ M
┌─────────────┐       ┌─────────────┐
│    Tasks    │       │    Notes    │
└──────┬──────┘       └─────────────┘
       │ 1
       ▼ M
┌─────────────┐       ┌─────────────┐
│  Checklists │       │ Daily Notes │  (global, one per day)
└─────────────┘       └─────────────┘
```

**Key relationships:**
- Tasks inherit context from their project (hard inheritance)
- Stakeholders exist outside contexts (global)
- Daily notes are global (one per day, cross-context)
- Inbox tasks have no context until triaged

## Detailed Documentation

| Doc | When to Load |
|-----|--------------|
| [SCHEMA.md](SCHEMA.md) | Working on database, migrations |
| [TASK_SYSTEM.md](TASK_SYSTEM.md) | Working on task logic |
| [STATE.md](STATE.md) | Working on stores, state |
| [IPC.md](IPC.md) | Working on main/renderer communication |
| [SYNC.md](SYNC.md) | Implementing sync features |
| [AI.md](AI.md) | Implementing AI integration |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Working on UI/components |
