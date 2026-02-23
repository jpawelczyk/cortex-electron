/**
 * Cortex Agent Daemon
 *
 * API Key Authentication
 * ----------------------
 * Set the CORTEX_DAEMON_KEY environment variable to a securely generated key.
 * Generate a key with:
 *   openssl rand -hex 32
 *
 * Pass the key in requests via the x-api-key header:
 *   curl -H "x-api-key: <your-key>" http://127.0.0.1:7654/tasks
 *
 * If CORTEX_DAEMON_KEY is not set, authentication is skipped with a warning (dev mode).
 */
import Fastify from 'fastify';
import fs from 'node:fs/promises';
import { initDatabase, closeDatabase } from './db.js';
import * as queries from './queries.js';
import { logger } from './logger.js';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskIdSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  NoteIdSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectIdSchema,
} from '../src/shared/validation.js';

const PORT = parseInt(process.env.CORTEX_AGENT_PORT ?? '7654', 10);
if (isNaN(PORT)) throw new Error('Invalid CORTEX_AGENT_PORT');

const AGENT_ID = process.env.CORTEX_AGENT_ID;
const OPENCLAW_URL = process.env.OPENCLAW_WEBHOOK_URL || 'http://127.0.0.1:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_WEBHOOK_TOKEN;
const EVENTS_FILE = '/tmp/cortex-agent-events.jsonl';

// --- Assignment watcher ---

// Track task id → updated_at so mutations (e.g. when_date changed to today) re-trigger
const seenAssignments = new Map<string, string>();

async function onTaskAssigned(task: { id: string; title: string; notes: string | null; priority: string | null; deadline: string | null }) {
  logger.info(`New task assigned: ${task.id}`);
  logger.debug(`New task assigned: ${task.id} - ${task.title}`);

  // Always log to events file
  const notification = {
    type: 'task_assigned',
    task_id: task.id,
    title: task.title,
    priority: task.priority,
    deadline: task.deadline,
    timestamp: new Date().toISOString(),
  };

  try {
    await fs.appendFile(EVENTS_FILE, JSON.stringify(notification) + '\n');
  } catch (err) {
    logger.error('Failed to write event file:', err);
  }

  // Call OpenClaw webhook to spawn isolated session
  if (OPENCLAW_TOKEN) {
    const priorityStr = task.priority ? ` [${task.priority}]` : '';
    const deadlineStr = task.deadline ? `\nDeadline: ${task.deadline}` : '';
    const notesStr = task.notes ? `\n\nNotes:\n${task.notes}` : '';

    const message = `New Cortex task assigned to you:${priorityStr}

**${task.title}**${deadlineStr}${notesStr}

Task ID: ${task.id}

Work on this task. When done, update the task status to 'logbook' via the Cortex daemon API:
curl -X PATCH http://127.0.0.1:7654/tasks/${task.id} -H "Content-Type: application/json" -d '{"status": "logbook"}'`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${OPENCLAW_URL}/hooks/agent`, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          name: 'Cortex',
          sessionKey: `cortex-task-${task.id.slice(0, 8)}`,
          deliver: true,
          channel: 'telegram',
        }),
      });

      if (res.ok) {
        logger.info(`OpenClaw agent spawned for task: ${task.id}`);
      } else {
        const err = await res.text();
        logger.error(`OpenClaw webhook failed (${res.status}): ${err}`);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.error('OpenClaw webhook timed out');
      } else {
        logger.error('OpenClaw webhook error:', err);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function pollAssignments() {
  if (!AGENT_ID) return;

  try {
    const tasks = await queries.getAssignedTasks(AGENT_ID);
    for (const task of tasks) {
      const prev = seenAssignments.get(task.id);
      if (prev === undefined || prev !== task.updated_at) {
        seenAssignments.set(task.id, task.updated_at);
        await onTaskAssigned(task);
      }
    }
  } catch (err) {
    logger.error('Assignment poll error:', err);
  }
}

// --- Wait for initial sync ---

function waitForSync(db: Awaited<ReturnType<typeof initDatabase>>, timeoutMs = 15_000): Promise<void> {
  if (db.currentStatus?.hasSynced) return Promise.resolve();

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

// --- Main ---

async function start() {
  const db = await initDatabase();
  await waitForSync(db);
  logger.info('Sync connected');

  const DAEMON_KEY = process.env.CORTEX_DAEMON_KEY;
  if (!DAEMON_KEY) {
    logger.warn('CORTEX_DAEMON_KEY is not set. Authentication is disabled.');
  }

  const app = Fastify();

  // Auth preHandler — skips /health
  app.addHook('preHandler', async (req, reply) => {
    if (req.url === '/health') return;
    if (!DAEMON_KEY) return; // graceful degradation in dev
    const key = req.headers['x-api-key'];
    if (key !== DAEMON_KEY) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Health
  app.get('/health', async () => ({
    status: 'ok',
    synced: db.currentStatus?.hasSynced ?? false,
  }));

  // --- Read endpoints ---

  app.get('/context/today', async () => queries.getTodayContext());

  app.get('/tasks', async (req) => {
    const { status } = req.query as { status?: string };
    return queries.getTasksByStatus(status || 'inbox');
  });

  app.get('/tasks/today', async () => queries.getTodayTasks());
  app.get('/tasks/overdue', async () => queries.getOverdueTasks());

  app.get('/tasks/assigned', async (_req, reply) => {
    if (!AGENT_ID) return reply.code(500).send({ error: 'CORTEX_AGENT_ID not set' });
    return queries.getAssignedTasks(AGENT_ID);
  });

  app.get('/meetings', async (req, reply) => {
    const { days } = req.query as { days?: string };
    const n = parseInt(days || '7', 10);
    if (isNaN(n) || n < 0) return reply.code(400).send({ error: 'days must be a non-negative integer' });
    return queries.getUpcomingMeetings(n);
  });

  app.get('/projects', async (req) => {
    const { status } = req.query as { status?: string };
    return queries.getProjects(status);
  });

  app.get('/daily-note/:date?', async (req) => {
    const { date } = req.params as { date?: string };
    const d = date || new Date().toISOString().split('T')[0];
    return (await queries.getDailyNote(d)) || { date: d, content: null };
  });

  // --- Write endpoints ---

  app.post('/tasks', async (req, reply) => {
    const result = CreateTaskSchema.safeParse(req.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0]?.message ?? 'Invalid input' });
    }
    const { title, status, priority, project_id, when_date, deadline } = result.data;
    return queries.createTask(title, { status, priority, project_id, when_date, deadline });
  });

  app.patch('/tasks/:id', async (req, reply) => {
    const idResult = TaskIdSchema.safeParse((req.params as { id: string }).id);
    if (!idResult.success) {
      return reply.code(400).send({ error: 'id must be a valid UUID' });
    }
    const bodyResult = UpdateTaskSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ error: bodyResult.error.errors[0]?.message ?? 'Invalid input' });
    }
    const { status, notes } = bodyResult.data;
    try {
      const found = await queries.updateTask(idResult.data, { status, notes });
      if (!found) return reply.code(404).send({ error: 'Task not found' });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(400).send({ error: message });
    }
  });

  app.delete('/tasks/:id', async (req, reply) => {
    const idResult = TaskIdSchema.safeParse((req.params as { id: string }).id);
    if (!idResult.success) return reply.code(400).send({ error: 'id must be a valid UUID' });
    const found = await queries.deleteTask(idResult.data);
    if (!found) return reply.code(404).send({ error: 'Task not found' });
    return { success: true };
  });

  // --- Notes ---

  app.get('/notes', async () => queries.getNotes());

  app.post('/notes', async (req, reply) => {
    const result = CreateNoteSchema.safeParse(req.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0]?.message ?? 'Invalid input' });
    }
    const { title, content, context_id, project_id } = result.data;
    return queries.createNote(title, { content, context_id, project_id });
  });

  app.patch('/notes/:id', async (req, reply) => {
    const idResult = NoteIdSchema.safeParse((req.params as { id: string }).id);
    if (!idResult.success) return reply.code(400).send({ error: 'id must be a valid UUID' });
    const bodyResult = UpdateNoteSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ error: bodyResult.error.errors[0]?.message ?? 'Invalid input' });
    }
    const { is_pinned, ...rest } = bodyResult.data;
    const found = await queries.updateNote(idResult.data, {
      ...rest,
      ...(is_pinned !== undefined ? { is_pinned: is_pinned ? 1 : 0 } : {}),
    });
    if (!found) return reply.code(404).send({ error: 'Note not found' });
    return { success: true };
  });

  app.delete('/notes/:id', async (req, reply) => {
    const idResult = NoteIdSchema.safeParse((req.params as { id: string }).id);
    if (!idResult.success) return reply.code(400).send({ error: 'id must be a valid UUID' });
    const found = await queries.deleteNote(idResult.data);
    if (!found) return reply.code(404).send({ error: 'Note not found' });
    return { success: true };
  });

  // --- Projects ---

  app.post('/projects', async (req, reply) => {
    const result = CreateProjectSchema.safeParse(req.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0]?.message ?? 'Invalid input' });
    }
    const { title, description, status, context_id } = result.data;
    return queries.createProject(title, { description, status, context_id });
  });

  app.patch('/projects/:id', async (req, reply) => {
    const idResult = ProjectIdSchema.safeParse((req.params as { id: string }).id);
    if (!idResult.success) return reply.code(400).send({ error: 'id must be a valid UUID' });
    const bodyResult = UpdateProjectSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ error: bodyResult.error.errors[0]?.message ?? 'Invalid input' });
    }
    const found = await queries.updateProject(idResult.data, bodyResult.data);
    if (!found) return reply.code(404).send({ error: 'Project not found' });
    return { success: true };
  });

  app.delete('/projects/:id', async (req, reply) => {
    const idResult = ProjectIdSchema.safeParse((req.params as { id: string }).id);
    if (!idResult.success) return reply.code(400).send({ error: 'id must be a valid UUID' });
    const found = await queries.deleteProject(idResult.data);
    if (!found) return reply.code(404).send({ error: 'Project not found' });
    return { success: true };
  });

  // --- Graceful shutdown ---

  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // --- Start ---

  await app.listen({ port: PORT, host: '127.0.0.1' });
  logger.info(`Agent daemon listening on http://127.0.0.1:${PORT}`);

  // Start assignment watcher
  if (AGENT_ID) {
    // Poll immediately — fires onTaskAssigned for any pre-existing assignments
    await pollAssignments();
    setInterval(pollAssignments, 2000);
    logger.info(`Watching for tasks assigned to agent ${AGENT_ID}`);
  }
}

start().catch((err) => {
  logger.error('Fatal:', err);
  process.exit(1);
});
