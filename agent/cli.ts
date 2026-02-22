import { Command } from 'commander';
import { initDatabase, closeDatabase } from './db.js';
import {
  getTodayTasks,
  getTasksByStatus,
  getUpcomingMeetings,
  createTask,
  getDailyNote,
  getTodayContext,
  getProjects,
  getOverdueTasks,
} from './queries.js';

const program = new Command();
const DAEMON_URL = process.env.CORTEX_DAEMON_URL || 'http://127.0.0.1:7654';

program
  .name('cortex-agent')
  .description('Headless Cortex sync client for AI assistants')
  .version('0.1.0');

// --- Daemon detection ---

async function useDaemon(): Promise<boolean> {
  try {
    const res = await fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(200) });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchDaemon<T>(path: string): Promise<T> {
  const res = await fetch(`${DAEMON_URL}${path}`);
  return res.json() as Promise<T>;
}

// --- DB fallback helpers ---

/** Wait for initial sync to complete (or timeout). */
async function waitForSync(db: Awaited<ReturnType<typeof initDatabase>>, timeoutMs = 10_000): Promise<void> {
  if (db.currentStatus?.hasSynced) return;

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);

    const dispose = db.registerListener({
      statusChanged: (status) => {
        if (status.hasSynced) {
          clearTimeout(timeout);
          dispose();
          resolve();
        }
      },
    });
  });
}

async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  const db = await initDatabase();
  await waitForSync(db);
  try {
    return await fn();
  } finally {
    await closeDatabase();
  }
}

// --- Formatting helpers ---

function formatTask(task: { title: string; priority?: string | null; deadline?: string | null; project_id?: string | null }) {
  const priority = task.priority ? `[${task.priority}] ` : '';
  const deadline = task.deadline ? ` (due ${task.deadline})` : '';
  return `  ${priority}${task.title}${deadline}`;
}

// --- Query commands ---

program
  .command('today')
  .description('List today\'s tasks')
  .action(async () => {
    if (await useDaemon()) {
      const tasks = await fetchDaemon<any[]>('/tasks/today');
      if (tasks.length === 0) { console.log('No tasks for today.'); return; }
      for (const task of tasks) console.log(formatTask(task));
      console.log(`\n${tasks.length} task(s)`);
    } else {
      await withDb(async () => {
        const tasks = await getTodayTasks();
        if (tasks.length === 0) { console.log('No tasks for today.'); return; }
        for (const task of tasks) console.log(formatTask(task));
        console.log(`\n${tasks.length} task(s)`);
      });
    }
  });

program
  .command('tasks')
  .description('List tasks by status')
  .option('-s, --status <status>', 'Filter by status', 'inbox')
  .action(async (opts) => {
    if (await useDaemon()) {
      const tasks = await fetchDaemon<any[]>(`/tasks?status=${opts.status}`);
      if (tasks.length === 0) { console.log(`No ${opts.status} tasks.`); return; }
      for (const task of tasks) {
        const project = task.project_id ? ` #${task.project_id.slice(0, 8)}` : '';
        console.log(formatTask(task) + project);
      }
      console.log(`\n${tasks.length} task(s)`);
    } else {
      await withDb(async () => {
        const tasks = await getTasksByStatus(opts.status);
        if (tasks.length === 0) { console.log(`No ${opts.status} tasks.`); return; }
        for (const task of tasks) {
          const project = task.project_id ? ` #${task.project_id.slice(0, 8)}` : '';
          console.log(formatTask(task) + project);
        }
        console.log(`\n${tasks.length} task(s)`);
      });
    }
  });

program
  .command('overdue')
  .description('List overdue tasks')
  .action(async () => {
    if (await useDaemon()) {
      const tasks = await fetchDaemon<any[]>('/tasks/overdue');
      if (tasks.length === 0) { console.log('No overdue tasks.'); return; }
      for (const task of tasks) console.log(formatTask(task));
      console.log(`\n${tasks.length} overdue task(s)`);
    } else {
      await withDb(async () => {
        const tasks = await getOverdueTasks();
        if (tasks.length === 0) { console.log('No overdue tasks.'); return; }
        for (const task of tasks) console.log(formatTask(task));
        console.log(`\n${tasks.length} overdue task(s)`);
      });
    }
  });

program
  .command('meetings')
  .description('List upcoming meetings')
  .option('-d, --days <days>', 'Number of days ahead', '7')
  .action(async (opts) => {
    if (await useDaemon()) {
      const meetings = await fetchDaemon<any[]>(`/meetings?days=${opts.days}`);
      if (meetings.length === 0) { console.log('No upcoming meetings.'); return; }
      for (const m of meetings) {
        const time = m.is_all_day ? 'all day' : new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = m.start_time.split('T')[0];
        console.log(`  ${date} ${time} — ${m.title}`);
      }
      console.log(`\n${meetings.length} meeting(s)`);
    } else {
      await withDb(async () => {
        const meetings = await getUpcomingMeetings(parseInt(opts.days));
        if (meetings.length === 0) { console.log('No upcoming meetings.'); return; }
        for (const m of meetings) {
          const time = m.is_all_day ? 'all day' : new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const date = m.start_time.split('T')[0];
          console.log(`  ${date} ${time} — ${m.title}`);
        }
        console.log(`\n${meetings.length} meeting(s)`);
      });
    }
  });

program
  .command('projects')
  .description('List projects')
  .option('-s, --status <status>', 'Filter by status')
  .action(async (opts) => {
    if (await useDaemon()) {
      const url = opts.status ? `/projects?status=${opts.status}` : '/projects';
      const projects = await fetchDaemon<any[]>(url);
      if (projects.length === 0) { console.log('No projects.'); return; }
      for (const p of projects) console.log(`  [${p.status}] ${p.title}`);
      console.log(`\n${projects.length} project(s)`);
    } else {
      await withDb(async () => {
        const projects = await getProjects(opts.status);
        if (projects.length === 0) { console.log('No projects.'); return; }
        for (const p of projects) console.log(`  [${p.status}] ${p.title}`);
        console.log(`\n${projects.length} project(s)`);
      });
    }
  });

program
  .command('daily-note [date]')
  .description('Show daily note for a date (default: today)')
  .action(async (date?: string) => {
    const d = date ?? new Date().toISOString().split('T')[0];
    if (await useDaemon()) {
      const note = await fetchDaemon<{ date: string; content: string | null }>(`/daily-note/${d}`);
      if (!note.content) { console.log(`No daily note for ${d}.`); return; }
      console.log(`--- Daily Note: ${d} ---\n`);
      console.log(note.content);
    } else {
      await withDb(async () => {
        const note = await getDailyNote(d);
        if (!note) { console.log(`No daily note for ${d}.`); return; }
        console.log(`--- Daily Note: ${d} ---\n`);
        console.log(note.content ?? '(empty)');
      });
    }
  });

program
  .command('context')
  .description('Full context bundle for AI consumption (JSON)')
  .action(async () => {
    if (await useDaemon()) {
      const ctx = await fetchDaemon('/context/today');
      console.log(JSON.stringify(ctx, null, 2));
    } else {
      await withDb(async () => {
        const ctx = await getTodayContext();
        console.log(JSON.stringify(ctx, null, 2));
      });
    }
  });

// --- Write commands ---

program
  .command('add-task <title>')
  .description('Create a new task')
  .option('-s, --status <status>', 'Task status', 'inbox')
  .option('-p, --priority <priority>', 'Priority (P0-P3)')
  .option('--project <id>', 'Project ID')
  .option('--when <date>', 'When date (YYYY-MM-DD)')
  .option('--deadline <date>', 'Deadline (YYYY-MM-DD)')
  .action(async (title: string, opts) => {
    if (await useDaemon()) {
      const res = await fetch(`${DAEMON_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          status: opts.status,
          priority: opts.priority,
          project_id: opts.project,
          when_date: opts.when,
          deadline: opts.deadline,
        }),
      });
      const task = await res.json() as { title: string; id: string };
      console.log(`Created task: ${task.title} (${task.id})`);
    } else {
      await withDb(async () => {
        const task = await createTask(title, {
          status: opts.status,
          priority: opts.priority,
          project_id: opts.project,
          when_date: opts.when,
          deadline: opts.deadline,
        });
        console.log(`Created task: ${task.title} (${task.id})`);
      });
    }
  });

// --- Sync commands ---

program
  .command('sync-status')
  .description('Show sync connection status')
  .action(async () => {
    if (await useDaemon()) {
      const health = await fetchDaemon<{ status: string; synced: boolean }>('/health');
      console.log(`Daemon: running`);
      console.log(`Synced: ${health.synced}`);
    } else {
      const db = await initDatabase();
      await waitForSync(db);
      const status = db.currentStatus;
      console.log(`Connected: ${status?.connected ?? false}`);
      console.log(`Has synced: ${status?.hasSynced ?? false}`);
      console.log(`Uploading: ${status?.dataFlowStatus?.uploading ?? false}`);
      console.log(`Downloading: ${status?.dataFlowStatus?.downloading ?? false}`);
      await closeDatabase();
    }
  });

program
  .command('watch')
  .description('Run persistently, log sync events')
  .action(async () => {
    const db = await initDatabase();
    console.log('Watching sync events. Press Ctrl+C to stop.\n');

    db.registerListener({
      statusChanged: (status) => {
        const ts = new Date().toISOString().split('T')[1]?.slice(0, 8);
        console.log(
          `[${ts}] connected=${status.connected} hasSynced=${status.hasSynced} uploading=${status.dataFlowStatus?.uploading ?? false} downloading=${status.dataFlowStatus?.downloading ?? false}`,
        );
      },
    });

    const shutdown = async () => {
      console.log('\nStopping watch...');
      await closeDatabase();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep alive
    setInterval(() => {}, 60_000);
  });

program.parse();
