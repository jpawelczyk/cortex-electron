# Sync

PowerSync configuration for Cortex.

## Overview

```
Local SQLite ←→ PowerSync ←→ Supabase Postgres
```

- All reads/writes hit local SQLite
- PowerSync syncs changes bidirectionally in background
- User never waits on sync

## Setup

### Dependencies

```bash
npm install @powersync/node @powersync/common
```

### PowerSync Client (Main Process)

```typescript
import { PowerSyncDatabase } from '@powersync/node';

const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'cortex.db' }
});

await db.connect(new SupabaseConnector());
```

### Supabase Connector

```typescript
class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const session = await supabase.auth.getSession();
    return {
      endpoint: POWERSYNC_URL,
      token: session.access_token
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    // Called when local changes need to sync to Supabase
    const batch = await database.getCrudBatch();
    // Apply to Supabase via REST or direct connection
  }
}
```

## Sync Rules

PowerSync uses Sync Rules to define what data syncs to each client.

```yaml
# sync-rules.yaml
bucket_definitions:
  user_data:
    parameters: SELECT id AS user_id FROM auth.users WHERE id = token_parameters.user_id
    data:
      - SELECT * FROM tasks WHERE user_id = bucket.user_id
      - SELECT * FROM projects WHERE user_id = bucket.user_id
      - SELECT * FROM notes WHERE user_id = bucket.user_id
      - SELECT * FROM meetings WHERE user_id = bucket.user_id
      - SELECT * FROM stakeholders WHERE user_id = bucket.user_id
      - SELECT * FROM daily_notes WHERE user_id = bucket.user_id
```

## Conflict Resolution

PowerSync uses **field-level last-write-wins**:

- Concurrent edits to different fields: both preserved
- Concurrent edits to same field: last write wins (by timestamp)

For MVP, this is sufficient. CRDTs (Yjs) can be added later for text fields.

## Offline Behavior

1. App starts → loads from local SQLite immediately
2. PowerSync connects in background
3. Queued changes sync when online
4. Incoming changes merge automatically

No loading states. No "connecting..." spinners.

## Multi-Device

Each device has its own SQLite. PowerSync ensures convergence:

```
Device A: Create task → Local SQLite → Sync queue
Device B: Receives sync → Local SQLite updated
```

## AI Device Sync

Self-hosted AI (e.g., Claudius) is treated as another device:

1. AI has its own SQLite replica
2. Syncs via PowerSync like any other client
3. Queries local DB directly (no API latency)
4. Writes sync back to user's devices

## Debugging

```typescript
// Watch sync status
db.currentStatus.subscribe(status => {
  console.log('Connected:', status.connected);
  console.log('Uploading:', status.uploading);
  console.log('Downloading:', status.downloading);
});
```

## Adding a New Table — Checklist

Adding a table to `AppSchema` alone is **not enough**. PowerSync reconciles local state against the server's sync rules on every sync cycle. Tables missing from sync rules will have their local data **deleted** after the upload queue is flushed.

Every new table requires all three:

1. **`src/main/sync/schema.ts`** — Add to `AppSchema` (creates local table)
2. **`sync-rules.yaml`** — Add sync rule (enables server → client download)
3. **Postgres publication** — `ALTER PUBLICATION powersync ADD TABLE public.<table>` (enables change streaming)

Missing any one of these causes data loss: the local write succeeds, the upload may succeed, but the next sync cycle sees zero server-side rows for that table and wipes the local copy.

## Schema Considerations

PowerSync requires certain patterns:

- **UUIDs for IDs** — no auto-increment (already in place)
- **Soft deletes** — `deleted_at` column (already in place)
- **Timestamps** — `created_at`, `updated_at` (already in place)

The existing schema is sync-ready.
