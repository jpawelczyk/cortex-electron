import * as fs from 'fs';
import * as path from 'path';

/**
 * File-based storage adapter for Supabase Auth in Electron's main process.
 * Persists auth tokens to disk so sessions survive app restarts.
 */
export class FileAuthStorage {
  private filePath: string;
  private data: Record<string, string>;

  constructor(dir: string) {
    this.filePath = path.join(dir, 'auth-storage.json');
    this.data = this.load();
  }

  getItem(key: string): string | null {
    return this.data[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.data[key] = value;
    this.save();
  }

  removeItem(key: string): void {
    delete this.data[key];
    this.save();
  }

  private load(): Record<string, string> {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data), 'utf-8');
  }
}
