# Sync-Ready Patterns

Architecture decisions to enable future sync without rewrites.

## Core Principles

Even though sync is post-MVP, we architect for it from day one:

1. **UUIDs everywhere** — no auto-increment IDs
2. **Soft deletes** — never lose data
3. **Timestamps on everything** — for ordering and conflict detection
4. **Vector clocks** — reserved field for CRDT sync
5. **Event log** — optional append-only audit trail

## UUIDs

All entity IDs are UUIDs (not auto-increment):

```typescript
import { randomUUID } from 'crypto';

function generateId(): string {
  return randomUUID();
}

// Usage
const task = {
  id: generateId(), // "550e8400-e29b-41d4-a716-446655440000"
  title: 'New task',
  // ...
};
```

**Why:** Auto-increment IDs collide when syncing between devices.

## Soft Deletes

Never hard delete. Always set `deleted_at`:

```sql
-- Delete = soft delete
UPDATE tasks SET deleted_at = datetime('now') WHERE id = ?;

-- All queries filter out deleted
SELECT * FROM tasks WHERE deleted_at IS NULL;

-- To actually see deleted items (restore feature)
SELECT * FROM tasks WHERE deleted_at IS NOT NULL;
```

**Why:** Hard deletes can't sync (how do you tell another device to delete something that doesn't exist?).

## Timestamps

Every entity has:

```typescript
interface BaseEntity {
  id: string;           // UUID
  created_at: string;   // ISO 8601
  updated_at: string;   // ISO 8601
  deleted_at: string | null;
}
```

Update `updated_at` on every change:

```typescript
function updateTask(id: string, changes: Partial<Task>): Task {
  return db.prepare(`
    UPDATE tasks 
    SET ${Object.keys(changes).map(k => `${k} = ?`).join(', ')},
        updated_at = datetime('now')
    WHERE id = ?
  `).run(...Object.values(changes), id);
}
```

## Vector Clocks

Reserved column for future CRDT sync:

```sql
vector_clock TEXT  -- JSON: {"device_id": counter, ...}
```

Not used in MVP, but the column exists. When sync is implemented:

```typescript
interface VectorClock {
  [deviceId: string]: number;
}

// On each write, increment local counter
function incrementClock(clock: VectorClock, deviceId: string): VectorClock {
  return {
    ...clock,
    [deviceId]: (clock[deviceId] || 0) + 1,
  };
}

// Merge clocks (take max of each)
function mergeClock(a: VectorClock, b: VectorClock): VectorClock {
  const result: VectorClock = { ...a };
  for (const [device, count] of Object.entries(b)) {
    result[device] = Math.max(result[device] || 0, count);
  }
  return result;
}
```

## Event Log

Optional append-only log of all changes:

```sql
CREATE TABLE event_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,   -- 'task', 'project', etc.
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,        -- 'create', 'update', 'delete'
  payload TEXT NOT NULL,       -- JSON of the change
  timestamp TEXT NOT NULL,
  vector_clock TEXT,
  synced_at TEXT               -- NULL until synced
);
```

**Usage:**

```typescript
function logEvent(type: string, id: string, action: string, payload: object) {
  db.prepare(`
    INSERT INTO event_log (id, entity_type, entity_id, action, payload, timestamp)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(generateId(), type, id, action, JSON.stringify(payload));
}

// On task create
logEvent('task', task.id, 'create', task);

// On task update
logEvent('task', task.id, 'update', { changes, previous });

// On task delete
logEvent('task', task.id, 'delete', { deleted_at: now });
```

## Future: cr-sqlite

When implementing sync, consider [cr-sqlite](https://github.com/vlcn-io/cr-sqlite):

- Drop-in SQLite replacement with built-in CRDTs
- Automatic conflict resolution
- Works with existing schema (mostly)

```typescript
// Future pseudo-code
import { crsqlite } from '@vlcn.io/crsqlite';

const db = crsqlite.open('cortex.db');

// Changes are automatically tracked as CRDTs
// Sync just exchanges CRDT operations between devices
```

## Migration Path

1. **MVP:** Single device, no sync, but sync-ready schema
2. **Phase 1:** Export/import (manual sync via file)
3. **Phase 2:** cr-sqlite integration (automatic sync)
4. **Phase 3:** Optional cloud relay for remote sync
