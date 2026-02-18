import { describe, it, expect, beforeEach } from 'vitest';
import { createTaskService, TaskService } from './task.service';
import { createTestDb, TestDb } from '../../../tests/helpers/db';

describe('TaskService', () => {
  let db: TestDb;
  let taskService: TaskService;

  beforeEach(() => {
    db = createTestDb();
    taskService = createTaskService(db);
  });

  describe('create', () => {
    it('generates a UUID for the task', async () => {
      const task = await taskService.create({ title: 'Test task' });

      expect(task.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('sets status to inbox by default', async () => {
      const task = await taskService.create({ title: 'Test task' });

      expect(task.status).toBe('inbox');
    });

    it('sets created_at and updated_at timestamps', async () => {
      const before = new Date().toISOString();
      const task = await taskService.create({ title: 'Test task' });
      const after = new Date().toISOString();

      expect(task.created_at).toBeDefined();
      expect(task.updated_at).toBeDefined();
      expect(task.created_at >= before).toBe(true);
      expect(task.created_at <= after).toBe(true);
      expect(task.created_at).toBe(task.updated_at);
    });

    it('stores the provided title', async () => {
      const task = await taskService.create({ title: 'Buy groceries' });

      expect(task.title).toBe('Buy groceries');
    });

    it('accepts optional fields', async () => {
      const task = await taskService.create({
        title: 'Important task',
        notes: 'Some notes here',
        priority: 'P0',
        deadline: '2026-02-20',
      });

      expect(task.notes).toBe('Some notes here');
      expect(task.priority).toBe('P0');
      expect(task.deadline).toBe('2026-02-20');
    });

    it('allows overriding default status', async () => {
      const task = await taskService.create({
        title: 'Today task',
        status: 'today',
      });

      expect(task.status).toBe('today');
    });
  });

  describe('context inheritance', () => {
    it('inherits context_id from project when project_id is set', async () => {
      // Setup: create a context and project
      const contextId = db.createContext({ name: 'Work' });
      const projectId = db.createProject({ 
        title: 'Work Project', 
        context_id: contextId 
      });

      // Create task in that project
      const task = await taskService.create({
        title: 'Task in work project',
        project_id: projectId,
      });

      // Should inherit project's context
      expect(task.context_id).toBe(contextId);
    });

    it('ignores provided context_id when project_id is set', async () => {
      // Setup
      const workContextId = db.createContext({ name: 'Work' });
      const personalContextId = db.createContext({ name: 'Personal' });
      const projectId = db.createProject({ 
        title: 'Work Project', 
        context_id: workContextId 
      });

      // Try to create task with different context
      const task = await taskService.create({
        title: 'Task',
        project_id: projectId,
        context_id: personalContextId, // This should be ignored
      });

      // Should use project's context, not the provided one
      expect(task.context_id).toBe(workContextId);
    });

    it('uses provided context_id for standalone tasks', async () => {
      const contextId = db.createContext({ name: 'Personal' });

      const task = await taskService.create({
        title: 'Standalone task',
        context_id: contextId,
      });

      expect(task.context_id).toBe(contextId);
      expect(task.project_id).toBeNull();
    });

    it('allows null context for inbox tasks', async () => {
      const task = await taskService.create({
        title: 'Quick capture',
      });

      expect(task.context_id).toBeNull();
    });
  });

  describe('get', () => {
    it('retrieves a task by id', async () => {
      const created = await taskService.create({ title: 'Find me' });

      const found = await taskService.get(created.id);

      expect(found).not.toBeNull();
      expect(found?.title).toBe('Find me');
    });

    it('returns null for non-existent id', async () => {
      const found = await taskService.get('non-existent-uuid');

      expect(found).toBeNull();
    });

    it('returns null for soft-deleted tasks', async () => {
      const created = await taskService.create({ title: 'To be deleted' });
      await taskService.delete(created.id);

      const found = await taskService.get(created.id);

      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    it('returns all non-deleted tasks', async () => {
      await taskService.create({ title: 'Task 1' });
      await taskService.create({ title: 'Task 2' });
      await taskService.create({ title: 'Task 3' });

      const tasks = await taskService.list();

      expect(tasks).toHaveLength(3);
    });

    it('excludes soft-deleted tasks', async () => {
      const task1 = await taskService.create({ title: 'Task 1' });
      await taskService.create({ title: 'Task 2' });
      await taskService.delete(task1.id);

      const tasks = await taskService.list();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 2');
    });
  });

  describe('update', () => {
    it('updates task fields', async () => {
      const task = await taskService.create({ title: 'Original' });

      const updated = await taskService.update(task.id, { 
        title: 'Updated',
        priority: 'P1',
      });

      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('P1');
    });

    it('updates updated_at timestamp', async () => {
      const task = await taskService.create({ title: 'Task' });
      const originalUpdatedAt = task.updated_at;

      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10));

      const updated = await taskService.update(task.id, { title: 'Updated' });

      expect(updated.updated_at > originalUpdatedAt).toBe(true);
    });

    it('sets completed_at when moving to logbook', async () => {
      const task = await taskService.create({ title: 'Task' });
      expect(task.completed_at).toBeNull();

      const completed = await taskService.update(task.id, { status: 'logbook' });

      expect(completed.completed_at).not.toBeNull();
    });

    it('throws error for non-existent task', async () => {
      await expect(
        taskService.update('non-existent', { title: 'Nope' })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('delete', () => {
    it('soft deletes by setting deleted_at', async () => {
      const task = await taskService.create({ title: 'To delete' });

      await taskService.delete(task.id);

      // Direct DB check to verify soft delete
      const raw = db.getRawTask(task.id);
      expect(raw?.deleted_at).not.toBeNull();
    });

    it('throws error for non-existent task', async () => {
      await expect(
        taskService.delete('non-existent')
      ).rejects.toThrow('Task not found');
    });
  });

  describe('trash', () => {
    it('listTrashed returns soft-deleted tasks', async () => {
      const task1 = await taskService.create({ title: 'Deleted task' });
      await taskService.create({ title: 'Active task' });
      await taskService.delete(task1.id);

      const trashed = await taskService.listTrashed();

      expect(trashed).toHaveLength(1);
      expect(trashed[0].id).toBe(task1.id);
    });

    it('listTrashed excludes permanently deleted tasks', async () => {
      const task1 = await taskService.create({ title: 'Trashed' });
      const task2 = await taskService.create({ title: 'Emptied' });
      await taskService.delete(task1.id);
      await taskService.delete(task2.id);

      // Manually set permanently_deleted_at on task2
      const now = new Date().toISOString();
      db.db.prepare(
        'UPDATE tasks SET permanently_deleted_at = ? WHERE id = ?'
      ).run(now, task2.id);

      const trashed = await taskService.listTrashed();

      expect(trashed).toHaveLength(1);
      expect(trashed[0].id).toBe(task1.id);
    });

    it('listTrashed orders by deleted_at descending', async () => {
      const task1 = await taskService.create({ title: 'First deleted' });
      const task2 = await taskService.create({ title: 'Second deleted' });
      await taskService.delete(task1.id);
      await new Promise(r => setTimeout(r, 10));
      await taskService.delete(task2.id);

      const trashed = await taskService.listTrashed();

      expect(trashed[0].id).toBe(task2.id);
      expect(trashed[1].id).toBe(task1.id);
    });

    it('restore clears deleted_at and returns task to inbox', async () => {
      const task = await taskService.create({ title: 'To restore', status: 'today' });
      await taskService.delete(task.id);

      const restored = await taskService.restore(task.id);

      expect(restored.deleted_at).toBeNull();
      expect(restored.status).toBe('inbox');
      const raw = db.getRawTask(task.id);
      expect(raw?.deleted_at).toBeNull();
    });

    it('restore throws if task is not in trash', async () => {
      const task = await taskService.create({ title: 'Active' });

      await expect(
        taskService.restore(task.id)
      ).rejects.toThrow('Task is not in trash');
    });

    it('restore throws for non-existent task', async () => {
      await expect(
        taskService.restore('non-existent')
      ).rejects.toThrow('Task is not in trash');
    });

    it('emptyTrash sets permanently_deleted_at on all trashed tasks', async () => {
      const task1 = await taskService.create({ title: 'Trash 1' });
      const task2 = await taskService.create({ title: 'Trash 2' });
      await taskService.create({ title: 'Active' });
      await taskService.delete(task1.id);
      await taskService.delete(task2.id);

      await taskService.emptyTrash();

      const raw1 = db.getRawTask(task1.id);
      const raw2 = db.getRawTask(task2.id);
      expect(raw1?.permanently_deleted_at).not.toBeNull();
      expect(raw2?.permanently_deleted_at).not.toBeNull();

      const trashed = await taskService.listTrashed();
      expect(trashed).toHaveLength(0);
    });

    it('purgeExpiredTrash sets permanently_deleted_at for old trashed tasks', async () => {
      const task1 = await taskService.create({ title: 'Old trash' });
      const task2 = await taskService.create({ title: 'Recent trash' });
      await taskService.delete(task1.id);
      await taskService.delete(task2.id);

      // Backdate task1's deleted_at to 31 days ago
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      db.db.prepare(
        'UPDATE tasks SET deleted_at = ? WHERE id = ?'
      ).run(oldDate, task1.id);

      await taskService.purgeExpiredTrash(30);

      const raw1 = db.getRawTask(task1.id);
      const raw2 = db.getRawTask(task2.id);
      expect(raw1?.permanently_deleted_at).not.toBeNull();
      expect(raw2?.permanently_deleted_at).toBeNull();
    });
  });
});
