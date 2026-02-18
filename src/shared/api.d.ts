import type {
  Task, CreateTaskInput, UpdateTaskInput,
  Project, CreateProjectInput, UpdateProjectInput,
  Context, CreateContextInput, UpdateContextInput,
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
      stakeholders: {
        list(): Promise<unknown[]>;
        get(id: string): Promise<unknown>;
        create(input: unknown): Promise<unknown>;
        update(id: string, input: unknown): Promise<unknown>;
        delete(id: string): Promise<void>;
      };
      dailyNotes: {
        get(date: string): Promise<unknown>;
        upsert(date: string, content: string): Promise<unknown>;
      };
      onFocusTaskInput(callback: () => void): () => void;
      system: {
        exportData(): Promise<unknown>;
        importData(filePath: string): Promise<void>;
        getSettings(): Promise<unknown>;
        setSettings(settings: unknown): Promise<void>;
      };
    };
  }
}
