import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { FtsIndex, fts5Escape } from './fts-index';

describe('FtsIndex', () => {
  let db: Database.Database;
  let fts: FtsIndex;

  beforeEach(() => {
    db = new Database(':memory:');
    fts = new FtsIndex(db);
    fts.initialize();
  });

  afterEach(() => {
    db.close();
  });

  describe('initialize', () => {
    it('creates FTS5 virtual table without error', () => {
      // Already called in beforeEach; verify table exists by querying it
      expect(() => db.prepare('SELECT * FROM search_fts LIMIT 0').all()).not.toThrow();
    });

    it('is idempotent (CREATE VIRTUAL TABLE IF NOT EXISTS)', () => {
      expect(() => fts.initialize()).not.toThrow();
    });
  });

  describe('upsertEntity', () => {
    it('adds searchable content without error', () => {
      expect(() =>
        fts.upsertEntity('id-1', 'task', 'My Task', 'Some task content here')
      ).not.toThrow();
    });

    it('updates existing entity (re-index after content change)', () => {
      fts.upsertEntity('id-1', 'task', 'Old Title', 'Old content');
      fts.upsertEntity('id-1', 'task', 'New Title', 'New content');

      // Only one entry should exist
      const results = fts.search('New Title');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('New Title');

      // Old content should not be found
      const oldResults = fts.search('Old Title');
      expect(oldResults).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      fts.upsertEntity('task-1', 'task', 'Buy groceries', 'Pick up milk and eggs from the store');
      fts.upsertEntity('task-2', 'task', 'Write report', 'Complete the quarterly financial report');
      fts.upsertEntity('note-1', 'note', 'Meeting notes', 'Discussed project timelines and deliverables');
      fts.upsertEntity('note-2', 'note', 'Running log', 'Went running in the park this morning');
    });

    it('finds exact keyword matches', () => {
      const results = fts.search('groceries');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entityId).toBe('task-1');
    });

    it('finds partial word matches via porter stemmer (running matches run)', () => {
      const results = fts.search('run');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entityId).toBe('note-2');
    });

    it('returns results with entityId, entityType, title, preview, score', () => {
      const results = fts.search('report');
      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect(result).toHaveProperty('entityId');
      expect(result).toHaveProperty('entityType');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('preview');
      expect(result).toHaveProperty('score');
      expect(result.matchType).toBe('keyword');
    });

    it('returns results ordered by relevance (BM25)', () => {
      // Insert two docs: one with many mentions of "financial", one with one
      fts.upsertEntity('rel-1', 'note', 'Financial overview', 'financial financial financial');
      fts.upsertEntity('rel-2', 'note', 'Another doc', 'financial');

      const results = fts.search('financial');
      expect(results.length).toBeGreaterThanOrEqual(2);
      // Higher relevance (more mentions) should come first; scores are already absolute
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it('respects limit parameter', () => {
      const results = fts.search('the', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('returns empty array for no matches', () => {
      const results = fts.search('xyznonexistentterm');
      expect(results).toEqual([]);
    });

    it('handles special FTS5 characters in query without throwing', () => {
      expect(() => fts.search('"hello"')).not.toThrow();
      expect(() => fts.search('hello*')).not.toThrow();
      expect(() => fts.search('(hello OR world)')).not.toThrow();
      expect(() => fts.search('hello^2')).not.toThrow();
      expect(() => fts.search('[test]')).not.toThrow();
    });

    it('returns empty array for empty query', () => {
      expect(fts.search('')).toEqual([]);
      expect(fts.search('   ')).toEqual([]);
    });
  });

  describe('deleteEntity', () => {
    it('removes entity from FTS5 index', () => {
      fts.upsertEntity('del-1', 'task', 'Delete me', 'This should be removed');
      fts.deleteEntity('del-1');
      const results = fts.search('Delete me');
      expect(results).toHaveLength(0);
    });

    it('does not throw when deleting non-existent entity', () => {
      expect(() => fts.deleteEntity('nonexistent-id')).not.toThrow();
    });
  });
});

describe('fts5Escape', () => {
  it('removes FTS5 special characters', () => {
    expect(fts5Escape('"hello"')).toBe('hello');
    expect(fts5Escape('hello*')).toBe('hello');
    expect(fts5Escape('(hello)')).toBe('hello');
    expect(fts5Escape('hello^world')).toBe('hello world');
  });

  it('preserves normal words', () => {
    expect(fts5Escape('hello world')).toBe('hello world');
  });

  it('trims whitespace', () => {
    expect(fts5Escape('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(fts5Escape('')).toBe('');
  });
});
