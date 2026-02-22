import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileAuthStorage } from './auth-storage';

describe('FileAuthStorage', () => {
  let tmpDir: string;
  let storage: FileAuthStorage;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-auth-test-'));
    storage = new FileAuthStorage(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null for a key that does not exist', () => {
    expect(storage.getItem('nonexistent')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    storage.setItem('supabase.auth.token', '{"access_token":"abc"}');
    expect(storage.getItem('supabase.auth.token')).toBe('{"access_token":"abc"}');
  });

  it('overwrites an existing value', () => {
    storage.setItem('key', 'value1');
    storage.setItem('key', 'value2');
    expect(storage.getItem('key')).toBe('value2');
  });

  it('removes a value', () => {
    storage.setItem('key', 'value');
    storage.removeItem('key');
    expect(storage.getItem('key')).toBeNull();
  });

  it('removing a nonexistent key does not throw', () => {
    expect(() => storage.removeItem('nonexistent')).not.toThrow();
  });

  it('persists data to disk across instances', () => {
    storage.setItem('token', 'persisted-value');

    const storage2 = new FileAuthStorage(tmpDir);
    expect(storage2.getItem('token')).toBe('persisted-value');
  });

  it('handles multiple keys', () => {
    storage.setItem('key1', 'val1');
    storage.setItem('key2', 'val2');
    expect(storage.getItem('key1')).toBe('val1');
    expect(storage.getItem('key2')).toBe('val2');
  });

  it('handles corrupted file gracefully', () => {
    const filePath = path.join(tmpDir, 'auth-storage.json');
    fs.writeFileSync(filePath, 'not json!!!');

    const corruptedStorage = new FileAuthStorage(tmpDir);
    expect(corruptedStorage.getItem('key')).toBeNull();

    // Should still be able to write after corruption
    corruptedStorage.setItem('key', 'recovered');
    expect(corruptedStorage.getItem('key')).toBe('recovered');
  });
});
