import { describe, it, expect, beforeEach } from 'vitest';
import { createStakeholderService, StakeholderService } from './stakeholder.service';
import { createTestDb, TestDb } from '../../../tests/helpers/db';

describe('StakeholderService', () => {
  let db: TestDb;
  let stakeholderService: StakeholderService;

  beforeEach(() => {
    db = createTestDb();
    stakeholderService = createStakeholderService(db);
  });

  describe('create', () => {
    it('generates a UUID for the stakeholder', async () => {
      const stakeholder = await stakeholderService.create({ name: 'Alice' });

      expect(stakeholder.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('stores the provided name', async () => {
      const stakeholder = await stakeholderService.create({ name: 'Bob Smith' });

      expect(stakeholder.name).toBe('Bob Smith');
    });

    it('sets created_at and updated_at timestamps', async () => {
      const before = new Date().toISOString();
      const stakeholder = await stakeholderService.create({ name: 'Alice' });
      const after = new Date().toISOString();

      expect(stakeholder.created_at).toBeDefined();
      expect(stakeholder.updated_at).toBeDefined();
      expect(stakeholder.created_at >= before).toBe(true);
      expect(stakeholder.created_at <= after).toBe(true);
      expect(stakeholder.created_at).toBe(stakeholder.updated_at);
    });

    it('defaults optional fields to null', async () => {
      const stakeholder = await stakeholderService.create({ name: 'Alice' });

      expect(stakeholder.organization).toBeNull();
      expect(stakeholder.role).toBeNull();
      expect(stakeholder.email).toBeNull();
      expect(stakeholder.phone).toBeNull();
      expect(stakeholder.notes).toBeNull();
      expect(stakeholder.avatar_url).toBeNull();
      expect(stakeholder.deleted_at).toBeNull();
    });

    it('accepts optional fields', async () => {
      const stakeholder = await stakeholderService.create({
        name: 'Alice Johnson',
        organization: 'Acme Corp',
        role: 'Engineering Manager',
        email: 'alice@acme.com',
        phone: '+1-555-0100',
        notes: 'Key decision maker',
        avatar_url: 'https://example.com/alice.jpg',
      });

      expect(stakeholder.organization).toBe('Acme Corp');
      expect(stakeholder.role).toBe('Engineering Manager');
      expect(stakeholder.email).toBe('alice@acme.com');
      expect(stakeholder.phone).toBe('+1-555-0100');
      expect(stakeholder.notes).toBe('Key decision maker');
      expect(stakeholder.avatar_url).toBe('https://example.com/alice.jpg');
    });
  });

  describe('get', () => {
    it('retrieves a stakeholder by id', async () => {
      const created = await stakeholderService.create({ name: 'Alice' });

      const found = await stakeholderService.get(created.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Alice');
    });

    it('returns null for non-existent id', async () => {
      const found = await stakeholderService.get('non-existent-uuid');

      expect(found).toBeNull();
    });

    it('returns null for soft-deleted stakeholders', async () => {
      const created = await stakeholderService.create({ name: 'Alice' });
      await stakeholderService.delete(created.id);

      const found = await stakeholderService.get(created.id);

      expect(found).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns all non-deleted stakeholders', async () => {
      await stakeholderService.create({ name: 'Alice' });
      await stakeholderService.create({ name: 'Bob' });
      await stakeholderService.create({ name: 'Charlie' });

      const stakeholders = await stakeholderService.getAll();

      expect(stakeholders).toHaveLength(3);
    });

    it('excludes soft-deleted stakeholders', async () => {
      const alice = await stakeholderService.create({ name: 'Alice' });
      await stakeholderService.create({ name: 'Bob' });
      await stakeholderService.delete(alice.id);

      const stakeholders = await stakeholderService.getAll();

      expect(stakeholders).toHaveLength(1);
      expect(stakeholders[0].name).toBe('Bob');
    });

    it('returns stakeholders sorted by name', async () => {
      await stakeholderService.create({ name: 'Charlie' });
      await stakeholderService.create({ name: 'Alice' });
      await stakeholderService.create({ name: 'Bob' });

      const stakeholders = await stakeholderService.getAll();

      expect(stakeholders.map(s => s.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('update', () => {
    it('updates stakeholder fields', async () => {
      const stakeholder = await stakeholderService.create({ name: 'Alice' });

      const updated = await stakeholderService.update(stakeholder.id, {
        name: 'Alice Johnson',
        organization: 'Acme Corp',
      });

      expect(updated.name).toBe('Alice Johnson');
      expect(updated.organization).toBe('Acme Corp');
    });

    it('updates updated_at timestamp', async () => {
      const stakeholder = await stakeholderService.create({ name: 'Alice' });
      const originalUpdatedAt = stakeholder.updated_at;

      await new Promise(r => setTimeout(r, 10));

      const updated = await stakeholderService.update(stakeholder.id, { name: 'Alice Updated' });

      expect(updated.updated_at > originalUpdatedAt).toBe(true);
    });

    it('preserves unchanged fields', async () => {
      const stakeholder = await stakeholderService.create({
        name: 'Alice',
        email: 'alice@example.com',
      });

      const updated = await stakeholderService.update(stakeholder.id, {
        organization: 'Acme Corp',
      });

      expect(updated.name).toBe('Alice');
      expect(updated.email).toBe('alice@example.com');
      expect(updated.organization).toBe('Acme Corp');
    });

    it('allows setting fields to null', async () => {
      const stakeholder = await stakeholderService.create({
        name: 'Alice',
        email: 'alice@example.com',
      });

      const updated = await stakeholderService.update(stakeholder.id, {
        email: null,
      });

      expect(updated.email).toBeNull();
    });

    it('throws error for non-existent stakeholder', async () => {
      await expect(
        stakeholderService.update('non-existent', { name: 'Nope' })
      ).rejects.toThrow('Stakeholder not found');
    });
  });

  describe('delete', () => {
    it('soft deletes by setting deleted_at', async () => {
      const stakeholder = await stakeholderService.create({ name: 'Alice' });

      await stakeholderService.delete(stakeholder.id);

      const raw = db.getRawStakeholder(stakeholder.id);
      expect(raw?.deleted_at).not.toBeNull();
    });

    it('is a no-op for non-existent stakeholder', async () => {
      await expect(
        stakeholderService.delete('non-existent')
      ).resolves.toBeUndefined();
    });
  });
});
