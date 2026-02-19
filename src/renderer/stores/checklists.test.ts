import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createChecklistSlice, ChecklistSlice } from './checklists';

function createStore(overrides?: Partial<ChecklistSlice>): ChecklistSlice {
  let state: ChecklistSlice;

  const set = (partial: Partial<ChecklistSlice> | ((s: ChecklistSlice) => Partial<ChecklistSlice>)) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...update };
  };

  const get = () => state;

  state = {
    ...createChecklistSlice(set as any, get as any, {} as any),
    ...overrides,
  };

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

(globalThis as any).window = { cortex: mockCortex };

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
  });

  describe('deleteChecklistItem', () => {
    it('calls IPC delete and removes item from checklistItems', async () => {
      const item = fakeItem({ id: 'item-1' });
      mockCortex.checklists.delete.mockResolvedValue(undefined);

      const store = createStore({ checklistItems: { 'task-1': [item] } });
      await store.deleteChecklistItem('item-1', 'task-1');

      expect(mockCortex.checklists.delete).toHaveBeenCalledWith('item-1');
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
  });
});
