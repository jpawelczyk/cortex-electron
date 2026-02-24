import { describe, it, expect, beforeEach } from 'vitest';
import { createContextService, ContextService, seedDefaultContexts } from './context.service';
import { createProjectService, ProjectService } from './project.service';
import { createTaskService, TaskService } from './task.service';
import { createTestDb, TestDb } from '../../../tests/helpers/db';

describe('ContextService', () => {
  let db: TestDb;
  let contextService: ContextService;
  let projectService: ProjectService;
  let taskService: TaskService;

  beforeEach(() => {
    db = createTestDb();
    contextService = createContextService(db);
    projectService = createProjectService(db);
    taskService = createTaskService(db);
  });

  describe('create', () => {
    it('generates a UUID for the context', async () => {
      const context = await contextService.create({ name: 'Work' });

      expect(context.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('sets created_at and updated_at timestamps', async () => {
      const before = new Date().toISOString();
      const context = await contextService.create({ name: 'Work' });
      const after = new Date().toISOString();

      expect(context.created_at).toBeDefined();
      expect(context.updated_at).toBeDefined();
      expect(context.created_at >= before).toBe(true);
      expect(context.created_at <= after).toBe(true);
      expect(context.created_at).toBe(context.updated_at);
    });

    it('stores the provided name', async () => {
      const context = await contextService.create({ name: 'Personal' });

      expect(context.name).toBe('Personal');
    });

    it('accepts optional color and icon', async () => {
      const context = await contextService.create({
        name: 'Work',
        color: '#3B82F6',
        icon: 'briefcase',
      });

      expect(context.color).toBe('#3B82F6');
      expect(context.icon).toBe('briefcase');
    });

    it('defaults nullable fields to null', async () => {
      const context = await contextService.create({ name: 'Minimal' });

      expect(context.color).toBeNull();
      expect(context.icon).toBeNull();
      expect(context.deleted_at).toBeNull();
    });
  });

  describe('get', () => {
    it('retrieves a context by id', async () => {
      const created = await contextService.create({ name: 'Find me' });

      const found = await contextService.get(created.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find me');
    });

    it('returns null for non-existent id', async () => {
      const found = await contextService.get('non-existent-uuid');

      expect(found).toBeNull();
    });

    it('returns null for soft-deleted contexts', async () => {
      const created = await contextService.create({ name: 'To be deleted' });
      await contextService.delete(created.id);

      const found = await contextService.get(created.id);

      expect(found).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns all non-deleted contexts', async () => {
      await contextService.create({ name: 'Work' });
      await contextService.create({ name: 'Personal' });
      await contextService.create({ name: 'Side Projects' });

      const contexts = await contextService.getAll();

      expect(contexts).toHaveLength(3);
    });

    it('excludes soft-deleted contexts', async () => {
      const c1 = await contextService.create({ name: 'Work' });
      await contextService.create({ name: 'Personal' });
      await contextService.delete(c1.id);

      const contexts = await contextService.getAll();

      expect(contexts).toHaveLength(1);
      expect(contexts[0].name).toBe('Personal');
    });
  });

  describe('update', () => {
    it('updates context fields', async () => {
      const context = await contextService.create({ name: 'Original' });

      const updated = await contextService.update(context.id, {
        name: 'Updated',
        color: '#EF4444',
      });

      expect(updated.name).toBe('Updated');
      expect(updated.color).toBe('#EF4444');
    });

    it('updates updated_at timestamp', async () => {
      const context = await contextService.create({ name: 'Context' });
      const originalUpdatedAt = context.updated_at;

      await new Promise(r => setTimeout(r, 10));

      const updated = await contextService.update(context.id, { name: 'Updated' });

      expect(updated.updated_at > originalUpdatedAt).toBe(true);
    });

    it('preserves fields not included in update', async () => {
      const context = await contextService.create({
        name: 'Work',
        color: '#3B82F6',
        icon: 'briefcase',
      });

      const updated = await contextService.update(context.id, { name: 'Office' });

      expect(updated.color).toBe('#3B82F6');
      expect(updated.icon).toBe('briefcase');
    });

    it('can clear optional fields by setting to null', async () => {
      const context = await contextService.create({
        name: 'Work',
        color: '#3B82F6',
        icon: 'briefcase',
      });

      const updated = await contextService.update(context.id, {
        color: null,
        icon: null,
      });

      expect(updated.color).toBeNull();
      expect(updated.icon).toBeNull();
    });

    it('throws error for non-existent context', async () => {
      await expect(
        contextService.update('non-existent', { name: 'Nope' })
      ).rejects.toThrow('Context not found');
    });
  });

  describe('delete', () => {
    it('soft deletes by setting deleted_at', async () => {
      const context = await contextService.create({ name: 'To delete' });

      await contextService.delete(context.id);

      const raw = db.getRawContext(context.id);
      expect(raw?.deleted_at).not.toBeNull();
    });

    it('throws error for non-existent context', async () => {
      await expect(
        contextService.delete('non-existent')
      ).rejects.toThrow('Context not found');
    });

    it('orphans projects by setting context_id to null', async () => {
      const context = await contextService.create({ name: 'Work' });
      const project = await projectService.create({ title: 'P1', context_id: context.id });

      await contextService.delete(context.id);

      const raw = db.getRawProject(project.id);
      expect(raw?.context_id).toBeNull();
    });

    it('orphans tasks by setting context_id to null', async () => {
      const context = await contextService.create({ name: 'Work' });
      const task = await taskService.create({ title: 'T1', context_id: context.id });

      await contextService.delete(context.id);

      const raw = db.getRawTask(task.id);
      expect(raw?.context_id).toBeNull();
    });
  });

  describe('getProjectsForContext', () => {
    it('returns projects belonging to the context', async () => {
      const context = await contextService.create({ name: 'Work' });

      await projectService.create({ title: 'Project 1', context_id: context.id });
      await projectService.create({ title: 'Project 2', context_id: context.id });
      await projectService.create({ title: 'Unrelated project' });

      const projects = await contextService.getProjectsForContext(context.id);

      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.title).sort()).toEqual(['Project 1', 'Project 2']);
    });

    it('excludes soft-deleted projects', async () => {
      const context = await contextService.create({ name: 'Work' });

      await projectService.create({ title: 'Project 1', context_id: context.id });
      const p2 = await projectService.create({ title: 'Project 2', context_id: context.id });
      await projectService.delete(p2.id);

      const projects = await contextService.getProjectsForContext(context.id);

      expect(projects).toHaveLength(1);
      expect(projects[0].title).toBe('Project 1');
    });

    it('returns empty array for context with no projects', async () => {
      const context = await contextService.create({ name: 'Empty' });

      const projects = await contextService.getProjectsForContext(context.id);

      expect(projects).toEqual([]);
    });
  });

  describe('seedDefaultContexts', () => {
    it('creates 3 default contexts when table is empty', async () => {
      await seedDefaultContexts({ db: db.db });

      const contexts = await contextService.getAll();
      expect(contexts).toHaveLength(3);

      const names = contexts.map(c => c.name).sort();
      expect(names).toEqual(['Personal', 'Research', 'Work']);
    });

    it('seeds correct colors and icons', async () => {
      await seedDefaultContexts({ db: db.db });

      const contexts = await contextService.getAll();
      const work = contexts.find(c => c.name === 'Work')!;
      const personal = contexts.find(c => c.name === 'Personal')!;
      const research = contexts.find(c => c.name === 'Research')!;

      expect(work.color).toBe('#f97316');
      expect(work.icon).toBe('Briefcase');

      expect(personal.color).toBe('#22c55e');
      expect(personal.icon).toBe('Home');

      expect(research.color).toBe('#06b6d4');
      expect(research.icon).toBe('FlaskConical');
    });

    it('does not duplicate contexts that already exist by name', async () => {
      await contextService.create({ name: 'Work' });

      await seedDefaultContexts({ db: db.db });

      const contexts = await contextService.getAll();
      // 'Work' already existed so should not be re-inserted; Personal + Research are new
      expect(contexts).toHaveLength(3);
      expect(contexts.filter(c => c.name === 'Work')).toHaveLength(1);
      expect(contexts.filter(c => c.name === 'Personal')).toHaveLength(1);
      expect(contexts.filter(c => c.name === 'Research')).toHaveLength(1);
    });
  });

  describe('getTasksForContext', () => {
    it('returns tasks belonging to the context', async () => {
      const context = await contextService.create({ name: 'Work' });

      await taskService.create({ title: 'Task 1', context_id: context.id });
      await taskService.create({ title: 'Task 2', context_id: context.id });
      await taskService.create({ title: 'Unrelated task' });

      const tasks = await contextService.getTasksForContext(context.id);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.title).sort()).toEqual(['Task 1', 'Task 2']);
    });

    it('excludes soft-deleted tasks', async () => {
      const context = await contextService.create({ name: 'Work' });

      await taskService.create({ title: 'Task 1', context_id: context.id });
      const t2 = await taskService.create({ title: 'Task 2', context_id: context.id });
      await taskService.delete(t2.id);

      const tasks = await contextService.getTasksForContext(context.id);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 1');
    });

    it('returns empty array for context with no tasks', async () => {
      const context = await contextService.create({ name: 'Empty' });

      const tasks = await contextService.getTasksForContext(context.id);

      expect(tasks).toEqual([]);
    });
  });
});
