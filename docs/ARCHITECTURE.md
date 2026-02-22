# Cortex Architecture

Cortex is a personal operating system and "external brain" for managing your work — more focused than Notion, more powerful than Obsidian, AI-native but never AI-dependent, highly opinionated.

## Core Principle

**Local-first.** App always reads/writes to local SQLite. Instant operations. Sync is background, invisible to user.

## Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron |
| UI | React + shadcn + Lucide |
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

## AI Integration (Two-Tier)

1. **Self-hosted AI:** Syncs as device → queries local SQLite replica directly
2. **External AI tools:** Query Postgres via API (out of scope for MVP!)

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
