import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createProjectSlice, ProjectSlice } from './projects';

type SetFn = (partial: Partial<ProjectSlice> | ((s: ProjectSlice) => Partial<ProjectSlice>)) => void;
type GetFn = () => ProjectSlice;

function createStore(overrides?: Partial<ProjectSlice>): ProjectSlice {
  const state = {} as ProjectSlice;

  const set: SetFn = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, update);
  };

  const get: GetFn = () => state;

  const creator = createProjectSlice as unknown as (
    set: SetFn,
    get: GetFn,
    api: Record<string, never>,
  ) => ProjectSlice;
  Object.assign(state, creator(set, get, {}), overrides);

  return state;
}

const mockCortex = {
  projects: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

{
  const g = globalThis as unknown as Record<string, Record<string, unknown>>;
  g.window = { ...(g.window || {}), cortex: { ...(g.window?.cortex as Record<string, unknown> || {}), ...mockCortex } };
}

const fakeProject = (overrides = {}) => ({
  id: 'proj-1',
  title: 'Test project',
  description: null,
  status: 'active' as const,
  context_id: null,
  sort_order: 0,
  created_at: '2026-02-17T00:00:00.000Z',
  updated_at: '2026-02-17T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  owner_type: 'user' as const,
  owner_stakeholder_id: null,
  ...overrides,
});

describe('ProjectSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty projects array', () => {
      const store = createStore();
      expect(store.projects).toEqual([]);
    });

    it('starts with loading false', () => {
      const store = createStore();
      expect(store.projectsLoading).toBe(false);
    });

    it('starts with error null', () => {
      const store = createStore();
      expect(store.projectsError).toBeNull();
    });
  });

  describe('fetchProjects', () => {
    it('calls IPC list', async () => {
      mockCortex.projects.list.mockResolvedValue([fakeProject()]);

      const store = createStore();
      await store.fetchProjects();

      expect(mockCortex.projects.list).toHaveBeenCalledOnce();
    });

    it('sets error on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.projects.list.mockRejectedValue(new Error('fail'));

      const store = createStore();
      await store.fetchProjects();

      expect(mockCortex.projects.list).toHaveBeenCalledOnce();
      spy.mockRestore();
    });
  });

  describe('createProject', () => {
    it('calls IPC create and returns the project', async () => {
      const newProject = fakeProject({ id: 'new-1', title: 'New' });
      mockCortex.projects.create.mockResolvedValue(newProject);

      const store = createStore();
      const result = await store.createProject({ title: 'New' });

      expect(mockCortex.projects.create).toHaveBeenCalledWith({ title: 'New' });
      expect(result).toEqual(newProject);
    });

    it('sets projectsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.projects.create.mockRejectedValue(new Error('create failed'));

      const store = createStore();
      await store.createProject({ title: 'New' });

      expect(store.projectsError).toBe('create failed');
      spy.mockRestore();
    });
  });

  describe('updateProject', () => {
    it('calls IPC update and returns updated project', async () => {
      const updated = fakeProject({ title: 'Updated' });
      mockCortex.projects.update.mockResolvedValue(updated);

      const store = createStore({ projects: [fakeProject()] });
      const result = await store.updateProject('proj-1', { title: 'Updated' });

      expect(mockCortex.projects.update).toHaveBeenCalledWith('proj-1', { title: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('sets projectsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.projects.update.mockRejectedValue(new Error('update failed'));

      const store = createStore({ projects: [fakeProject()] });
      await store.updateProject('proj-1', { title: 'Updated' });

      expect(store.projectsError).toBe('update failed');
      spy.mockRestore();
    });
  });

  describe('deleteProject', () => {
    it('calls IPC delete', async () => {
      mockCortex.projects.delete.mockResolvedValue(undefined);

      const store = createStore({ projects: [fakeProject()] });
      await store.deleteProject('proj-1');

      expect(mockCortex.projects.delete).toHaveBeenCalledWith('proj-1');
    });

    it('sets projectsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.projects.delete.mockRejectedValue(new Error('delete failed'));

      const store = createStore({ projects: [fakeProject()] });
      await store.deleteProject('proj-1');

      expect(store.projectsError).toBe('delete failed');
      spy.mockRestore();
    });
  });

  describe('derived getters', () => {
    const projects = [
      fakeProject({ id: '1', status: 'active', context_id: 'ctx-1' }),
      fakeProject({ id: '2', status: 'completed', context_id: 'ctx-2' }),
      fakeProject({ id: '3', status: 'active', context_id: 'ctx-1' }),
      fakeProject({ id: '4', status: 'archived', context_id: null }),
    ];

    it('getProjectsByStatus filters by status', () => {
      const store = createStore({ projects });
      const active = store.getProjectsByStatus('active');
      expect(active).toHaveLength(2);
      expect(active.map((p) => p.id)).toEqual(['1', '3']);
    });

    it('getProjectsByContext filters by context_id', () => {
      const store = createStore({ projects });
      const ctx1 = store.getProjectsByContext('ctx-1');
      expect(ctx1).toHaveLength(2);
      expect(ctx1.map((p) => p.id)).toEqual(['1', '3']);
    });
  });
});
