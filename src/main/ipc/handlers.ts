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

export type NotifyChangeFn = (tables: string[]) => void;

/** Register a write handler that notifies the renderer after the operation completes. */
function handleWrite(
  channel: string,
  tables: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (...args: any[]) => Promise<unknown>,
  notify: NotifyChangeFn,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.handle(channel, async (_: any, ...args: any[]) => {
    const result = await handler(...args);
    notify(tables);
    return result;
  });
}

export function registerHandlers(db: AsyncDatabase, notify: NotifyChangeFn): void {
  const ctx: DbContext = { db };

  const taskService = createTaskService(ctx);
  const projectService = createProjectService(ctx);
  const contextService = createContextService(ctx);
  const stakeholderService = createStakeholderService(ctx);
  const checklistService = createChecklistService(ctx);
  const noteService = createNoteService(ctx);
  const agentService = createAIAgentService(ctx);

  // Tasks — reads
  ipcMain.handle('tasks:list', async () => taskService.list());
  ipcMain.handle('tasks:get', async (_, id: string) => taskService.get(id));
  ipcMain.handle('tasks:listTrashed', async () => taskService.listTrashed());

  // Tasks — writes
  handleWrite('tasks:create', ['tasks'], (input) => taskService.create(input), notify);
  handleWrite('tasks:update', ['tasks'], (id, input) => taskService.update(id as string, input), notify);
  handleWrite('tasks:delete', ['tasks'], (id) => taskService.delete(id as string), notify);
  handleWrite('tasks:restore', ['tasks'], (id) => taskService.restore(id as string), notify);
  handleWrite('tasks:emptyTrash', ['tasks'], () => taskService.emptyTrash(), notify);
  handleWrite('tasks:purgeExpiredTrash', ['tasks'], (days) => taskService.purgeExpiredTrash(days as number), notify);

  // Projects — reads
  ipcMain.handle('projects:list', async () => projectService.getAll());
  ipcMain.handle('projects:get', async (_, id: string) => projectService.get(id));

  // Projects — writes
  handleWrite('projects:create', ['projects'], (input) => projectService.create(input), notify);
  handleWrite('projects:update', ['projects'], (id, input) => projectService.update(id as string, input), notify);
  handleWrite('projects:delete', ['projects'], (id) => projectService.delete(id as string), notify);

  // Contexts — reads
  ipcMain.handle('contexts:list', async () => contextService.getAll());
  ipcMain.handle('contexts:get', async (_, id: string) => contextService.get(id));

  // Contexts — writes
  handleWrite('contexts:create', ['contexts'], (input) => contextService.create(input), notify);
  handleWrite('contexts:update', ['contexts'], (id, input) => contextService.update(id as string, input), notify);
  handleWrite('contexts:delete', ['contexts'], (id) => contextService.delete(id as string), notify);

  // Stakeholders — reads
  ipcMain.handle('stakeholders:list', async () => stakeholderService.getAll());
  ipcMain.handle('stakeholders:get', async (_, id: string) => stakeholderService.get(id));

  // Stakeholders — writes
  handleWrite('stakeholders:create', ['stakeholders'], (input) => stakeholderService.create(input), notify);
  handleWrite('stakeholders:update', ['stakeholders'], (id, input) => stakeholderService.update(id as string, input), notify);
  handleWrite('stakeholders:delete', ['stakeholders'], (id) => stakeholderService.delete(id as string), notify);

  // Checklists — reads
  ipcMain.handle('checklists:list', async (_, taskId: string) => checklistService.listByTask(taskId));

  // Checklists — writes
  handleWrite('checklists:create', ['task_checklists'], (input) => checklistService.create(input), notify);
  handleWrite('checklists:update', ['task_checklists'], (id, input) => checklistService.update(id as string, input), notify);
  handleWrite('checklists:delete', ['task_checklists'], (id) => checklistService.delete(id as string), notify);
  handleWrite('checklists:reorder', ['task_checklists'], (taskId, itemIds) => checklistService.reorder(taskId as string, itemIds as string[]), notify);

  // Notes — reads
  ipcMain.handle('notes:list', async () => noteService.list());
  ipcMain.handle('notes:get', async (_, id: string) => noteService.get(NoteIdSchema.parse(id)));

  // Notes — writes
  handleWrite('notes:create', ['notes'], (input) => noteService.create(CreateNoteSchema.parse(input)), notify);
  handleWrite('notes:update', ['notes'], (id, input) => noteService.update(NoteIdSchema.parse(id as string), UpdateNoteSchema.parse(input)), notify);
  handleWrite('notes:delete', ['notes'], (id) => noteService.delete(NoteIdSchema.parse(id as string)), notify);

  // AI Agents — reads
  ipcMain.handle('agents:list', async () => agentService.list());

  // AI Agents — writes
  handleWrite('agents:create', ['ai_agents'], (input) => agentService.create(CreateAIAgentSchema.parse(input)), notify);
  handleWrite('agents:revoke', ['ai_agents'], (id) => agentService.revoke(AIAgentIdSchema.parse(id as string)), notify);
}
