import type {
  Task, CreateTaskInput, UpdateTaskInput,
  Project, CreateProjectInput, UpdateProjectInput,
  Context, CreateContextInput, UpdateContextInput,
  ChecklistItem, CreateChecklistItemInput, UpdateChecklistItemInput,
  AIAgent, CreateAIAgentInput,
} from './types';

declare global {
  interface Window {
    cortex: {
      tasks: {
        list(): Promise<Task[]>;
        get(id: string): Promise<Task | null>;
        create(input: CreateTaskInput): Promise<Task>;
        update(id: string, input: UpdateTaskInput): Promise<Task>;
        delete(id: string): Promise<void>;
        listTrashed(): Promise<Task[]>;
        restore(id: string): Promise<Task>;
        emptyTrash(): Promise<void>;
        purgeExpiredTrash(days: number): Promise<void>;
      };
      projects: {
        list(): Promise<Project[]>;
        get(id: string): Promise<Project | null>;
        create(input: CreateProjectInput): Promise<Project>;
        update(id: string, input: UpdateProjectInput): Promise<Project>;
        delete(id: string): Promise<void>;
      };
      contexts: {
        list(): Promise<Context[]>;
        get(id: string): Promise<Context | null>;
        create(input: CreateContextInput): Promise<Context>;
        update(id: string, input: UpdateContextInput): Promise<Context>;
        delete(id: string): Promise<void>;
      };
      notes: {
        list(): Promise<unknown[]>;
        get(id: string): Promise<unknown>;
        create(input: unknown): Promise<unknown>;
        update(id: string, input: unknown): Promise<unknown>;
        delete(id: string): Promise<void>;
      };
      meetings: {
        list(): Promise<unknown[]>;
        get(id: string): Promise<unknown>;
        create(input: unknown): Promise<unknown>;
        update(id: string, input: unknown): Promise<unknown>;
        delete(id: string): Promise<void>;
      };
      checklists: {
        list(taskId: string): Promise<ChecklistItem[]>;
        create(input: CreateChecklistItemInput): Promise<ChecklistItem>;
        update(id: string, input: UpdateChecklistItemInput): Promise<ChecklistItem>;
        delete(id: string): Promise<void>;
        reorder(taskId: string, itemIds: string[]): Promise<void>;
      };
      agents: {
        list(): Promise<AIAgent[]>;
        create(input: CreateAIAgentInput): Promise<{ agent: AIAgent; key: string }>;
        revoke(id: string): Promise<void>;
      };
      stakeholders: {
        list(): Promise<unknown[]>;
        get(id: string): Promise<unknown>;
        create(input: unknown): Promise<unknown>;
        update(id: string, input: unknown): Promise<unknown>;
        delete(id: string): Promise<void>;
      };
      projectStakeholders: {
        list: (projectId: string) => Promise<{ project_id: string; stakeholder_id: string; created_at: string }[]>;
        listByStakeholder: (stakeholderId: string) => Promise<{ project_id: string; stakeholder_id: string; created_at: string }[]>;
        link: (input: { project_id: string; stakeholder_id: string }) => Promise<{ project_id: string; stakeholder_id: string; created_at: string }>;
        unlink: (input: { project_id: string; stakeholder_id: string }) => Promise<void>;
      };
      noteStakeholders: {
        list: (noteId: string) => Promise<{ note_id: string; stakeholder_id: string }[]>;
        listByStakeholder: (stakeholderId: string) => Promise<{ note_id: string; stakeholder_id: string }[]>;
        link: (input: { note_id: string; stakeholder_id: string }) => Promise<{ note_id: string; stakeholder_id: string }>;
        unlink: (input: { note_id: string; stakeholder_id: string }) => Promise<void>;
      };
      dailyNotes: {
        get(date: string): Promise<unknown>;
        upsert(date: string, content: string): Promise<unknown>;
      };
      onFocusTaskInput(callback: () => void): () => void;
      onStaleCheckComplete(callback: () => void): () => void;
      auth: {
        isConfigured(): Promise<boolean>;
        signIn(credentials: { email: string; password: string }): Promise<unknown>;
        signUp(credentials: { email: string; password: string }): Promise<unknown>;
        signOut(): Promise<unknown>;
        getSession(): Promise<unknown>;
      };
      sync: {
        connect(): Promise<unknown>;
        disconnect(): Promise<unknown>;
        onTablesUpdated(callback: (tables: string[]) => void): () => void;
      };
      system: {
        exportData(): Promise<unknown>;
        importData(filePath: string): Promise<void>;
        getSettings(): Promise<unknown>;
        setSettings(settings: unknown): Promise<void>;
      };
    };
  }
}
