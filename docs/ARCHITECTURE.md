# Cortex v3 Architecture

> Decided: 2026-02-22

## Core Principle

**Local-first.** App always reads/writes to local SQLite. Instant operations. Sync is background, invisible to user.

## Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron |
| UI | React + shadcn |
| Local DB | SQLite |
| Sync | PowerSync |
| Cloud DB | Supabase (Postgres) |
| Auth | Supabase Auth |

## Data Flow

```
User Action → Local SQLite → Instant UI Update
                   ↓
            PowerSync (background)
                   ↓
            Supabase Postgres
                   ↓
            Other devices sync
```

## Key Decisions

1. **Electron over Tauri** — Handles complexity better. Obsidian/Notion precedent. RAM overhead acceptable for desktop productivity app.

2. **PowerSync over alternatives** — Field-level LWW, self-hostable, Electron SDK, Supabase integration. ElectricSQL post-pivot not ready. Triplit no Postgres.

3. **Supabase over self-hosted Postgres** — Zero ops for MVP. Managed Postgres + Auth in one. Migrate to self-hosted later if cost requires.

4. **Local-first = simpler multi-tenancy** — Each user's data isolated on their device. Cloud is backup/sync, not primary store.

## AI Integration (Two-Tier)

1. **Self-hosted AI (Claudius):** Syncs as device → queries local SQLite replica directly
2. **External AI tools:** Query Postgres via API

AI agents = distinct users in system (`type: 'ai'`) for audit trails.

## Future Additions

| When | What |
|------|------|
| When needed | Yjs for text CRDTs (character-level merge) |
| When needed | Hono API layer (AI/external access) |
| At scale | Self-hosted PowerSync + Postgres |
| Later | Mobile (React Native + PowerSync SDK) |

## Out of Scope (MVP)

- Mobile app
- Collaborative editing
- Real-time presence
- Rich text CRDTs

---

*Source: Architecture discussion 2026-02-22*
