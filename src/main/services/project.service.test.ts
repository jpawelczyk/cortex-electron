import { describe, it, expect, beforeEach } from 'vitest';
import { createProjectService, ProjectService } from './project.service';
import { createTaskService, TaskService } from './task.service';
import { createTestDb, TestDb } from '../../../tests/helpers/db';

describe('ProjectService', () => {
  let db: TestDb;
  let projectService: ProjectService;
  let taskService: TaskService;

  beforeEach(() => {
    db = createTestDb();
    projectService = createProjectService(db);
    taskService = createTaskService(db);
  });

  describe('create', () => {
    it('generates a UUID for the project', async () => {
      const project = await projectService.create({ title: 'Test project' });

      expect(project.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('sets status to active by default', async () => {
      const project = await projectService.create({ title: 'Test project' });

      expect(project.status).toBe('active');
    });

    it('sets created_at and updated_at timestamps', async () => {
      const before = new Date().toISOString();
      const project = await projectService.create({ title: 'Test project' });
      const after = new Date().toISOString();

      expect(project.created_at).toBeDefined();
      expect(project.updated_at).toBeDefined();
      expect(project.created_at >= before).toBe(true);
      expect(project.created_at <= after).toBe(true);
      expect(project.created_at).toBe(project.updated_at);
    });

    it('stores the provided title', async () => {
      const project = await projectService.create({ title: 'My Project' });

      expect(project.title).toBe('My Project');
    });

    it('accepts optional fields', async () => {
      const contextId = db.createContext({ name: 'Work' });
      const project = await projectService.create({
        title: 'Work Project',
        description: '# Project Notes\nSome markdown here',
        context_id: contextId,
      });

      expect(project.description).toBe('# Project Notes\nSome markdown here');
      expect(project.context_id).toBe(contextId);
    });

    it('allows overriding default status', async () => {
      const project = await projectService.create({
        title: 'Archived Project',
        status: 'archived',
      });

      expect(project.status).toBe('archived');
    });

    it('defaults nullable fields to null', async () => {
      const project = await projectService.create({ title: 'Minimal' });

      expect(project.description).toBeNull();
      expect(project.context_id).toBeNull();
      expect(project.completed_at).toBeNull();
      expect(project.deleted_at).toBeNull();
    });
  });

  describe('get', () => {
    it('retrieves a project by id', async () => {
      const created = await projectService.create({ title: 'Find me' });

      const found = await projectService.get(created.id);

      expect(found).not.toBeNull();
      expect(found?.title).toBe('Find me');
    });

    it('returns null for non-existent id', async () => {
      const found = await projectService.get('non-existent-uuid');

      expect(found).toBeNull();
    });

    it('returns null for soft-deleted projects', async () => {
      const created = await projectService.create({ title: 'To be deleted' });
      await projectService.delete(created.id);

      const found = await projectService.get(created.id);

      expect(found).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns all non-deleted projects', async () => {
      await projectService.create({ title: 'Project 1' });
      await projectService.create({ title: 'Project 2' });
      await projectService.create({ title: 'Project 3' });

      const projects = await projectService.getAll();

      expect(projects).toHaveLength(3);
    });

    it('excludes soft-deleted projects', async () => {
      const p1 = await projectService.create({ title: 'Project 1' });
      await projectService.create({ title: 'Project 2' });
      await projectService.delete(p1.id);

      const projects = await projectService.getAll();

      expect(projects).toHaveLength(1);
      expect(projects[0].title).toBe('Project 2');
    });

    it('filters by context_id', async () => {
      const workCtx = db.createContext({ name: 'Work' });
      const personalCtx = db.createContext({ name: 'Personal' });

      await projectService.create({ title: 'Work Project', context_id: workCtx });
      await projectService.create({ title: 'Personal Project', context_id: personalCtx });
      await projectService.create({ title: 'No Context Project' });

      const workProjects = await projectService.getAll({ contextId: workCtx });

      expect(workProjects).toHaveLength(1);
      expect(workProjects[0].title).toBe('Work Project');
    });
  });

  describe('update', () => {
    it('updates project fields', async () => {
      const project = await projectService.create({ title: 'Original' });

      const updated = await projectService.update(project.id, {
        title: 'Updated',
        description: 'New description',
      });

      expect(updated.title).toBe('Updated');
      expect(updated.description).toBe('New description');
    });

    it('updates updated_at timestamp', async () => {
      const project = await projectService.create({ title: 'Project' });
      const originalUpdatedAt = project.updated_at;

      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10));

      const updated = await projectService.update(project.id, { title: 'Updated' });

      expect(updated.updated_at > originalUpdatedAt).toBe(true);
    });

    it('sets completed_at when moving to completed', async () => {
      const project = await projectService.create({ title: 'Project' });
      expect(project.completed_at).toBeNull();

      const completed = await projectService.update(project.id, { status: 'completed' });

      expect(completed.completed_at).not.toBeNull();
    });

    it('preserves fields not included in update', async () => {
      const contextId = db.createContext({ name: 'Work' });
      const project = await projectService.create({
        title: 'Original',
        description: 'Keep me',
        context_id: contextId,
      });

      const updated = await projectService.update(project.id, { title: 'New Title' });

      expect(updated.description).toBe('Keep me');
      expect(updated.context_id).toBe(contextId);
    });

    it('throws error for non-existent project', async () => {
      await expect(
        projectService.update('non-existent', { title: 'Nope' })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('delete', () => {
    it('soft deletes by setting deleted_at', async () => {
      const project = await projectService.create({ title: 'To delete' });

      await projectService.delete(project.id);

      // Direct DB check to verify soft delete
      const raw = db.getRawProject(project.id);
      expect(raw?.deleted_at).not.toBeNull();
    });

    it('throws error for non-existent project', async () => {
      await expect(
        projectService.delete('non-existent')
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getByStatus', () => {
    it('returns only active projects', async () => {
      await projectService.create({ title: 'Active 1' });
      await projectService.create({ title: 'Active 2' });
      await projectService.create({ title: 'Completed', status: 'completed' });
      await projectService.create({ title: 'Archived', status: 'archived' });

      const active = await projectService.getByStatus('active');

      expect(active).toHaveLength(2);
      expect(active.every(p => p.status === 'active')).toBe(true);
    });

    it('returns only completed projects', async () => {
      await projectService.create({ title: 'Active' });
      await projectService.create({ title: 'Completed 1', status: 'completed' });
      await projectService.create({ title: 'Completed 2', status: 'completed' });

      const completed = await projectService.getByStatus('completed');

      expect(completed).toHaveLength(2);
      expect(completed.every(p => p.status === 'completed')).toBe(true);
    });

    it('returns only archived projects', async () => {
      await projectService.create({ title: 'Active' });
      await projectService.create({ title: 'Archived', status: 'archived' });

      const archived = await projectService.getByStatus('archived');

      expect(archived).toHaveLength(1);
      expect(archived[0].title).toBe('Archived');
    });

    it('excludes soft-deleted projects', async () => {
      const p = await projectService.create({ title: 'Active then deleted' });
      await projectService.delete(p.id);

      const active = await projectService.getByStatus('active');

      expect(active).toHaveLength(0);
    });
  });

  describe('getTasksForProject', () => {
    it('returns tasks belonging to the project', async () => {
      const project = await projectService.create({ title: 'My Project' });

      await taskService.create({ title: 'Task 1', project_id: project.id });
      await taskService.create({ title: 'Task 2', project_id: project.id });
      await taskService.create({ title: 'Unrelated task' });

      const tasks = await projectService.getTasksForProject(project.id);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.title).sort()).toEqual(['Task 1', 'Task 2']);
    });

    it('excludes soft-deleted tasks', async () => {
      const project = await projectService.create({ title: 'My Project' });

      await taskService.create({ title: 'Task 1', project_id: project.id });
      const t2 = await taskService.create({ title: 'Task 2', project_id: project.id });
      await taskService.delete(t2.id);

      const tasks = await projectService.getTasksForProject(project.id);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 1');
    });

    it('returns empty array for project with no tasks', async () => {
      const project = await projectService.create({ title: 'Empty Project' });

      const tasks = await projectService.getTasksForProject(project.id);

      expect(tasks).toEqual([]);
    });
  });
});
