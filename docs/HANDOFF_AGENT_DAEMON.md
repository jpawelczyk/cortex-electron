# Handoff: Agent Background Daemon

## Context

The Cortex agent CLI currently connects/syncs on each command (~2-3 sec latency). We need a persistent background daemon that keeps sync alive and exposes fast query/write access.

## What to Build

### 1. Daemon Process with HTTP API

Create `agent/daemon.ts`:

```typescript
import Fastify from 'fastify';
import { initDatabase, closeDatabase, getDatabase } from './db.js';
import * as queries from './queries.js';

const PORT = process.env.CORTEX_AGENT_PORT || 7654;

async function start() {
  // Initialize DB and sync (stays connected)
  const db = await initDatabase();
  
  // Wait for initial sync
  await waitForSync(db);
  console.log('✓ Sync connected');

  const app = Fastify();

  // Health check
  app.get('/health', async () => ({ status: 'ok', synced: db.currentStatus?.hasSynced }));

  // --- Read endpoints ---
  
  app.get('/context/today', async () => queries.getTodayContext());
  
  app.get('/tasks', async (req) => {
    const { status } = req.query as { status?: string };
    return status ? queries.getTasksByStatus(status) : queries.getTasksByStatus('inbox');
  });

  app.get('/tasks/today', async () => queries.getTodayTasks());
  app.get('/tasks/overdue', async () => queries.getOverdueTasks());
  
  app.get('/meetings', async (req) => {
    const { days } = req.query as { days?: string };
    return queries.getUpcomingMeetings(parseInt(days || '7'));
  });

  app.get('/projects', async (req) => {
    const { status } = req.query as { status?: string };
    return queries.getProjects(status);
  });

  app.get('/daily-note/:date?', async (req) => {
    const { date } = req.params as { date?: string };
    const d = date || new Date().toISOString().split('T')[0];
    return queries.getDailyNote(d) || { date: d, content: null };
  });

  // --- Write endpoints ---

  app.post('/tasks', async (req) => {
    const { title, status, priority, project_id, when_date, deadline } = req.body as any;
    return queries.createTask(title, { status, priority, project_id, when_date, deadline });
  });

  // Future: add more write endpoints (notes, meetings, etc.)

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await app.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ port: Number(PORT), host: '127.0.0.1' });
  console.log(`✓ Agent daemon listening on http://127.0.0.1:${PORT}`);
}

start().catch(console.error);
```

### 2. CLI Wrapper for Daemon

Update `agent/cli.ts` to optionally talk to daemon:

```typescript
const DAEMON_URL = process.env.CORTEX_DAEMON_URL || 'http://127.0.0.1:7654';

async function useDaemon(): Promise<boolean> {
  try {
    const res = await fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(200) });
    return res.ok;
  } catch {
    return false;
  }
}

// In each command, check daemon first:
program
  .command('today')
  .action(async () => {
    if (await useDaemon()) {
      const res = await fetch(`${DAEMON_URL}/tasks/today`);
      const tasks = await res.json();
      // ... print tasks
    } else {
      // Fall back to direct DB (existing code)
      await withDb(async () => { ... });
    }
  });
```

### 3. Systemd / launchd Service

**macOS (launchd):** Create `~/Library/LaunchAgents/com.cortex.agent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.cortex.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npx</string>
    <string>tsx</string>
    <string>/Users/claude/repos/cortex/agent/daemon.ts</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/claude/repos/cortex/agent</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/cortex-agent.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/cortex-agent.log</string>
</dict>
</plist>
```

Load with: `launchctl load ~/Library/LaunchAgents/com.cortex.agent.plist`

**Linux (systemd):** Create `~/.config/systemd/user/cortex-agent.service`:

```ini
[Unit]
Description=Cortex Agent Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/user/repos/cortex/agent
ExecStart=/usr/bin/npx tsx daemon.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
```

Enable with: `systemctl --user enable --now cortex-agent`

### 4. Dependencies

Add to `agent/package.json`:

```json
{
  "dependencies": {
    "fastify": "^4.26.0"
  }
}
```

## Files to Create/Modify

**Create:**
- `agent/daemon.ts` — HTTP server with sync
- `agent/com.cortex.agent.plist` — macOS service template
- `agent/cortex-agent.service` — Linux service template

**Modify:**
- `agent/cli.ts` — Add daemon detection + HTTP fallback
- `agent/package.json` — Add fastify

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Daemon health + sync status |
| GET | `/context/today` | Full context bundle |
| GET | `/tasks?status=X` | Tasks by status |
| GET | `/tasks/today` | Today's tasks |
| GET | `/tasks/overdue` | Overdue tasks |
| GET | `/meetings?days=N` | Upcoming meetings |
| GET | `/projects?status=X` | Projects |
| GET | `/daily-note/:date` | Daily note |
| POST | `/tasks` | Create task |

## Success Criteria

1. `daemon.ts` runs and exposes HTTP API on port 7654
2. Queries respond in <50ms (no sync wait)
3. CLI detects daemon and uses HTTP when available
4. Falls back to direct DB when daemon is down
5. Service file for auto-start on boot
6. Watches for tasks assigned to agent and triggers webhook

## Notes

- Daemon binds to 127.0.0.1 only (not exposed to network)
- No auth needed since it's local-only
- Port 7654 arbitrary, configurable via env

---

## Task Assignment Feature

### Data Model Change

Add `assignee_id` to tasks table. Create migration `supabase/migrations/003_task_assignee.sql`:

```sql
-- Add assignee field to tasks (can be user or AI agent)
ALTER TABLE public.tasks ADD COLUMN assignee_id TEXT;

-- Index for efficient lookup
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id) WHERE deleted_at IS NULL;
```

Also update `src/main/sync/schema.ts`:
```typescript
const tasks = new Table({
  // ... existing fields
  assignee_id: column.text,
});
```

### Daemon: Watch for Assigned Tasks

Add to `agent/daemon.ts`:

```typescript
const AGENT_ID = process.env.CORTEX_AGENT_ID;  // My agent UUID
const WEBHOOK_URL = process.env.CORTEX_WEBHOOK_URL;  // Optional: notify externally

// Track seen tasks to detect new assignments
const seenAssignments = new Set<string>();

async function watchAssignments(db: PowerSyncDatabase) {
  // PowerSync reactive query
  db.watch(
    `SELECT * FROM tasks 
     WHERE assignee_id = ? 
       AND status NOT IN ('logbook', 'cancelled') 
       AND deleted_at IS NULL`,
    [AGENT_ID],
    {
      onResult: async (results) => {
        for (const task of results.rows?._array || []) {
          if (!seenAssignments.has(task.id)) {
            seenAssignments.add(task.id);
            await onTaskAssigned(task);
          }
        }
      },
    }
  );
}

async function onTaskAssigned(task: Task) {
  console.log(`📋 New task assigned: ${task.title}`);
  
  // Option 1: Write to file for OpenClaw to pick up
  const notification = {
    type: 'task_assigned',
    task_id: task.id,
    title: task.title,
    priority: task.priority,
    deadline: task.deadline,
    timestamp: new Date().toISOString(),
  };
  
  await fs.appendFile(
    '/tmp/cortex-agent-events.jsonl',
    JSON.stringify(notification) + '\n'
  );

  // Option 2: Webhook (if configured)
  if (WEBHOOK_URL) {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    }).catch(console.error);
  }
}

// Call in start():
async function start() {
  const db = await initDatabase();
  await waitForSync(db);
  
  if (AGENT_ID) {
    watchAssignments(db);
    console.log(`✓ Watching for tasks assigned to ${AGENT_ID}`);
  }
  
  // ... rest of HTTP server setup
}
```

### API Endpoints for Assignments

Add to daemon HTTP API:

```typescript
// Get tasks assigned to this agent
app.get('/tasks/assigned', async () => {
  return db.getAll(
    `SELECT * FROM tasks 
     WHERE assignee_id = ? 
       AND status NOT IN ('logbook', 'cancelled') 
       AND deleted_at IS NULL
     ORDER BY 
       CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
       deadline ASC NULLS LAST`,
    [AGENT_ID]
  );
});

// Update task status (agent marks progress)
app.patch('/tasks/:id', async (req) => {
  const { id } = req.params;
  const { status, notes } = req.body as any;
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (status) {
    updates.push('status = ?');
    values.push(status);
    if (status === 'logbook') {
      updates.push('completed_at = ?');
      values.push(new Date().toISOString());
    }
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }
  
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  
  await db.execute(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
  
  return { success: true };
});
```

### Environment Variables

Add to `.env`:
```bash
CORTEX_AGENT_ID=f6670db8-3866-4828-baa0-887f6ef4adc4
CORTEX_WEBHOOK_URL=  # Optional, for external notifications
```

### User Flow

1. User creates task in Cortex app
2. User sets `assignee_id` to agent (UI: dropdown with AI agents)
3. Task syncs to Supabase → PowerSync → Agent's local DB
4. Daemon detects new assignment via reactive query
5. Daemon writes to `/tmp/cortex-agent-events.jsonl` (or calls webhook)
6. OpenClaw heartbeat picks up the event file
7. Agent works on task, updates status via API
8. Changes sync back to user's app

### UI Addition (Cortex App)

Add assignee selector to task editor:

```typescript
// In task form
<Select value={task.assignee_id} onValueChange={setAssignee}>
  <SelectItem value={null}>Unassigned</SelectItem>
  <SelectItem value={currentUser.id}>Me</SelectItem>
  {aiAgents.map(agent => (
    <SelectItem key={agent.id} value={agent.id}>
      {agent.name} (AI)
    </SelectItem>
  ))}
</Select>
```

### Additional Success Criteria

7. `assignee_id` column exists on tasks
8. Daemon watches for assigned tasks and logs/notifies
9. `/tasks/assigned` endpoint returns agent's task queue
10. Agent can update task status via PATCH endpoint
