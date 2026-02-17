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
});
