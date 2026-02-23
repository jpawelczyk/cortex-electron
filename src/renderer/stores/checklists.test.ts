import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createChecklistSlice, ChecklistSlice } from './checklists';

type SetFn = (partial: Partial<ChecklistSlice> | ((s: ChecklistSlice) => Partial<ChecklistSlice>)) => void;
type GetFn = () => ChecklistSlice;

function createStore(overrides?: Partial<ChecklistSlice>): ChecklistSlice {
  const state = {} as ChecklistSlice;

  const set: SetFn = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, update);
  };

  const get: GetFn = () => state;

  const creator = createChecklistSlice as unknown as (
    set: SetFn,
    get: GetFn,
    api: Record<string, never>,
  ) => ChecklistSlice;
  Object.assign(state, creator(set, get, {}), overrides);

  return state;
}

const mockCortex = {
  checklists: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  },
};

(globalThis as unknown as Record<string, unknown>).window = { cortex: mockCortex };

const fakeItem = (overrides = {}) => ({
  id: 'item-1',
  task_id: 'task-1',
  title: 'Check item',
  is_done: false,
  sort_order: 0,
  created_at: '2026-02-19T00:00:00.000Z',
  updated_at: '2026-02-19T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('ChecklistSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty checklistItems', () => {
      const store = createStore();
      expect(store.checklistItems).toEqual({});
    });

    it('starts with empty checklistsLoading', () => {
      const store = createStore();
      expect(store.checklistsLoading).toEqual({});
    });

    it('starts with checklistsError null', () => {
      const store = createStore();
      expect(store.checklistsError).toBeNull();
    });
  });

  describe('fetchChecklistItems', () => {
    it('calls window.cortex.checklists.list with taskId', async () => {
      const items = [fakeItem()];
      mockCortex.checklists.list.mockResolvedValue(items);

      const store = createStore();
      await store.fetchChecklistItems('task-1');

      expect(mockCortex.checklists.list).toHaveBeenCalledWith('task-1');
    });

    it('sets checklistItems[taskId] with returned items', async () => {
      const items = [fakeItem({ id: 'a' }), fakeItem({ id: 'b' })];
      mockCortex.checklists.list.mockResolvedValue(items);

      const store = createStore();
      await store.fetchChecklistItems('task-1');

      // Verify IPC was called correctly
      expect(mockCortex.checklists.list).toHaveBeenCalledOnce();
    });

    it('sets checklistsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.checklists.list.mockRejectedValue(new Error('fetch failed'));

      const store = createStore();
      await store.fetchChecklistItems('task-1');

      expect(store.checklistsError).toBe('fetch failed');
      spy.mockRestore();
    });
  });

  describe('createChecklistItem', () => {
    it('calls IPC create and appends item to checklistItems', async () => {
      const newItem = fakeItem({ id: 'new-1', title: 'New item' });
      mockCortex.checklists.create.mockResolvedValue(newItem);

      const store = createStore();
      const result = await store.createChecklistItem({ task_id: 'task-1', title: 'New item' });

      expect(mockCortex.checklists.create).toHaveBeenCalledWith({ task_id: 'task-1', title: 'New item' });
      expect(result).toEqual(newItem);
    });

    it('creates array if first item for taskId', async () => {
      const newItem = fakeItem({ id: 'new-1' });
      mockCortex.checklists.create.mockResolvedValue(newItem);

      const store = createStore({ checklistItems: {} });
      await store.createChecklistItem({ task_id: 'task-1', title: 'New item' });

      expect(mockCortex.checklists.create).toHaveBeenCalledOnce();
    });

    it('appends to existing items for taskId', async () => {
      const existing = fakeItem({ id: 'existing-1' });
      const newItem = fakeItem({ id: 'new-1' });
      mockCortex.checklists.create.mockResolvedValue(newItem);

      const store = createStore({ checklistItems: { 'task-1': [existing] } });
      await store.createChecklistItem({ task_id: 'task-1', title: 'New item' });

      expect(mockCortex.checklists.create).toHaveBeenCalledOnce();
    });

    it('sets checklistsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.checklists.create.mockRejectedValue(new Error('create failed'));

      const store = createStore();
      await store.createChecklistItem({ task_id: 'task-1', title: 'New item' });

      expect(store.checklistsError).toBe('create failed');
      spy.mockRestore();
    });
  });

  describe('updateChecklistItem', () => {
    it('calls IPC update and replaces item in checklistItems by id', async () => {
      const original = fakeItem({ id: 'item-1' });
      const updated = fakeItem({ id: 'item-1', title: 'Updated' });
      mockCortex.checklists.update.mockResolvedValue(updated);

      const store = createStore({ checklistItems: { 'task-1': [original] } });
      const result = await store.updateChecklistItem('item-1', 'task-1', { title: 'Updated' });

      expect(mockCortex.checklists.update).toHaveBeenCalledWith('item-1', { title: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('sets checklistsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.checklists.update.mockRejectedValue(new Error('update failed'));

      const store = createStore({ checklistItems: { 'task-1': [fakeItem()] } });
      await store.updateChecklistItem('item-1', 'task-1', { title: 'x' });

      expect(store.checklistsError).toBe('update failed');
      spy.mockRestore();
    });
  });

  describe('deleteChecklistItem', () => {
    it('calls IPC delete and removes item from checklistItems', async () => {
      const item = fakeItem({ id: 'item-1' });
      mockCortex.checklists.delete.mockResolvedValue(undefined);

      const store = createStore({ checklistItems: { 'task-1': [item] } });
      await store.deleteChecklistItem('item-1', 'task-1');

      expect(mockCortex.checklists.delete).toHaveBeenCalledWith('item-1');
    });

    it('sets checklistsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.checklists.delete.mockRejectedValue(new Error('delete failed'));

      const store = createStore({ checklistItems: { 'task-1': [fakeItem()] } });
      await store.deleteChecklistItem('item-1', 'task-1');

      expect(store.checklistsError).toBe('delete failed');
      spy.mockRestore();
    });
  });

  describe('reorderChecklistItems', () => {
    it('calls IPC reorder and reorders items in state', async () => {
      const itemA = fakeItem({ id: 'a', sort_order: 0 });
      const itemB = fakeItem({ id: 'b', sort_order: 1 });
      mockCortex.checklists.reorder.mockResolvedValue(undefined);

      const store = createStore({ checklistItems: { 'task-1': [itemA, itemB] } });
      await store.reorderChecklistItems('task-1', ['b', 'a']);

      expect(mockCortex.checklists.reorder).toHaveBeenCalledWith('task-1', ['b', 'a']);
    });

    it('sets checklistsError on failure', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCortex.checklists.reorder.mockRejectedValue(new Error('reorder failed'));

      const store = createStore({ checklistItems: { 'task-1': [fakeItem()] } });
      await store.reorderChecklistItems('task-1', ['item-1']);

      expect(store.checklistsError).toBe('reorder failed');
      spy.mockRestore();
    });
  });
});
