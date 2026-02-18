import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { createTaskService } from '../services/task.service';
import { createProjectService } from '../services/project.service';
import { createContextService } from '../services/context.service';
import { createStakeholderService } from '../services/stakeholder.service';

export function registerHandlers(db: Database.Database): void {
  const dbProvider = { db } as any;

  const taskService = createTaskService(dbProvider);
  const projectService = createProjectService(dbProvider);
  const contextService = createContextService(dbProvider);
  const stakeholderService = createStakeholderService(dbProvider);

  // Tasks
  ipcMain.handle('tasks:list', async () => taskService.list());
  ipcMain.handle('tasks:get', async (_, id: string) => taskService.get(id));
  ipcMain.handle('tasks:create', async (_, input) => taskService.create(input));
  ipcMain.handle('tasks:update', async (_, id: string, input) => taskService.update(id, input));
  ipcMain.handle('tasks:delete', async (_, id: string) => taskService.delete(id));
  ipcMain.handle('tasks:listTrashed', async () => taskService.listTrashed());
  ipcMain.handle('tasks:restore', async (_, id: string) => taskService.restore(id));
  ipcMain.handle('tasks:emptyTrash', async () => taskService.emptyTrash());
  ipcMain.handle('tasks:purgeExpiredTrash', async (_, days: number) => taskService.purgeExpiredTrash(days));

  // Projects
  ipcMain.handle('projects:list', async () => projectService.getAll());
  ipcMain.handle('projects:get', async (_, id: string) => projectService.get(id));
  ipcMain.handle('projects:create', async (_, input) => projectService.create(input));
  ipcMain.handle('projects:update', async (_, id: string, input) => projectService.update(id, input));
  ipcMain.handle('projects:delete', async (_, id: string) => projectService.delete(id));

  // Contexts
  ipcMain.handle('contexts:list', async () => contextService.getAll());
  ipcMain.handle('contexts:get', async (_, id: string) => contextService.get(id));
  ipcMain.handle('contexts:create', async (_, input) => contextService.create(input));
  ipcMain.handle('contexts:update', async (_, id: string, input) => contextService.update(id, input));
  ipcMain.handle('contexts:delete', async (_, id: string) => contextService.delete(id));

  // Stakeholders
  ipcMain.handle('stakeholders:list', async () => stakeholderService.getAll());
  ipcMain.handle('stakeholders:get', async (_, id: string) => stakeholderService.get(id));
  ipcMain.handle('stakeholders:create', async (_, input) => stakeholderService.create(input));
  ipcMain.handle('stakeholders:update', async (_, id: string, input) => stakeholderService.update(id, input));
  ipcMain.handle('stakeholders:delete', async (_, id: string) => stakeholderService.delete(id));
}
