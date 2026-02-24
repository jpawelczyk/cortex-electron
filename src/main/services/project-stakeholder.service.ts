import type { ProjectStakeholder } from '@shared/types';
import type { DbContext } from '../db/types';

export interface ProjectStakeholderService {
  listByProject(projectId: string): Promise<ProjectStakeholder[]>;
  listByStakeholder(stakeholderId: string): Promise<ProjectStakeholder[]>;
  link(projectId: string, stakeholderId: string): Promise<ProjectStakeholder>;
  unlink(projectId: string, stakeholderId: string): Promise<void>;
}

export function createProjectStakeholderService(ctx: DbContext): ProjectStakeholderService {
  const { db } = ctx;

  return {
    async listByProject(projectId: string): Promise<ProjectStakeholder[]> {
      return db.getAll<ProjectStakeholder>(
        'SELECT * FROM project_stakeholders WHERE project_id = ?',
        [projectId]
      );
    },

    async listByStakeholder(stakeholderId: string): Promise<ProjectStakeholder[]> {
      return db.getAll<ProjectStakeholder>(
        'SELECT * FROM project_stakeholders WHERE stakeholder_id = ?',
        [stakeholderId]
      );
    },

    async link(projectId: string, stakeholderId: string): Promise<ProjectStakeholder> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.execute(
        'INSERT OR IGNORE INTO project_stakeholders (id, project_id, stakeholder_id, created_at) VALUES (?, ?, ?, ?)',
        [id, projectId, stakeholderId, now]
      );
      const row = await db.getOptional<ProjectStakeholder>(
        'SELECT * FROM project_stakeholders WHERE project_id = ? AND stakeholder_id = ?',
        [projectId, stakeholderId]
      );
      return row!;
    },

    async unlink(projectId: string, stakeholderId: string): Promise<void> {
      await db.execute(
        'DELETE FROM project_stakeholders WHERE project_id = ? AND stakeholder_id = ?',
        [projectId, stakeholderId]
      );
    },
  };
}
