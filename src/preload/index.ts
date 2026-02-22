import { contextBridge, ipcRenderer } from 'electron';

const api = {
  tasks: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('tasks:list'),
    get: (id: string): Promise<unknown> => ipcRenderer.invoke('tasks:get', id),
    create: (input: unknown): Promise<unknown> => ipcRenderer.invoke('tasks:create', input),
    update: (id: string, input: unknown): Promise<unknown> => ipcRenderer.invoke('tasks:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tasks:delete', id),
    listTrashed: (): Promise<unknown[]> => ipcRenderer.invoke('tasks:listTrashed'),
    restore: (id: string): Promise<unknown> => ipcRenderer.invoke('tasks:restore', id),
    emptyTrash: (): Promise<void> => ipcRenderer.invoke('tasks:emptyTrash'),
    purgeExpiredTrash: (days: number): Promise<void> => ipcRenderer.invoke('tasks:purgeExpiredTrash', days),
  },

  projects: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('projects:list'),
    get: (id: string): Promise<unknown> => ipcRenderer.invoke('projects:get', id),
    create: (input: unknown): Promise<unknown> => ipcRenderer.invoke('projects:create', input),
    update: (id: string, input: unknown): Promise<unknown> => ipcRenderer.invoke('projects:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('projects:delete', id),
  },

  contexts: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('contexts:list'),
    get: (id: string): Promise<unknown> => ipcRenderer.invoke('contexts:get', id),
    create: (input: unknown): Promise<unknown> => ipcRenderer.invoke('contexts:create', input),
    update: (id: string, input: unknown): Promise<unknown> => ipcRenderer.invoke('contexts:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('contexts:delete', id),
  },

  notes: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('notes:list'),
    get: (id: string): Promise<unknown> => ipcRenderer.invoke('notes:get', id),
    create: (input: unknown): Promise<unknown> => ipcRenderer.invoke('notes:create', input),
    update: (id: string, input: unknown): Promise<unknown> => ipcRenderer.invoke('notes:update', id, input),
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
    list: (taskId: string): Promise<unknown[]> => ipcRenderer.invoke('checklists:list', taskId),
    create: (input: unknown): Promise<unknown> => ipcRenderer.invoke('checklists:create', input),
    update: (id: string, input: unknown): Promise<unknown> => ipcRenderer.invoke('checklists:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('checklists:delete', id),
    reorder: (taskId: string, itemIds: string[]): Promise<void> => ipcRenderer.invoke('checklists:reorder', taskId, itemIds),
  },

  stakeholders: {
    list: (): Promise<unknown[]> => ipcRenderer.invoke('stakeholders:list'),
    get: (id: string): Promise<unknown> => ipcRenderer.invoke('stakeholders:get', id),
    create: (input: unknown): Promise<unknown> => ipcRenderer.invoke('stakeholders:create', input),
    update: (id: string, input: unknown): Promise<unknown> => ipcRenderer.invoke('stakeholders:update', id, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('stakeholders:delete', id),
  },

  dailyNotes: {
    get: (date: string): Promise<unknown> => ipcRenderer.invoke('dailyNotes:get', date),
    upsert: (date: string, content: string): Promise<unknown> => ipcRenderer.invoke('dailyNotes:upsert', date, content),
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
