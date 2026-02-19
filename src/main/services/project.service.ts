import { v4 as uuid } from 'uuid';
import type { Project, Task, ProjectStatus, CreateProjectInput, UpdateProjectInput } from '@shared/types';
import type { DbContext } from '../db/types';

export interface ProjectService {
  create(input: CreateProjectInput): Promise<Project>;
  get(id: string): Promise<Project | null>;
  getAll(filter?: { contextId?: string }): Promise<Project[]>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  delete(id: string): Promise<void>;
  getByStatus(status: ProjectStatus): Promise<Project[]>;
  getTasksForProject(projectId: string): Promise<Task[]>;
}

export function createProjectService(ctx: DbContext): ProjectService {
  const { db } = ctx;

  return {
    async create(input: CreateProjectInput): Promise<Project> {
      const id = uuid();
      const now = new Date().toISOString();

      const project: Project = {
        id,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'active',
        context_id: input.context_id ?? null,
        sort_order: 0,
        created_at: now,
        updated_at: now,
        completed_at: null,
        deleted_at: null,
      };

      db.prepare(`
        INSERT INTO projects (
          id, title, description, status, context_id,
          sort_order, created_at, updated_at, completed_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        project.id, project.title, project.description, project.status, project.context_id,
        project.sort_order, project.created_at, project.updated_at, project.completed_at, project.deleted_at
      );

      return project;
    },

    async get(id: string): Promise<Project | null> {
      const row = db.prepare(
        'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL'
      ).get(id) as Project | undefined;
      return row ?? null;
    },

    async getAll(filter?: { contextId?: string }): Promise<Project[]> {
      if (filter?.contextId) {
        return db.prepare(
          'SELECT * FROM projects WHERE deleted_at IS NULL AND context_id = ? ORDER BY sort_order, created_at'
        ).all(filter.contextId) as Project[];
      }
      return db.prepare(
        'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY sort_order, created_at'
      ).all() as Project[];
    },

    async update(id: string, input: UpdateProjectInput): Promise<Project> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Project not found');
      }

      const now = new Date().toISOString();

      // Determine if completing
      const isCompleting = input.status === 'completed' && existing.status !== 'completed';
      const completedAt = isCompleting ? now : existing.completed_at;

      const updated: Project = {
        ...existing,
        ...input,
        updated_at: now,
        completed_at: completedAt,
      };

      db.prepare(`
        UPDATE projects SET
          title = ?, description = ?, status = ?, context_id = ?,
          sort_order = ?, updated_at = ?, completed_at = ?
        WHERE id = ?
      `).run(
        updated.title, updated.description, updated.status, updated.context_id,
        updated.sort_order, updated.updated_at, updated.completed_at,
        id
      );

      return updated;
    },

    async delete(id: string): Promise<void> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Project not found');
      }

      const now = new Date().toISOString();
      db.prepare(
        'UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?'
      ).run(now, now, id);
    },

    async getByStatus(status: ProjectStatus): Promise<Project[]> {
      return db.prepare(
        'SELECT * FROM projects WHERE status = ? AND deleted_at IS NULL ORDER BY sort_order, created_at'
      ).all(status) as Project[];
    },

    async getTasksForProject(projectId: string): Promise<Task[]> {
      return db.prepare(
        'SELECT * FROM tasks WHERE project_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at'
      ).all(projectId) as Task[];
    },
  };
}
