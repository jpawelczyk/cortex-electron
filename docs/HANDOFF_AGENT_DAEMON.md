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

## Notes

- Daemon binds to 127.0.0.1 only (not exposed to network)
- No auth needed since it's local-only
- Port 7654 arbitrary, configurable via env
