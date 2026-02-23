import { ipcMain } from 'electron';
import { createTaskService } from '../services/task.service';
import { createProjectService } from '../services/project.service';
import { createProjectStakeholderService } from '../services/project-stakeholder.service';
import { createNoteStakeholderService } from '../services/note-stakeholder.service';
import { createContextService } from '../services/context.service';
import { createStakeholderService } from '../services/stakeholder.service';
import { createChecklistService } from '../services/checklist.service';
import { createNoteService } from '../services/note.service';
import { createAIAgentService } from '../services/ai-agent.service';
import type { AsyncDatabase } from '../db/types';
import type { DbContext } from '../db/types';
import {
  CreateNoteSchema, UpdateNoteSchema, NoteIdSchema,
  CreateAIAgentSchema, AIAgentIdSchema,
  CreateTaskSchema, UpdateTaskSchema, TaskIdSchema,
  CreateProjectSchema, UpdateProjectSchema, ProjectIdSchema,
  CreateContextSchema, UpdateContextSchema, ContextIdSchema,
  CreateStakeholderSchema, UpdateStakeholderSchema, StakeholderIdSchema,
  CreateChecklistItemSchema, UpdateChecklistItemSchema, ChecklistItemIdSchema,
  LinkProjectStakeholderSchema, LinkNoteStakeholderSchema,
} from '@shared/validation';

export type NotifyChangeFn = (tables: string[]) => void;

/** Register a write handler. PowerSync onChange watcher handles renderer notifications. */
function handleWrite(
  channel: string,
  _tables: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (...args: any[]) => Promise<unknown>,
  _notify: NotifyChangeFn,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.handle(channel, async (_: any, ...args: any[]) => {
    return handler(...args);
  });
}

export function registerHandlers(db: AsyncDatabase, notify: NotifyChangeFn): void {
  const ctx: DbContext = { db };

  const taskService = createTaskService(ctx);
  const projectService = createProjectService(ctx);
  const projectStakeholderService = createProjectStakeholderService(ctx);
  const noteStakeholderService = createNoteStakeholderService(ctx);
  const contextService = createContextService(ctx);
  const stakeholderService = createStakeholderService(ctx);
  const checklistService = createChecklistService(ctx);
  const noteService = createNoteService(ctx);
  const agentService = createAIAgentService(ctx);

  // Tasks — reads
  ipcMain.handle('tasks:list', async () => { try { return await taskService.list(); } catch (err) { console.error('[IPC tasks:list]', err); throw err; } });
  ipcMain.handle('tasks:get', async (_, id: string) => { try { return await taskService.get(TaskIdSchema.parse(id)); } catch (err) { console.error('[IPC tasks:get]', err); throw err; } });
  ipcMain.handle('tasks:listTrashed', async () => { try { return await taskService.listTrashed(); } catch (err) { console.error('[IPC tasks:listTrashed]', err); throw err; } });

  // Tasks — writes
  handleWrite('tasks:create', ['tasks'], (input) => taskService.create(CreateTaskSchema.parse(input)), notify);
  handleWrite('tasks:update', ['tasks'], (id, input) => taskService.update(TaskIdSchema.parse(id as string), UpdateTaskSchema.parse(input)), notify);
  handleWrite('tasks:delete', ['tasks'], (id) => taskService.delete(TaskIdSchema.parse(id as string)), notify);
  handleWrite('tasks:restore', ['tasks'], (id) => taskService.restore(TaskIdSchema.parse(id as string)), notify);
  handleWrite('tasks:emptyTrash', ['tasks'], () => taskService.emptyTrash(), notify);
  handleWrite('tasks:purgeExpiredTrash', ['tasks'], (days) => taskService.purgeExpiredTrash(days as number), notify);

  // Projects — reads
  ipcMain.handle('projects:list', async () => { try { return await projectService.getAll(); } catch (err) { console.error('[IPC projects:list]', err); throw err; } });
  ipcMain.handle('projects:get', async (_, id: string) => { try { return await projectService.get(ProjectIdSchema.parse(id)); } catch (err) { console.error('[IPC projects:get]', err); throw err; } });

  // Projects — writes
  handleWrite('projects:create', ['projects'], (input) => projectService.create(CreateProjectSchema.parse(input)), notify);
  handleWrite('projects:update', ['projects'], (id, input) => projectService.update(ProjectIdSchema.parse(id as string), UpdateProjectSchema.parse(input)), notify);
  handleWrite('projects:delete', ['projects'], (id) => projectService.delete(ProjectIdSchema.parse(id as string)), notify);

  // Contexts — reads
  ipcMain.handle('contexts:list', async () => { try { return await contextService.getAll(); } catch (err) { console.error('[IPC contexts:list]', err); throw err; } });
  ipcMain.handle('contexts:get', async (_, id: string) => { try { return await contextService.get(ContextIdSchema.parse(id)); } catch (err) { console.error('[IPC contexts:get]', err); throw err; } });

  // Contexts — writes
  handleWrite('contexts:create', ['contexts'], (input) => contextService.create(CreateContextSchema.parse(input)), notify);
  handleWrite('contexts:update', ['contexts'], (id, input) => contextService.update(ContextIdSchema.parse(id as string), UpdateContextSchema.parse(input)), notify);
  handleWrite('contexts:delete', ['contexts'], (id) => contextService.delete(ContextIdSchema.parse(id as string)), notify);

  // Stakeholders — reads
  ipcMain.handle('stakeholders:list', async () => { try { return await stakeholderService.getAll(); } catch (err) { console.error('[IPC stakeholders:list]', err); throw err; } });
  ipcMain.handle('stakeholders:get', async (_, id: string) => { try { return await stakeholderService.get(StakeholderIdSchema.parse(id)); } catch (err) { console.error('[IPC stakeholders:get]', err); throw err; } });

  // Stakeholders — writes
  handleWrite('stakeholders:create', ['stakeholders'], (input) => stakeholderService.create(CreateStakeholderSchema.parse(input)), notify);
  handleWrite('stakeholders:update', ['stakeholders'], (id, input) => stakeholderService.update(StakeholderIdSchema.parse(id as string), UpdateStakeholderSchema.parse(input)), notify);
  handleWrite('stakeholders:delete', ['stakeholders'], (id) => stakeholderService.delete(StakeholderIdSchema.parse(id as string)), notify);

  // Project Stakeholders — reads
  ipcMain.handle('projectStakeholders:list', async (_, projectId: string) => { try { return await projectStakeholderService.listByProject(ProjectIdSchema.parse(projectId)); } catch (err) { console.error('[IPC projectStakeholders:list]', err); throw err; } });
  ipcMain.handle('projectStakeholders:listByStakeholder', async (_, stakeholderId: string) => { try { return await projectStakeholderService.listByStakeholder(StakeholderIdSchema.parse(stakeholderId)); } catch (err) { console.error('[IPC projectStakeholders:listByStakeholder]', err); throw err; } });

  // Project Stakeholders — writes
  handleWrite('projectStakeholders:link', ['project_stakeholders'], (input) => { const parsed = LinkProjectStakeholderSchema.parse(input); return projectStakeholderService.link(parsed.project_id, parsed.stakeholder_id); }, notify);
  handleWrite('projectStakeholders:unlink', ['project_stakeholders'], (input) => { const parsed = LinkProjectStakeholderSchema.parse(input); return projectStakeholderService.unlink(parsed.project_id, parsed.stakeholder_id); }, notify);

  // Note Stakeholders — reads
  ipcMain.handle('noteStakeholders:list', async (_, noteId: string) => { try { return await noteStakeholderService.listByNote(NoteIdSchema.parse(noteId)); } catch (err) { console.error('[IPC noteStakeholders:list]', err); throw err; } });
  ipcMain.handle('noteStakeholders:listByStakeholder', async (_, stakeholderId: string) => { try { return await noteStakeholderService.listByStakeholder(StakeholderIdSchema.parse(stakeholderId)); } catch (err) { console.error('[IPC noteStakeholders:listByStakeholder]', err); throw err; } });

  // Note Stakeholders — writes
  handleWrite('noteStakeholders:link', ['note_stakeholders'], (input) => { const parsed = LinkNoteStakeholderSchema.parse(input); return noteStakeholderService.link(parsed.note_id, parsed.stakeholder_id); }, notify);
  handleWrite('noteStakeholders:unlink', ['note_stakeholders'], (input) => { const parsed = LinkNoteStakeholderSchema.parse(input); return noteStakeholderService.unlink(parsed.note_id, parsed.stakeholder_id); }, notify);

  // Checklists — reads
  ipcMain.handle('checklists:list', async (_, taskId: string) => { try { return await checklistService.listByTask(TaskIdSchema.parse(taskId)); } catch (err) { console.error('[IPC checklists:list]', err); throw err; } });

  // Checklists — writes
  handleWrite('checklists:create', ['task_checklists'], (input) => checklistService.create(CreateChecklistItemSchema.parse(input)), notify);
  handleWrite('checklists:update', ['task_checklists'], (id, input) => checklistService.update(ChecklistItemIdSchema.parse(id as string), UpdateChecklistItemSchema.parse(input)), notify);
  handleWrite('checklists:delete', ['task_checklists'], (id) => checklistService.delete(ChecklistItemIdSchema.parse(id as string)), notify);
  handleWrite('checklists:reorder', ['task_checklists'], (taskId, itemIds) => checklistService.reorder(TaskIdSchema.parse(taskId as string), itemIds as string[]), notify);

  // Notes — reads
  ipcMain.handle('notes:list', async () => { try { return await noteService.list(); } catch (err) { console.error('[IPC notes:list]', err); throw err; } });
  ipcMain.handle('notes:get', async (_, id: string) => { try { return await noteService.get(NoteIdSchema.parse(id)); } catch (err) { console.error('[IPC notes:get]', err); throw err; } });

  // Notes — writes
  handleWrite('notes:create', ['notes'], (input) => noteService.create(CreateNoteSchema.parse(input)), notify);
  handleWrite('notes:update', ['notes'], (id, input) => noteService.update(NoteIdSchema.parse(id as string), UpdateNoteSchema.parse(input)), notify);
  handleWrite('notes:delete', ['notes'], (id) => noteService.delete(NoteIdSchema.parse(id as string)), notify);

  // AI Agents — reads
  ipcMain.handle('agents:list', async () => { try { return await agentService.list(); } catch (err) { console.error('[IPC agents:list]', err); throw err; } });

  // AI Agents — writes
  handleWrite('agents:create', ['ai_agents'], (input) => agentService.create(CreateAIAgentSchema.parse(input)), notify);
  handleWrite('agents:revoke', ['ai_agents'], (id) => agentService.revoke(AIAgentIdSchema.parse(id as string)), notify);
}
