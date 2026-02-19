import { describe, it, expect, beforeEach } from 'vitest';
import { createChecklistService, ChecklistService } from './checklist.service';
import { createTestDb, TestDb } from '../../../tests/helpers/db';
import { createTaskService, TaskService } from './task.service';

describe('ChecklistService', () => {
  let db: TestDb;
  let checklistService: ChecklistService;
  let taskService: TaskService;
  let taskId: string;

  beforeEach(async () => {
    db = createTestDb();
    checklistService = createChecklistService(db);
    taskService = createTaskService(db);

    const task = await taskService.create({ title: 'Test task' });
    taskId = task.id;
  });

  describe('create', () => {
    it('generates a UUID for the checklist item', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'Step 1' });

      expect(item.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('sets created_at and updated_at timestamps', async () => {
      const before = new Date().toISOString();
      const item = await checklistService.create({ task_id: taskId, title: 'Step 1' });
      const after = new Date().toISOString();

      expect(item.created_at).toBeDefined();
      expect(item.updated_at).toBeDefined();
      expect(item.created_at >= before).toBe(true);
      expect(item.created_at <= after).toBe(true);
      expect(item.created_at).toBe(item.updated_at);
    });

    it('defaults is_done to false', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'Step 1' });

      expect(item.is_done).toBe(false);
    });

    it('stores the provided title and task_id', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'Buy milk' });

      expect(item.title).toBe('Buy milk');
      expect(item.task_id).toBe(taskId);
    });

    it('auto-increments sort_order for the same task', async () => {
      const item1 = await checklistService.create({ task_id: taskId, title: 'Step 1' });
      const item2 = await checklistService.create({ task_id: taskId, title: 'Step 2' });
      const item3 = await checklistService.create({ task_id: taskId, title: 'Step 3' });

      expect(item1.sort_order).toBe(0);
      expect(item2.sort_order).toBe(1);
      expect(item3.sort_order).toBe(2);
    });

    it('auto-increments sort_order independently per task', async () => {
      const task2 = await taskService.create({ title: 'Another task' });

      await checklistService.create({ task_id: taskId, title: 'Task1 Step 1' });
      await checklistService.create({ task_id: taskId, title: 'Task1 Step 2' });
      const otherItem = await checklistService.create({ task_id: task2.id, title: 'Task2 Step 1' });

      expect(otherItem.sort_order).toBe(0);
    });

    it('sets deleted_at to null', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'Step 1' });

      expect(item.deleted_at).toBeNull();
    });
  });

  describe('listByTask', () => {
    it('returns items for a task ordered by sort_order', async () => {
      await checklistService.create({ task_id: taskId, title: 'Step 1' });
      await checklistService.create({ task_id: taskId, title: 'Step 2' });
      await checklistService.create({ task_id: taskId, title: 'Step 3' });

      const items = await checklistService.listByTask(taskId);

      expect(items).toHaveLength(3);
      expect(items[0].title).toBe('Step 1');
      expect(items[1].title).toBe('Step 2');
      expect(items[2].title).toBe('Step 3');
    });

    it('excludes soft-deleted items', async () => {
      const item1 = await checklistService.create({ task_id: taskId, title: 'Step 1' });
      await checklistService.create({ task_id: taskId, title: 'Step 2' });
      await checklistService.delete(item1.id);

      const items = await checklistService.listByTask(taskId);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Step 2');
    });

    it('returns empty array for task with no items', async () => {
      const items = await checklistService.listByTask(taskId);

      expect(items).toEqual([]);
    });

    it('does not return items from other tasks', async () => {
      const task2 = await taskService.create({ title: 'Other task' });
      await checklistService.create({ task_id: taskId, title: 'Task1 item' });
      await checklistService.create({ task_id: task2.id, title: 'Task2 item' });

      const items = await checklistService.listByTask(taskId);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Task1 item');
    });
  });

  describe('update', () => {
    it('updates the title', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'Old title' });

      const updated = await checklistService.update(item.id, { title: 'New title' });

      expect(updated.title).toBe('New title');
    });

    it('updates is_done', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'Step 1' });

      const updated = await checklistService.update(item.id, { is_done: true });

      expect(updated.is_done).toBe(true);
    });

    it('updates sort_order', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'Step 1' });

      const updated = await checklistService.update(item.id, { sort_order: 5 });

      expect(updated.sort_order).toBe(5);
    });

    it('updates updated_at timestamp', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'Step 1' });
      const originalUpdatedAt = item.updated_at;

      await new Promise(r => setTimeout(r, 10));

      const updated = await checklistService.update(item.id, { title: 'Updated' });

      expect(updated.updated_at > originalUpdatedAt).toBe(true);
    });

    it('throws error for non-existent item', async () => {
      await expect(
        checklistService.update('non-existent', { title: 'Nope' })
      ).rejects.toThrow('Checklist item not found');
    });
  });

  describe('delete', () => {
    it('soft deletes by setting deleted_at', async () => {
      const item = await checklistService.create({ task_id: taskId, title: 'To delete' });

      await checklistService.delete(item.id);

      const raw = db.getRawChecklistItem(item.id);
      expect(raw?.deleted_at).not.toBeNull();
    });

    it('throws error for non-existent item', async () => {
      await expect(
        checklistService.delete('non-existent')
      ).rejects.toThrow('Checklist item not found');
    });
  });

  describe('reorder', () => {
    it('sets sort_order based on array position', async () => {
      const item1 = await checklistService.create({ task_id: taskId, title: 'A' });
      const item2 = await checklistService.create({ task_id: taskId, title: 'B' });
      const item3 = await checklistService.create({ task_id: taskId, title: 'C' });

      // Reverse the order
      await checklistService.reorder(taskId, [item3.id, item1.id, item2.id]);

      const items = await checklistService.listByTask(taskId);
      expect(items[0].id).toBe(item3.id);
      expect(items[0].sort_order).toBe(0);
      expect(items[1].id).toBe(item1.id);
      expect(items[1].sort_order).toBe(1);
      expect(items[2].id).toBe(item2.id);
      expect(items[2].sort_order).toBe(2);
    });
  });
});
