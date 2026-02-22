import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseConnector } from './connector';

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

import { createClient } from '@supabase/supabase-js';

// Shared mock for supabase client
const mockGetSession = vi.fn();
const mockFrom = vi.fn();

const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
  },
  from: mockFrom,
};

// Helper to create a mock PowerSync database
function createMockDatabase(crudEntries: object[] | null = null) {
  const mockBatch = crudEntries
    ? {
        crud: crudEntries,
        complete: vi.fn().mockResolvedValue(undefined),
      }
    : null;

  return {
    getCrudBatch: vi.fn().mockResolvedValue(mockBatch),
  };
}

const TEST_CONFIG = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-anon-key',
  powersyncUrl: 'https://test.powersync.co',
};

describe('SupabaseConnector', () => {
  let connector: SupabaseConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SupabaseConnector(TEST_CONFIG);
  });

  describe('constructor', () => {
    it('creates Supabase client with provided config', () => {
      expect(createClient).toHaveBeenCalledWith(
        TEST_CONFIG.supabaseUrl,
        TEST_CONFIG.supabaseAnonKey
      );
    });

    it('exposes supabase client via .client getter', () => {
      expect(connector.client).toBe(mockSupabaseClient);
    });
  });

  describe('fetchCredentials', () => {
    it('returns null when no session exists', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const credentials = await connector.fetchCredentials();

      expect(credentials).toBeNull();
    });

    it('returns credentials with correct endpoint and token when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-access-token',
            expires_at: undefined,
          },
        },
      });

      const credentials = await connector.fetchCredentials();

      expect(credentials).not.toBeNull();
      expect(credentials?.endpoint).toBe(TEST_CONFIG.powersyncUrl);
      expect(credentials?.token).toBe('test-access-token');
    });

    it('handles session with expires_at correctly', async () => {
      const expiresAt = 1700000000; // unix timestamp
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            expires_at: expiresAt,
          },
        },
      });

      const credentials = await connector.fetchCredentials();

      expect(credentials?.expiresAt).toEqual(new Date(expiresAt * 1000));
    });

    it('returns credentials without expiresAt when expires_at is undefined', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            expires_at: undefined,
          },
        },
      });

      const credentials = await connector.fetchCredentials();

      expect(credentials?.expiresAt).toBeUndefined();
    });
  });

  describe('uploadData', () => {
    it('handles empty batch (no pending changes)', async () => {
      const db = createMockDatabase(null);

      await connector.uploadData(db as never);

      expect(db.getCrudBatch).toHaveBeenCalledWith(100);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('processes PUT operations (upsert to Supabase)', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: mockUpsert });

      const entry = {
        table: 'tasks',
        op: 'PUT',
        id: 'task-id-123',
        opData: { title: 'Test task', status: 'inbox' },
      };
      const db = createMockDatabase([entry]);

      await connector.uploadData(db as never);

      expect(mockFrom).toHaveBeenCalledWith('tasks');
      expect(mockUpsert).toHaveBeenCalledWith({
        id: 'task-id-123',
        title: 'Test task',
        status: 'inbox',
      });
    });

    it('processes PATCH operations (update in Supabase)', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const entry = {
        table: 'tasks',
        op: 'PATCH',
        id: 'task-id-456',
        opData: { title: 'Updated task' },
      };
      const db = createMockDatabase([entry]);

      await connector.uploadData(db as never);

      expect(mockFrom).toHaveBeenCalledWith('tasks');
      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated task' });
      expect(mockEq).toHaveBeenCalledWith('id', 'task-id-456');
    });

    it('processes DELETE operations as soft delete (sets deleted_at)', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const entry = {
        table: 'tasks',
        op: 'DELETE',
        id: 'task-id-789',
        opData: {},
      };
      const db = createMockDatabase([entry]);

      await connector.uploadData(db as never);

      expect(mockFrom).toHaveBeenCalledWith('tasks');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'task-id-789');
    });

    it('completes the batch after processing', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: mockUpsert });

      const entry = {
        table: 'tasks',
        op: 'PUT',
        id: 'task-id',
        opData: { title: 'Task' },
      };
      const mockBatch = {
        crud: [entry],
        complete: vi.fn().mockResolvedValue(undefined),
      };
      const db = { getCrudBatch: vi.fn().mockResolvedValue(mockBatch) };

      await connector.uploadData(db as never);

      expect(mockBatch.complete).toHaveBeenCalledOnce();
    });

    it('handles multiple entries in a batch', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValueOnce({ upsert: mockUpsert })
               .mockReturnValueOnce({ update: mockUpdate });

      const entries = [
        { table: 'tasks', op: 'PUT', id: 'id-1', opData: { title: 'Task 1' } },
        { table: 'tasks', op: 'PATCH', id: 'id-2', opData: { title: 'Updated' } },
      ];
      const db = createMockDatabase(entries);

      await connector.uploadData(db as never);

      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockUpsert).toHaveBeenCalledOnce();
      expect(mockUpdate).toHaveBeenCalledOnce();
    });

    it('throws when Supabase returns an error for PUT', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: new Error('Supabase error') });
      mockFrom.mockReturnValue({ upsert: mockUpsert });

      const entry = {
        table: 'tasks',
        op: 'PUT',
        id: 'task-id',
        opData: { title: 'Task' },
      };
      const db = createMockDatabase([entry]);

      await expect(connector.uploadData(db as never)).rejects.toThrow();
    });

    it('throws when Supabase returns an error for PATCH', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: new Error('Supabase error') });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const entry = {
        table: 'tasks',
        op: 'PATCH',
        id: 'task-id',
        opData: { title: 'Updated' },
      };
      const db = createMockDatabase([entry]);

      await expect(connector.uploadData(db as never)).rejects.toThrow();
    });

    it('throws when Supabase returns an error for DELETE', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: new Error('Supabase error') });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const entry = {
        table: 'tasks',
        op: 'DELETE',
        id: 'task-id',
        opData: {},
      };
      const db = createMockDatabase([entry]);

      await expect(connector.uploadData(db as never)).rejects.toThrow();
    });
  });
});
