import { describe, it, expect, beforeEach } from 'vitest';
import { createTaskService, TaskService } from './task.service';
import { createChecklistService, ChecklistService } from './checklist.service';
import { createTestDb, TestDb } from '../../../tests/helpers/db';

describe('TaskService', () => {
  let db: TestDb;
  let taskService: TaskService;
  let checklistService: ChecklistService;

  beforeEach(() => {
    db = createTestDb();
    taskService = createTaskService(db);
    checklistService = createChecklistService(db);
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
        priority: 'P1',
        deadline: '2026-02-20',
      });

      expect(task.notes).toBe('Some notes here');
      expect(task.priority).toBe('P1');
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

    it('clears completed_at when moving from logbook to another status', async () => {
      const task = await taskService.create({ title: 'Task' });
      const completed = await taskService.update(task.id, { status: 'logbook' });
      expect(completed.completed_at).not.toBeNull();

      const uncompleted = await taskService.update(task.id, { status: 'inbox' });

      expect(uncompleted.completed_at).toBeNull();
      expect(uncompleted.status).toBe('inbox');
    });

    it('preserves completed_at when updating non-status fields on logbook task', async () => {
      const task = await taskService.create({ title: 'Task' });
      const completed = await taskService.update(task.id, { status: 'logbook' });
      const completedAt = completed.completed_at;

      const updated = await taskService.update(task.id, { title: 'New title' });

      expect(updated.completed_at).toBe(completedAt);
    });

    it('throws error for non-existent task', async () => {
      await expect(
        taskService.update('non-existent', { title: 'Nope' })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('when_date/status auto-sync', () => {
    const today = new Date().toISOString().split('T')[0];
    const past = '2020-01-01';
    const future = '2099-12-31';
    const anotherFuture = '2099-06-15';

    describe('when_date → status derivation (update)', () => {
      it('setting when_date to today on inbox task → status becomes today', async () => {
        const task = await taskService.create({ title: 'T' });
        expect(task.status).toBe('inbox');

        const updated = await taskService.update(task.id, { when_date: today });
        expect(updated.status).toBe('today');
      });

      it('setting when_date to future on inbox task → status becomes upcoming', async () => {
        const task = await taskService.create({ title: 'T' });

        const updated = await taskService.update(task.id, { when_date: future });
        expect(updated.status).toBe('upcoming');
      });

      it('clearing when_date on inbox task → stays inbox', async () => {
        const task = await taskService.create({ title: 'T' });

        const updated = await taskService.update(task.id, { when_date: null });
        expect(updated.status).toBe('inbox');
      });

      it('setting when_date to future on today task → becomes upcoming', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: today });

        const updated = await taskService.update(task.id, { when_date: future });
        expect(updated.status).toBe('upcoming');
      });

      it('setting when_date to today on today task → stays today', async () => {
        const task = await taskService.create({ title: 'T', status: 'today' });

        const updated = await taskService.update(task.id, { when_date: today });
        expect(updated.status).toBe('today');
      });

      it('clearing when_date on today task → becomes anytime', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: today });

        const updated = await taskService.update(task.id, { when_date: null });
        expect(updated.status).toBe('anytime');
      });

      it('setting when_date to today on upcoming task → becomes today', async () => {
        const task = await taskService.create({ title: 'T', status: 'upcoming', when_date: future });

        const updated = await taskService.update(task.id, { when_date: today });
        expect(updated.status).toBe('today');
      });

      it('changing future date on upcoming task → stays upcoming', async () => {
        const task = await taskService.create({ title: 'T', status: 'upcoming', when_date: future });

        const updated = await taskService.update(task.id, { when_date: anotherFuture });
        expect(updated.status).toBe('upcoming');
      });

      it('clearing when_date on upcoming task → becomes anytime', async () => {
        const task = await taskService.create({ title: 'T', status: 'upcoming', when_date: future });

        const updated = await taskService.update(task.id, { when_date: null });
        expect(updated.status).toBe('anytime');
      });

      it('setting when_date on anytime task → becomes today or upcoming', async () => {
        const task = await taskService.create({ title: 'T', status: 'anytime' });

        const u1 = await taskService.update(task.id, { when_date: today });
        expect(u1.status).toBe('today');

        const u2 = await taskService.update(task.id, { when_date: future });
        expect(u2.status).toBe('upcoming');
      });

      it('setting when_date on someday task → becomes today or upcoming', async () => {
        const task = await taskService.create({ title: 'T', status: 'someday' });

        const u1 = await taskService.update(task.id, { when_date: today });
        expect(u1.status).toBe('today');

        const u2 = await taskService.update(task.id, { when_date: future });
        expect(u2.status).toBe('upcoming');
      });

      it('clearing when_date on someday task → stays someday', async () => {
        const task = await taskService.create({ title: 'T', status: 'someday' });

        const updated = await taskService.update(task.id, { when_date: null });
        expect(updated.status).toBe('someday');
      });

      it('setting when_date on logbook task → status unchanged', async () => {
        const task = await taskService.create({ title: 'T' });
        await taskService.update(task.id, { status: 'logbook' });

        const updated = await taskService.update(task.id, { when_date: future });
        expect(updated.status).toBe('logbook');
        expect(updated.completed_at).not.toBeNull();
      });

      it('setting when_date on cancelled task → status unchanged', async () => {
        const task = await taskService.create({ title: 'T', status: 'cancelled' });

        const updated = await taskService.update(task.id, { when_date: future });
        expect(updated.status).toBe('cancelled');
      });

      it('past when_date treated same as today', async () => {
        const task = await taskService.create({ title: 'T' });

        const updated = await taskService.update(task.id, { when_date: past });
        expect(updated.status).toBe('today');
      });
    });

    describe('status → when_date derivation (update)', () => {
      it('status to inbox → clears when_date', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: today });

        const updated = await taskService.update(task.id, { status: 'inbox' });
        expect(updated.when_date).toBeNull();
      });

      it('status to anytime → clears when_date', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: today });

        const updated = await taskService.update(task.id, { status: 'anytime' });
        expect(updated.when_date).toBeNull();
      });

      it('status to someday → clears when_date', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: today });

        const updated = await taskService.update(task.id, { status: 'someday' });
        expect(updated.when_date).toBeNull();
      });

      it('status to today → preserves when_date', async () => {
        const task = await taskService.create({ title: 'T', status: 'upcoming', when_date: future });

        const updated = await taskService.update(task.id, { status: 'today' });
        expect(updated.when_date).toBe(future);
      });

      it('status to upcoming → preserves when_date', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: today });

        const updated = await taskService.update(task.id, { status: 'upcoming' });
        expect(updated.when_date).toBe(today);
      });

      it('status to logbook → preserves when_date', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: today });

        const updated = await taskService.update(task.id, { status: 'logbook' });
        expect(updated.when_date).toBe(today);
      });
    });

    describe('stale auto-sync', () => {
      it('rescheduling stale task (when_date to today) → status becomes today, stale_at cleared', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: '2026-01-01' });
        await taskService.markStaleTasks(5);
        const stale = await taskService.get(task.id);
        expect(stale?.status).toBe('stale');
        expect(stale?.stale_at).not.toBeNull();

        const today = new Date().toISOString().split('T')[0];
        const updated = await taskService.update(task.id, { when_date: today });
        expect(updated.status).toBe('today');
        expect(updated.stale_at).toBeNull();
      });

      it('rescheduling stale task (when_date to future) → status becomes upcoming, stale_at cleared', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: '2026-01-01' });
        await taskService.markStaleTasks(5);

        const updated = await taskService.update(task.id, { when_date: '2099-12-31' });
        expect(updated.status).toBe('upcoming');
        expect(updated.stale_at).toBeNull();
      });

      it('clearing when_date on stale task → status becomes anytime, stale_at cleared', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: '2026-01-01' });
        await taskService.markStaleTasks(5);

        const updated = await taskService.update(task.id, { when_date: null });
        expect(updated.status).toBe('anytime');
        expect(updated.stale_at).toBeNull();
      });

      it('moving stale task to inbox → when_date cleared, stale_at cleared', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: '2026-01-01' });
        await taskService.markStaleTasks(5);

        const updated = await taskService.update(task.id, { status: 'inbox' });
        expect(updated.when_date).toBeNull();
        expect(updated.stale_at).toBeNull();
      });

      it('updating title on stale task → stays stale, stale_at preserved', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: '2026-01-01' });
        await taskService.markStaleTasks(5);
        const stale = await taskService.get(task.id);

        const updated = await taskService.update(task.id, { title: 'New title' });
        expect(updated.status).toBe('stale');
        expect(updated.stale_at).toBe(stale?.stale_at);
      });

      it('completing stale task → logbook, stale_at cleared', async () => {
        const task = await taskService.create({ title: 'T', status: 'today', when_date: '2026-01-01' });
        await taskService.markStaleTasks(5);

        const updated = await taskService.update(task.id, { status: 'logbook' });
        expect(updated.status).toBe('logbook');
        expect(updated.stale_at).toBeNull();
        expect(updated.completed_at).not.toBeNull();
      });
    });

    describe('both explicit / neither', () => {
      it('both provided → both honored', async () => {
        const task = await taskService.create({ title: 'T' });

        const updated = await taskService.update(task.id, { status: 'upcoming', when_date: future });
        expect(updated.status).toBe('upcoming');
        expect(updated.when_date).toBe(future);
      });

      it('title-only update → no side effects', async () => {
        const task = await taskService.create({ title: 'T', status: 'upcoming', when_date: future });

        const updated = await taskService.update(task.id, { title: 'New title' });
        expect(updated.status).toBe('upcoming');
        expect(updated.when_date).toBe(future);
      });
    });

    describe('create() auto-sync', () => {
      it('create with when_date today and no status → derives today', async () => {
        const task = await taskService.create({ title: 'T', when_date: today });
        expect(task.status).toBe('today');
      });

      it('create with when_date future and no status → derives upcoming', async () => {
        const task = await taskService.create({ title: 'T', when_date: future });
        expect(task.status).toBe('upcoming');
      });

      it('create with past when_date and no status → derives today', async () => {
        const task = await taskService.create({ title: 'T', when_date: past });
        expect(task.status).toBe('today');
      });

      it('create with when_date and status=anytime → clears when_date', async () => {
        const task = await taskService.create({ title: 'T', when_date: future, status: 'anytime' });
        expect(task.status).toBe('anytime');
        expect(task.when_date).toBeNull();
      });

      it('create with when_date and status=someday → clears when_date', async () => {
        const task = await taskService.create({ title: 'T', when_date: future, status: 'someday' });
        expect(task.status).toBe('someday');
        expect(task.when_date).toBeNull();
      });

      it('create with when_date and status=inbox → clears when_date', async () => {
        const task = await taskService.create({ title: 'T', when_date: future, status: 'inbox' });
        expect(task.status).toBe('inbox');
        expect(task.when_date).toBeNull();
      });

      it('create with when_date and status=today → keeps when_date', async () => {
        const task = await taskService.create({ title: 'T', when_date: future, status: 'today' });
        expect(task.status).toBe('today');
        expect(task.when_date).toBe(future);
      });

      it('create with when_date and status=upcoming → keeps when_date', async () => {
        const task = await taskService.create({ title: 'T', when_date: future, status: 'upcoming' });
        expect(task.status).toBe('upcoming');
        expect(task.when_date).toBe(future);
      });

      it('create with neither → inbox, null when_date', async () => {
        const task = await taskService.create({ title: 'T' });
        expect(task.status).toBe('inbox');
        expect(task.when_date).toBeNull();
      });
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

    it('is a no-op for non-existent task', async () => {
      await expect(
        taskService.delete('non-existent')
      ).resolves.toBeUndefined();
    });

    it('soft-deleting a task also soft-deletes its checklist items', async () => {
      const task = await taskService.create({ title: 'Parent task' });
      const item1 = await checklistService.create({ task_id: task.id, title: 'Item 1' });
      const item2 = await checklistService.create({ task_id: task.id, title: 'Item 2' });
      const item3 = await checklistService.create({ task_id: task.id, title: 'Item 3' });

      await taskService.delete(task.id);

      const rawTask = db.getRawTask(task.id);
      const rawItem1 = db.getRawChecklistItem(item1.id);
      const rawItem2 = db.getRawChecklistItem(item2.id);
      const rawItem3 = db.getRawChecklistItem(item3.id);

      expect(rawTask?.deleted_at).not.toBeNull();
      expect(rawItem1?.deleted_at).not.toBeNull();
      expect(rawItem2?.deleted_at).not.toBeNull();
      expect(rawItem3?.deleted_at).not.toBeNull();

      // All should share the same timestamp
      expect(rawItem1?.deleted_at).toBe(rawTask?.deleted_at);
      expect(rawItem2?.deleted_at).toBe(rawTask?.deleted_at);
      expect(rawItem3?.deleted_at).toBe(rawTask?.deleted_at);
    });

    it('soft-deleting a task with no checklist items still works', async () => {
      const task = await taskService.create({ title: 'No checklists' });

      await taskService.delete(task.id);

      const raw = db.getRawTask(task.id);
      expect(raw?.deleted_at).not.toBeNull();
    });
  });

  describe('markStaleTasks', () => {
    it('marks task with old when_date and status=today as stale', async () => {
      const task = await taskService.create({ title: 'Old task', status: 'today', when_date: '2026-01-01' });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(1);
      const updated = await taskService.get(task.id);
      expect(updated?.status).toBe('stale');
      expect(updated?.stale_at).not.toBeNull();
    });

    it('marks task with old when_date and status=upcoming as stale', async () => {
      const task = await taskService.create({ title: 'Old upcoming', status: 'upcoming', when_date: '2026-01-01' });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(1);
      const updated = await taskService.get(task.id);
      expect(updated?.status).toBe('stale');
    });

    it('does NOT mark anytime tasks', async () => {
      await taskService.create({ title: 'Anytime', status: 'anytime' });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(0);
    });

    it('does NOT mark someday tasks', async () => {
      await taskService.create({ title: 'Someday', status: 'someday' });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(0);
    });

    it('does NOT mark completed/logbook tasks', async () => {
      const task = await taskService.create({ title: 'Done', status: 'today', when_date: '2026-01-01' });
      await taskService.update(task.id, { status: 'logbook' });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(0);
    });

    it('does NOT mark tasks within threshold', async () => {
      // 3 days ago is within 5-day threshold; use UTC to match service logic
      const now = new Date();
      const threeDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 3));
      const whenDate = threeDaysAgo.toISOString().split('T')[0];
      await taskService.create({ title: 'Recent', status: 'today', when_date: whenDate });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(0);
    });

    it('does NOT mark tasks with past deadline (due wins)', async () => {
      await taskService.create({ title: 'Overdue', status: 'today', when_date: '2026-01-01', deadline: '2026-01-15' });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(0);
    });

    it('marks tasks with future deadline (deadline not past)', async () => {
      const task = await taskService.create({ title: 'Future deadline', status: 'today', when_date: '2026-01-01', deadline: '2099-12-31' });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(1);
      const updated = await taskService.get(task.id);
      expect(updated?.status).toBe('stale');
    });

    it('preserves existing stale_at (uses COALESCE)', async () => {
      const task = await taskService.create({ title: 'Already stale', status: 'today', when_date: '2026-01-01' });
      // First mark
      await taskService.markStaleTasks(5);
      const afterFirst = await taskService.get(task.id);
      const originalStaleAt = afterFirst?.stale_at;

      // Reset status to today to test re-marking
      db.db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('today', task.id);

      await new Promise(r => setTimeout(r, 10));
      await taskService.markStaleTasks(5);
      const afterSecond = await taskService.get(task.id);
      expect(afterSecond?.stale_at).toBe(originalStaleAt);
    });

    it('returns count of affected rows', async () => {
      await taskService.create({ title: 'Old 1', status: 'today', when_date: '2026-01-01' });
      await taskService.create({ title: 'Old 2', status: 'upcoming', when_date: '2026-01-02' });
      await taskService.create({ title: 'Recent', status: 'today', when_date: new Date().toISOString().split('T')[0] });
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(2);
    });

    it('does NOT mark deleted tasks', async () => {
      const task = await taskService.create({ title: 'Deleted', status: 'today', when_date: '2026-01-01' });
      await taskService.delete(task.id);
      const count = await taskService.markStaleTasks(5);
      expect(count).toBe(0);
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
