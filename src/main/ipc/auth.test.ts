import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

// Mock the connector module
vi.mock('../sync/connector', () => ({
  SupabaseConnector: vi.fn(),
}));

// Mock the db module
vi.mock('../db/index', () => ({
  getPowerSyncDatabase: vi.fn(),
}));

// Mock the config module
vi.mock('../../shared/config', () => ({
  getSyncConfig: vi.fn(),
}));

import { ipcMain } from 'electron';
import { getPowerSyncDatabase } from '../db/index';
import { registerAuthHandlers } from './auth';

function getHandler(channel: string) {
  const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel);
  if (!call) throw new Error(`No handler registered for ${channel}`);
  return call[1];
}

// Create a mock connector (mirrors SupabaseConnector shape)
function createMockConnector() {
  return {
    client: {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
      },
    },
    fetchCredentials: vi.fn(),
    uploadData: vi.fn(),
  };
}

describe('auth IPC handlers', () => {
  let mockConnector: ReturnType<typeof createMockConnector>;
  let mockPsDb: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockClear();
    mockConnector = createMockConnector();
    mockPsDb = { connect: vi.fn(), disconnect: vi.fn() };
    vi.mocked(getPowerSyncDatabase).mockReturnValue(mockPsDb as never);

    registerAuthHandlers(mockConnector as never);
  });

  it('registers all auth and sync channels', () => {
    const channels = vi.mocked(ipcMain.handle).mock.calls.map(([ch]) => ch);
    expect(channels).toContain('auth:sign-in');
    expect(channels).toContain('auth:sign-up');
    expect(channels).toContain('auth:sign-out');
    expect(channels).toContain('auth:get-session');
    expect(channels).toContain('sync:connect');
    expect(channels).toContain('sync:disconnect');
  });

  describe('auth:sign-in', () => {
    it('returns session data on valid credentials', async () => {
      const mockSession = { user: { id: '123', email: 'test@example.com' }, session: { access_token: 'tok' } };
      mockConnector.client.auth.signInWithPassword.mockResolvedValue({ data: mockSession, error: null });

      const handler = getHandler('auth:sign-in');
      const result = await handler({} as Electron.IpcMainInvokeEvent, {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({ success: true, data: mockSession });
      expect(mockConnector.client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('returns error on invalid credentials', async () => {
      mockConnector.client.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const handler = getHandler('auth:sign-in');
      const result = await handler({} as Electron.IpcMainInvokeEvent, {
        email: 'test@example.com',
        password: 'wrong',
      });

      expect(result).toEqual({ success: false, error: 'Invalid login credentials' });
    });

    it('rejects invalid email format', async () => {
      const handler = getHandler('auth:sign-in');
      const result = await handler({} as Electron.IpcMainInvokeEvent, {
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects empty password', async () => {
      const handler = getHandler('auth:sign-in');
      const result = await handler({} as Electron.IpcMainInvokeEvent, {
        email: 'test@example.com',
        password: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('auth:sign-up', () => {
    it('returns data on successful sign-up', async () => {
      const mockData = { user: { id: '456', email: 'new@example.com' }, session: null };
      mockConnector.client.auth.signUp.mockResolvedValue({ data: mockData, error: null });

      const handler = getHandler('auth:sign-up');
      const result = await handler({} as Electron.IpcMainInvokeEvent, {
        email: 'new@example.com',
        password: 'securepass',
      });

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockConnector.client.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'securepass',
        options: { data: {} },
      });
    });

    it('returns error when sign-up fails', async () => {
      mockConnector.client.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const handler = getHandler('auth:sign-up');
      const result = await handler({} as Electron.IpcMainInvokeEvent, {
        email: 'existing@example.com',
        password: 'securepass',
      });

      expect(result).toEqual({ success: false, error: 'User already registered' });
    });

    it('rejects password shorter than 6 characters', async () => {
      const handler = getHandler('auth:sign-up');
      const result = await handler({} as Electron.IpcMainInvokeEvent, {
        email: 'test@example.com',
        password: '12345',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('auth:sign-out', () => {
    it('returns success on sign-out', async () => {
      mockConnector.client.auth.signOut.mockResolvedValue({ error: null });

      const handler = getHandler('auth:sign-out');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: true });
    });

    it('returns error when sign-out fails', async () => {
      mockConnector.client.auth.signOut.mockResolvedValue({
        error: { message: 'Network error' },
      });

      const handler = getHandler('auth:sign-out');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });

  describe('auth:get-session', () => {
    it('returns session when authenticated', async () => {
      const mockData = { session: { access_token: 'tok', user: { id: '123' } } };
      mockConnector.client.auth.getSession.mockResolvedValue({ data: mockData, error: null });

      const handler = getHandler('auth:get-session');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: true, data: mockData });
    });

    it('returns success with null session when not authenticated', async () => {
      mockConnector.client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      const handler = getHandler('auth:get-session');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: true, data: { session: null } });
    });

    it('returns error when getSession fails', async () => {
      mockConnector.client.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const handler = getHandler('auth:get-session');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: false, error: 'Session expired' });
    });
  });

  describe('sync:connect', () => {
    it('connects PowerSync database with connector', async () => {
      mockPsDb.connect.mockResolvedValue(undefined);

      const handler = getHandler('sync:connect');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: true });
      expect(mockPsDb.connect).toHaveBeenCalled();
    });

    it('returns error when connection fails', async () => {
      mockPsDb.connect.mockRejectedValue(new Error('Connection failed'));

      const handler = getHandler('sync:connect');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: false, error: 'Connection failed' });
    });
  });

  describe('sync:disconnect', () => {
    it('disconnects PowerSync database', async () => {
      mockPsDb.disconnect.mockResolvedValue(undefined);

      const handler = getHandler('sync:disconnect');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: true });
      expect(mockPsDb.disconnect).toHaveBeenCalled();
    });

    it('returns error when disconnect fails', async () => {
      mockPsDb.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      const handler = getHandler('sync:disconnect');
      const result = await handler({} as Electron.IpcMainInvokeEvent);

      expect(result).toEqual({ success: false, error: 'Disconnect failed' });
    });
  });
});
