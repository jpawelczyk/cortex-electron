# Cortex v2 Roadmap

> Last updated: 2026-02-22

## Vision

Transform Cortex from a functional personal OS into a polished, production-ready system with robust notifications, a powerful task engine, and multi-user support.

---

## Current State (v0.2.0)

### ✅ Completed
- **Recording System Overhaul** (Feb 2026)
  - Crash-safe chunked recording (30s WAV chunks with manifest)
  - Live transcription during recording (local Whisper)
  - Full re-transcription after recording stops
  - Multiple recordings per meeting
  - Action item suggestions (AI-generated, user reviews before creating tasks)
  - Background upload with retry
  - Recovery dialog on app launch for incomplete recordings

- **Staging Environment**
  - Coolify-based staging tracking `develop` branch
  - Tauri staging builds with separate identifier
  - CI/CD pipelines (type check → lint → test → build)

- **Core CRUD**
  - Projects, Tasks, Notes, Meetings, Stakeholders, Daily Notes
  - Basic task views (Inbox, Today, Upcoming)
  - Meeting → Task/Note linking
  - Semantic search (pgvector)

---

## v2.0 Feature Roadmap

### 🔔 Phase 1: Notifications (Next Up)
**Spec:** `docs/NOTIFICATIONS_SPEC.md`

**Goals:**
- Never miss a meeting (reminder 15 min before)
- Surface due/overdue tasks at the right moment
- Optional daily digest to start the day focused

**Key Features:**
| Feature | Description |
|---------|-------------|
| Meeting reminders | Configurable advance notice (default: 15 min) |
| Task due notifications | Alert when tasks approach/hit due date |
| Overdue task nudges | Daily/twice-daily reminders for overdue items |
| Daily digest | Morning summary of today's meetings + tasks |
| Quiet hours | No notifications during sleep/focus time |
| Multi-channel | Tauri native + Web Push + In-App toast |

**Schema additions:**
- `notification_preferences` — User settings
- `push_subscriptions` — Web Push endpoints  
- `notifications` — History/log

**Architecture:** Scheduler (checks every 1 min) → Dispatcher (routes to channel) → Channels (Tauri/Web Push/In-App)

---

### ✅ Phase 2: Task System Overhaul
**Spec:** `docs/TASK_SYSTEM_OVERHAUL.md`

**Tier 1: Core**
| Feature | Description |
|---------|-------------|
| Subtasks/Checklists | Break down complex tasks, drag reorder |
| Quick Capture | Natural language: "Call John tomorrow #Work 30m @yannick" |
| Smart Inbox | Drag-to-schedule, bulk actions |
| Due Date Picker | Relative shortcuts (tomorrow, next week, etc.) |

**Tier 2: Power Features**
| Feature | Description |
|---------|-------------|
| Recurring Tasks | RRULE-based (daily, weekly, monthly, custom) |
| Time Estimates | Plan capacity, track actual vs. estimated |
| Smart Lists | Saved filters (e.g., "Work P0-P1 due this week") |

**Tier 3: Advanced (Future)**
| Feature | Description |
|---------|-------------|
| Dependencies | "Blocked by X" relationships |
| Time Tracking | Log time spent on tasks |
| Templates | Reusable task/subtask templates |

**Two-Track Due Date Model (finalized Feb 19):**
- **"When" date** = Scheduling intent → Passive decay to Stale bucket after X days
- **"Due" date** = Hard deadline → Forced triage via Inbox when overdue
- **Anytime/Someday views:** Exempt from staleness, separate buckets

---

### 👥 Phase 3: Multi-User Support
**Spec:** `docs/MULTI_USER_SPEC.md`

**Goals:**
- Full data isolation between users
- Invite-based registration (no public signup)
- Admin panel for user management

**Key Features:**
| Feature | Description |
|---------|-------------|
| Invite system | Admin generates invite codes/links |
| Data isolation | All tables filtered by `userId` |
| Admin panel | View users, revoke access, usage stats |
| Account management | Password reset, profile settings |

---

### 📱 Phase 4: Mobile Companion (Future)
**Spec:** `docs/MOBILE_COMPANION_SPEC.md`

**Approach:** PWA-first, native later if needed

**Key Features:**
- Quick capture (voice + text)
- Today view (tasks + meetings)
- Push notifications (via Web Push)
- Offline support (service worker)

---

## Technical Debt & Infrastructure

### Planned
- [ ] Full test coverage for critical paths
- [ ] Performance optimization (virtualized lists for large datasets)
- [ ] Backup/restore functionality
- [ ] Self-hosted deployment guide (Hetzner VPS via Coolify)

### Completed
- [x] Dockerfile (pnpm-based)
- [x] CI workflow (GitHub Actions)
- [x] Tauri macOS build workflow
- [x] Staging environment

---

## Release Plan

| Version | Focus | Target |
|---------|-------|--------|
| v0.2.0 | Recording overhaul | ✅ Done |
| v0.3.0 | Notifications | Q1 2026 |
| v0.4.0 | Task System Tier 1 | Q1 2026 |
| v0.5.0 | Task System Tier 2 | Q2 2026 |
| v1.0.0 | Multi-user + Polish | Q2 2026 |

---

## Design Principles

From `docs/DESIGN_GUIDE.md`:
- Clean, minimal UI with clear visual hierarchy
- Keyboard-first (Cmd+K command palette, shortcuts for everything)
- Responsive (works on all screen sizes)
- Dark mode by default, light mode supported

---

## AI Integration Philosophy

From `docs/PRD.md`:
- **Predictable file structure** — Consistent paths/naming for AI navigation
- **Machine-readable exports** — JSON/YAML for any view
- **API-first** — Every UI action backed by documented API
- **Context-aware summaries** — Endpoints for AI prompt injection
- **Changelog/activity feed** — Queryable log for AI catch-up

---

## Links

| Doc | Purpose |
|-----|---------|
| `PRD.md` | Product requirements, tech stack, philosophy |
| `NOTIFICATIONS_SPEC.md` | Full notification system implementation |
| `TASK_SYSTEM_OVERHAUL.md` | Task features, schema, NLP parser |
| `MULTI_USER_SPEC.md` | Multi-tenancy implementation |
| `MOBILE_COMPANION_SPEC.md` | PWA/mobile strategy |
| `RECORDING_OVERHAUL.md` | Completed recording system |
| `DESIGN_GUIDE.md` | UI/UX guidelines |
