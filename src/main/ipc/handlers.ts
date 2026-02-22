import { ipcMain } from 'electron';
import { createTaskService } from '../services/task.service';
import { createProjectService } from '../services/project.service';
import { createContextService } from '../services/context.service';
import { createStakeholderService } from '../services/stakeholder.service';
import { createChecklistService } from '../services/checklist.service';
import { createNoteService } from '../services/note.service';
import { createAIAgentService } from '../services/ai-agent.service';
import type { AsyncDatabase } from '../db/types';
import type { DbContext } from '../db/types';
import { CreateNoteSchema, UpdateNoteSchema, NoteIdSchema, CreateAIAgentSchema, AIAgentIdSchema } from '@shared/validation';

export function registerHandlers(db: AsyncDatabase): void {
  const ctx: DbContext = { db };

  const taskService = createTaskService(ctx);
  const projectService = createProjectService(ctx);
  const contextService = createContextService(ctx);
  const stakeholderService = createStakeholderService(ctx);
  const checklistService = createChecklistService(ctx);
  const noteService = createNoteService(ctx);
  const agentService = createAIAgentService(ctx);

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

  // Checklists
  ipcMain.handle('checklists:list', async (_, taskId: string) => checklistService.listByTask(taskId));
  ipcMain.handle('checklists:create', async (_, input) => checklistService.create(input));
  ipcMain.handle('checklists:update', async (_, id: string, input) => checklistService.update(id, input));
  ipcMain.handle('checklists:delete', async (_, id: string) => checklistService.delete(id));
  ipcMain.handle('checklists:reorder', async (_, taskId: string, itemIds: string[]) => checklistService.reorder(taskId, itemIds));

  // Notes
  ipcMain.handle('notes:list', async () => noteService.list());
  ipcMain.handle('notes:get', async (_, id: string) => noteService.get(NoteIdSchema.parse(id)));
  ipcMain.handle('notes:create', async (_, input) => noteService.create(CreateNoteSchema.parse(input)));
  ipcMain.handle('notes:update', async (_, id: string, input) => noteService.update(NoteIdSchema.parse(id), UpdateNoteSchema.parse(input)));
  ipcMain.handle('notes:delete', async (_, id: string) => noteService.delete(NoteIdSchema.parse(id)));

  // AI Agents
  ipcMain.handle('agents:list', async () => agentService.list());
  ipcMain.handle('agents:create', async (_, input) => agentService.create(CreateAIAgentSchema.parse(input)));
  ipcMain.handle('agents:revoke', async (_, id: string) => agentService.revoke(AIAgentIdSchema.parse(id)));
}
