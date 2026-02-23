import { contextBridge, ipcRenderer } from 'electron';
import type {
  Task, CreateTaskInput, UpdateTaskInput,
  Project, CreateProjectInput, UpdateProjectInput,
  Context, CreateContextInput, UpdateContextInput,
  Note, CreateNoteInput, UpdateNoteInput,
  ChecklistItem, CreateChecklistItemInput, UpdateChecklistItemInput,
  Stakeholder, CreateStakeholderInput, UpdateStakeholderInput,
  AIAgent, CreateAIAgentInput,
  ProjectStakeholder, NoteStakeholder,
} from '../shared/types';

interface DailyNote {
  date: string;
  content: string | null;
}

const api = {
  tasks: {
    list: (): Promise<Task[]> => ipcRenderer.invoke('tasks:list'),
    get: (id: string): Promise<Task | null> => ipcRenderer.invoke('tasks:get', id),
    create: (input: CreateTaskInput): Promise<Task> => ipcRenderer.invoke('tasks:create', input),
    update: (id: string, input: UpdateTaskInput): Promise<Task> => ipcRenderer.invoke('tasks:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tasks:delete', id),
    listTrashed: (): Promise<Task[]> => ipcRenderer.invoke('tasks:listTrashed'),
    restore: (id: string): Promise<Task> => ipcRenderer.invoke('tasks:restore', id),
    emptyTrash: (): Promise<void> => ipcRenderer.invoke('tasks:emptyTrash'),
    purgeExpiredTrash: (days: number): Promise<void> => ipcRenderer.invoke('tasks:purgeExpiredTrash', days),
  },

  projects: {
    list: (): Promise<Project[]> => ipcRenderer.invoke('projects:list'),
    get: (id: string): Promise<Project | null> => ipcRenderer.invoke('projects:get', id),
    create: (input: CreateProjectInput): Promise<Project> => ipcRenderer.invoke('projects:create', input),
    update: (id: string, input: UpdateProjectInput): Promise<Project> => ipcRenderer.invoke('projects:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('projects:delete', id),
  },

  contexts: {
    list: (): Promise<Context[]> => ipcRenderer.invoke('contexts:list'),
    get: (id: string): Promise<Context | null> => ipcRenderer.invoke('contexts:get', id),
    create: (input: CreateContextInput): Promise<Context> => ipcRenderer.invoke('contexts:create', input),
    update: (id: string, input: UpdateContextInput): Promise<Context> => ipcRenderer.invoke('contexts:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('contexts:delete', id),
  },

  notes: {
    list: (): Promise<Note[]> => ipcRenderer.invoke('notes:list'),
    get: (id: string): Promise<Note | null> => ipcRenderer.invoke('notes:get', id),
    create: (input: CreateNoteInput): Promise<Note> => ipcRenderer.invoke('notes:create', input),
    update: (id: string, input: UpdateNoteInput): Promise<Note> => ipcRenderer.invoke('notes:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('notes:delete', id),
  },

  meetings: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('meetings:list'),
    get: (id: string): Promise<unknown> => ipcRenderer.invoke('meetings:get', id),
    create: (input: unknown): Promise<unknown> => ipcRenderer.invoke('meetings:create', input),
    update: (id: string, input: unknown): Promise<unknown> => ipcRenderer.invoke('meetings:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('meetings:delete', id),
  },

  checklists: {
    list: (taskId: string): Promise<ChecklistItem[]> => ipcRenderer.invoke('checklists:list', taskId),
    create: (input: CreateChecklistItemInput): Promise<ChecklistItem> => ipcRenderer.invoke('checklists:create', input),
    update: (id: string, input: UpdateChecklistItemInput): Promise<ChecklistItem> => ipcRenderer.invoke('checklists:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('checklists:delete', id),
    reorder: (taskId: string, itemIds: string[]): Promise<void> => ipcRenderer.invoke('checklists:reorder', taskId, itemIds),
  },

  stakeholders: {
    list: (): Promise<Stakeholder[]> => ipcRenderer.invoke('stakeholders:list'),
    get: (id: string): Promise<Stakeholder | null> => ipcRenderer.invoke('stakeholders:get', id),
    create: (input: CreateStakeholderInput): Promise<Stakeholder> => ipcRenderer.invoke('stakeholders:create', input),
    update: (id: string, input: UpdateStakeholderInput): Promise<Stakeholder> => ipcRenderer.invoke('stakeholders:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('stakeholders:delete', id),
  },

  projectStakeholders: {
    list: (projectId: string): Promise<ProjectStakeholder[]> => ipcRenderer.invoke('projectStakeholders:list', projectId),
    listByStakeholder: (stakeholderId: string): Promise<ProjectStakeholder[]> => ipcRenderer.invoke('projectStakeholders:listByStakeholder', stakeholderId),
    link: (input: { project_id: string; stakeholder_id: string }): Promise<ProjectStakeholder> => ipcRenderer.invoke('projectStakeholders:link', input),
    unlink: (input: { project_id: string; stakeholder_id: string }): Promise<void> => ipcRenderer.invoke('projectStakeholders:unlink', input),
  },

  noteStakeholders: {
    list: (noteId: string): Promise<NoteStakeholder[]> => ipcRenderer.invoke('noteStakeholders:list', noteId),
    listByStakeholder: (stakeholderId: string): Promise<NoteStakeholder[]> => ipcRenderer.invoke('noteStakeholders:listByStakeholder', stakeholderId),
    link: (input: { note_id: string; stakeholder_id: string }): Promise<NoteStakeholder> => ipcRenderer.invoke('noteStakeholders:link', input),
    unlink: (input: { note_id: string; stakeholder_id: string }): Promise<void> => ipcRenderer.invoke('noteStakeholders:unlink', input),
  },

  agents: {
    list: (): Promise<AIAgent[]> => ipcRenderer.invoke('agents:list'),
    create: (input: CreateAIAgentInput): Promise<AIAgent> => ipcRenderer.invoke('agents:create', input),
    revoke: (id: string): Promise<void> => ipcRenderer.invoke('agents:revoke', id),
  },

  dailyNotes: {
    get: (date: string): Promise<DailyNote | null> => ipcRenderer.invoke('dailyNotes:get', date),
    upsert: (date: string, content: string): Promise<DailyNote> => ipcRenderer.invoke('dailyNotes:upsert', date, content),
  },

  onFocusTaskInput: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('focus-task-input', listener);
    return () => { ipcRenderer.removeListener('focus-task-input', listener); };
  },

  onStaleCheckComplete: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('tasks:stale-check-complete', listener);
    return () => { ipcRenderer.removeListener('tasks:stale-check-complete', listener); };
  },

  auth: {
    isConfigured: (): Promise<boolean> => ipcRenderer.invoke('auth:is-configured'),
    signIn: (credentials: { email: string; password: string }): Promise<unknown> =>
      ipcRenderer.invoke('auth:sign-in', credentials),
    signUp: (credentials: { email: string; password: string }): Promise<unknown> =>
      ipcRenderer.invoke('auth:sign-up', credentials),
    signOut: (): Promise<unknown> => ipcRenderer.invoke('auth:sign-out'),
    getSession: (): Promise<unknown> => ipcRenderer.invoke('auth:get-session'),
  },

  sync: {
    connect: (): Promise<unknown> => ipcRenderer.invoke('sync:connect'),
    disconnect: (): Promise<unknown> => ipcRenderer.invoke('sync:disconnect'),
    onTablesUpdated: (callback: (tables: string[]) => void) => {
      const handler = (_event: unknown, tables: string[]) => callback(tables);
      ipcRenderer.on('powersync:tables-updated', handler);
      return () => { ipcRenderer.removeListener('powersync:tables-updated', handler); };
    },
  },

  system: {
    exportData: (): Promise<unknown> => ipcRenderer.invoke('system:export'),
    importData: (filePath: string): Promise<void> => ipcRenderer.invoke('system:import', filePath),
    getSettings: (): Promise<unknown> => ipcRenderer.invoke('system:settings:get'),
    setSettings: (settings: unknown): Promise<void> => ipcRenderer.invoke('system:settings:set', settings),
  },
};

contextBridge.exposeInMainWorld('cortex', api);

export type CortexAPI = typeof api;
