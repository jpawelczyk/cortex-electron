# AI Integration

AI-native but never AI-dependent. The app works fully without AI.

## Two-Tier Model

### Tier 1: Self-Hosted AI (Local Sync)

AI assistant (e.g., Claudius) runs on local hardware and syncs as a device:

```
AI Host (Mac mini)
    ↓
Local SQLite (via PowerSync)
    ↓
Direct queries, zero latency
```

**Benefits:**
- No API latency
- Works offline
- Full query capability
- Same sync guarantees as user devices

**Setup:**
1. AI host runs PowerSync client
2. Authenticates as AI user (`type: 'ai'`)
3. Syncs all user data to local SQLite
4. Queries/writes to local DB directly

### Tier 2: External AI (API)

External AI tools query via HTTP API (future Hono layer):

```
External AI
    ↓
Hono API (HTTPS)
    ↓
Supabase Postgres
```

**Out of scope for MVP.** Build when needed.

## AI User Model

AI agents are users with a special type:

```typescript
interface User {
  id: string;
  name: string;
  type: 'human' | 'ai';
  // ...
}
```

**Benefits:**
- Audit trail: "Created by Claudius"
- Permission control: AI can be read-only or read-write
- Analytics: Track AI contributions

## AI Write Operations

When AI creates or updates entities:

1. Write to local SQLite
2. `created_by` / `updated_by` set to AI user ID
3. PowerSync syncs to cloud
4. User sees changes with AI attribution

```typescript
// AI creates a task
db.tasks.create({
  title: 'Follow up with client',
  status: 'inbox',
  created_by: AI_USER_ID, // Claudius
});
```

## Data Access Patterns

### AI Reading User Data

```sql
-- Today's tasks
SELECT * FROM tasks 
WHERE status = 'today' 
  AND deleted_at IS NULL;

-- Upcoming meetings
SELECT * FROM meetings 
WHERE starts_at > datetime('now') 
  AND deleted_at IS NULL
ORDER BY starts_at;

-- Recent notes
SELECT * FROM notes 
WHERE deleted_at IS NULL 
ORDER BY updated_at DESC 
LIMIT 10;
```

### Context Bundles

For efficient AI access, provide pre-bundled context:

```typescript
async function getTodayContext() {
  return {
    date: new Date().toISOString().split('T')[0],
    tasks: await db.tasks.today(),
    meetings: await db.meetings.today(),
    dailyNote: await db.dailyNotes.today(),
  };
}
```

## Optional: Local LLM (Ollama)

For privacy-preserving AI features within the app:

```typescript
interface AISettings {
  local: {
    enabled: boolean;
    provider: 'ollama' | null;
    model: string;           // e.g., 'llama3.2'
    endpoint: string;        // e.g., 'http://localhost:11434'
  };
}
```

**Use cases:**
- Summarize meeting notes
- Extract action items
- Smart search (semantic)

All AI features are opt-in. Core app has zero AI dependencies.

## Future: Yjs for Collaborative Editing

When AI needs to edit notes collaboratively:

1. Load Yjs document from note content
2. Apply changes via Yjs API
3. Serialize back to storage
4. Changes merge cleanly with user edits

Not needed for MVP — field-level sync handles most cases.
