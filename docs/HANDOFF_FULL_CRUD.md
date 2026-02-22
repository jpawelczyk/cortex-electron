# Handoff: Full CRUD for Tasks, Notes, Projects

## Context

The agent daemon currently has full CRUD for tasks but only read for notes and projects. Add create/update/delete for notes and projects.

## Current State

| Entity | Read | Create | Update | Delete |
|--------|------|--------|--------|--------|
| Tasks | ✅ | ✅ | ✅ | ❌ |
| Notes | ✅ | ❌ | ❌ | ❌ |
| Projects | ✅ | ❌ | ❌ | ❌ |

## What to Build

### 1. Add to `queries.ts`

```typescript
// --- Notes ---

export async function createNote(
  title: string,
  options: { content?: string; context_id?: string; project_id?: string } = {}
): Promise<Note> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO notes (id, title, content, context_id, project_id, is_pinned, created_at, updated_at, source, agent_id)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'ai', ?)`,
    [id, title, options.content ?? null, options.context_id ?? null, options.project_id ?? null, now, now, AGENT_ID ?? null]
  );

  return db.getOptional<Note>('SELECT * FROM notes WHERE id = ?', [id])!;
}

export async function updateNote(
  id: string,
  fields: { title?: string; content?: string; context_id?: string | null; project_id?: string | null; is_pinned?: number }
): Promise<boolean> {
  const db = getDatabase();
  const existing = await db.getOptional<Note>('SELECT id FROM notes WHERE id = ?', [id]);
  if (!existing) return false;

  const updates: string[] = ['updated_at = ?', 'updated_by_source = ?', 'updated_by_agent_id = ?'];
  const values: unknown[] = [new Date().toISOString(), 'ai', AGENT_ID ?? null];

  if (fields.title !== undefined) { updates.push('title = ?'); values.push(fields.title); }
  if (fields.content !== undefined) { updates.push('content = ?'); values.push(fields.content); }
  if (fields.context_id !== undefined) { updates.push('context_id = ?'); values.push(fields.context_id); }
  if (fields.project_id !== undefined) { updates.push('project_id = ?'); values.push(fields.project_id); }
  if (fields.is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(fields.is_pinned); }

  values.push(id);
  await db.execute(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, values);
  return true;
}

export async function deleteNote(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = await db.execute(
    'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [now, now, id]
  );
  return (result.rowsAffected ?? 0) > 0;
}

// --- Projects ---

export async function createProject(
  title: string,
  options: { description?: string; status?: string; context_id?: string } = {}
): Promise<Project> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status = options.status ?? 'active';

  await db.execute(
    `INSERT INTO projects (id, title, description, status, context_id, sort_order, created_at, updated_at, source, agent_id)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'ai', ?)`,
    [id, title, options.description ?? null, status, options.context_id ?? null, now, now, AGENT_ID ?? null]
  );

  return db.getOptional<Project>('SELECT * FROM projects WHERE id = ?', [id])!;
}

export async function updateProject(
  id: string,
  fields: { title?: string; description?: string; status?: string; context_id?: string | null }
): Promise<boolean> {
  const db = getDatabase();
  const existing = await db.getOptional<Project>('SELECT id FROM projects WHERE id = ?', [id]);
  if (!existing) return false;

  const updates: string[] = ['updated_at = ?', 'updated_by_source = ?', 'updated_by_agent_id = ?'];
  const values: unknown[] = [new Date().toISOString(), 'ai', AGENT_ID ?? null];

  if (fields.title !== undefined) { updates.push('title = ?'); values.push(fields.title); }
  if (fields.description !== undefined) { updates.push('description = ?'); values.push(fields.description); }
  if (fields.status !== undefined) { updates.push('status = ?'); values.push(fields.status); }
  if (fields.context_id !== undefined) { updates.push('context_id = ?'); values.push(fields.context_id); }

  // Handle completion
  if (fields.status === 'completed') {
    updates.push('completed_at = ?');
    values.push(new Date().toISOString());
  }

  values.push(id);
  await db.execute(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
  return true;
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = await db.execute(
    'UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [now, now, id]
  );
  return (result.rowsAffected ?? 0) > 0;
}

// --- Tasks (add delete) ---

export async function deleteTask(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = await db.execute(
    'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [now, now, id]
  );
  return (result.rowsAffected ?? 0) > 0;
}
```

### 2. Add endpoints to `daemon.ts`

```typescript
// --- Notes ---

app.get('/notes', async () => queries.getNotes());

app.post('/notes', async (req, reply) => {
  const { title, content, context_id, project_id } = req.body as any;
  if (!title) return reply.code(400).send({ error: 'title required' });
  return queries.createNote(title, { content, context_id, project_id });
});

app.patch('/notes/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const fields = req.body as any;
  const found = await queries.updateNote(id, fields);
  if (!found) return reply.code(404).send({ error: 'Note not found' });
  return { success: true };
});

app.delete('/notes/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const found = await queries.deleteNote(id);
  if (!found) return reply.code(404).send({ error: 'Note not found' });
  return { success: true };
});

// --- Projects ---

app.post('/projects', async (req, reply) => {
  const { title, description, status, context_id } = req.body as any;
  if (!title) return reply.code(400).send({ error: 'title required' });
  return queries.createProject(title, { description, status, context_id });
});

app.patch('/projects/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const fields = req.body as any;
  const found = await queries.updateProject(id, fields);
  if (!found) return reply.code(404).send({ error: 'Project not found' });
  return { success: true };
});

app.delete('/projects/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const found = await queries.deleteProject(id);
  if (!found) return reply.code(404).send({ error: 'Project not found' });
  return { success: true };
});

// --- Tasks (add delete) ---

app.delete('/tasks/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const found = await queries.deleteTask(id);
  if (!found) return reply.code(404).send({ error: 'Task not found' });
  return { success: true };
});
```

### 3. Add CLI commands (optional but nice)

```typescript
program
  .command('add-note <title>')
  .option('-c, --content <content>', 'Note content')
  .option('--project <id>', 'Project ID')
  .action(async (title, opts) => { ... });

program
  .command('add-project <title>')
  .option('-d, --description <desc>', 'Description')
  .action(async (title, opts) => { ... });
```

## API Reference (after implementation)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| GET | `/notes` | List notes |
| POST | `/notes` | Create note |
| PATCH | `/notes/:id` | Update note |
| DELETE | `/notes/:id` | Delete note |
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |

## Success Criteria

1. All CRUD operations work via daemon API
2. All writes set `source='ai'` and `agent_id`
3. All updates set `updated_by_source` and `updated_by_agent_id`
4. Deletes are soft deletes (set `deleted_at`)
5. Changes sync to Supabase and appear in user's app
