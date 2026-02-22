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

program
  .name('cortex-agent')
  .description('Headless Cortex sync client for AI assistants')
  .version('0.1.0');

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

// --- Query commands ---

program
  .command('today')
  .description('List today\'s tasks')
  .action(async () => {
    await withDb(async () => {
      const tasks = await getTodayTasks();
      if (tasks.length === 0) {
        console.log('No tasks for today.');
        return;
      }
      for (const task of tasks) {
        const priority = task.priority ? `[${task.priority}] ` : '';
        const deadline = task.deadline ? ` (due ${task.deadline})` : '';
        console.log(`  ${priority}${task.title}${deadline}`);
      }
      console.log(`\n${tasks.length} task(s)`);
    });
  });

program
  .command('tasks')
  .description('List tasks by status')
  .option('-s, --status <status>', 'Filter by status', 'inbox')
  .action(async (opts) => {
    await withDb(async () => {
      const tasks = await getTasksByStatus(opts.status);
      if (tasks.length === 0) {
        console.log(`No ${opts.status} tasks.`);
        return;
      }
      for (const task of tasks) {
        const priority = task.priority ? `[${task.priority}] ` : '';
        const deadline = task.deadline ? ` (due ${task.deadline})` : '';
        const project = task.project_id ? ` #${task.project_id.slice(0, 8)}` : '';
        console.log(`  ${priority}${task.title}${deadline}${project}`);
      }
      console.log(`\n${tasks.length} task(s)`);
    });
  });

program
  .command('overdue')
  .description('List overdue tasks')
  .action(async () => {
    await withDb(async () => {
      const tasks = await getOverdueTasks();
      if (tasks.length === 0) {
        console.log('No overdue tasks.');
        return;
      }
      for (const task of tasks) {
        const priority = task.priority ? `[${task.priority}] ` : '';
        console.log(`  ${priority}${task.title} (due ${task.deadline})`);
      }
      console.log(`\n${tasks.length} overdue task(s)`);
    });
  });

program
  .command('meetings')
  .description('List upcoming meetings')
  .option('-d, --days <days>', 'Number of days ahead', '7')
  .action(async (opts) => {
    await withDb(async () => {
      const meetings = await getUpcomingMeetings(parseInt(opts.days));
      if (meetings.length === 0) {
        console.log('No upcoming meetings.');
        return;
      }
      for (const m of meetings) {
        const time = m.is_all_day
          ? 'all day'
          : new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = m.start_time.split('T')[0];
        console.log(`  ${date} ${time} — ${m.title}`);
      }
      console.log(`\n${meetings.length} meeting(s)`);
    });
  });

program
  .command('projects')
  .description('List projects')
  .option('-s, --status <status>', 'Filter by status')
  .action(async (opts) => {
    await withDb(async () => {
      const projects = await getProjects(opts.status);
      if (projects.length === 0) {
        console.log('No projects.');
        return;
      }
      for (const p of projects) {
        console.log(`  [${p.status}] ${p.title}`);
      }
      console.log(`\n${projects.length} project(s)`);
    });
  });

program
  .command('daily-note [date]')
  .description('Show daily note for a date (default: today)')
  .action(async (date?: string) => {
    await withDb(async () => {
      const d = date ?? new Date().toISOString().split('T')[0];
      const note = await getDailyNote(d);
      if (!note) {
        console.log(`No daily note for ${d}.`);
        return;
      }
      console.log(`--- Daily Note: ${d} ---\n`);
      console.log(note.content ?? '(empty)');
    });
  });

program
  .command('context')
  .description('Full context bundle for AI consumption (JSON)')
  .action(async () => {
    await withDb(async () => {
      const ctx = await getTodayContext();
      console.log(JSON.stringify(ctx, null, 2));
    });
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
  });

// --- Sync commands ---

program
  .command('sync-status')
  .description('Show sync connection status')
  .action(async () => {
    const db = await initDatabase();
    await waitForSync(db);
    const status = db.currentStatus;
    console.log(`Connected: ${status?.connected ?? false}`);
    console.log(`Has synced: ${status?.hasSynced ?? false}`);
    console.log(`Uploading: ${status?.dataFlowStatus?.uploading ?? false}`);
    console.log(`Downloading: ${status?.dataFlowStatus?.downloading ?? false}`);
    await closeDatabase();
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
