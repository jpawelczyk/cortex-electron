import { describe, it, expect, beforeEach } from 'vitest';
import { createAIAgentService, AIAgentService } from './ai-agent.service';
import { createTestDb, TestDb } from '../../../tests/helpers/db';

describe('AIAgentService', () => {
  let db: TestDb;
  let agentService: AIAgentService;

  beforeEach(() => {
    db = createTestDb();
    agentService = createAIAgentService(db);
  });

  describe('create', () => {
    it('generates a UUID for the agent', async () => {
      const { agent } = await agentService.create({ name: 'Test Agent' });

      expect(agent.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('returns a plain key with ctx_ prefix', async () => {
      const { key } = await agentService.create({ name: 'Test Agent' });

      expect(key).toMatch(/^ctx_[0-9a-f]{64}$/);
    });

    it('stores hash in DB, not plain key', async () => {
      const { agent, key } = await agentService.create({ name: 'Test Agent' });

      const raw = db.getRawAgent(agent.id);
      expect(raw).toBeDefined();
      expect(raw!.api_key_hash).not.toBe(key);
      expect(raw!.api_key_hash).not.toContain('ctx_');
    });

    it('stores the provided name', async () => {
      const { agent } = await agentService.create({ name: 'My AI Assistant' });

      expect(agent.name).toBe('My AI Assistant');
    });

    it('sets default permissions to read and write', async () => {
      const { agent } = await agentService.create({ name: 'Test Agent' });

      expect(agent.permissions).toEqual({ read: true, write: true });
    });

    it('accepts custom permissions', async () => {
      const { agent } = await agentService.create({
        name: 'Read Only Agent',
        permissions: { read: true, write: false },
      });

      expect(agent.permissions).toEqual({ read: true, write: false });
    });

    it('sets created_at timestamp', async () => {
      const before = new Date().toISOString();
      const { agent } = await agentService.create({ name: 'Test Agent' });
      const after = new Date().toISOString();

      expect(agent.created_at).toBeDefined();
      expect(agent.created_at >= before).toBe(true);
      expect(agent.created_at <= after).toBe(true);
    });

    it('sets revoked_at to null', async () => {
      const { agent } = await agentService.create({ name: 'Test Agent' });

      expect(agent.revoked_at).toBeNull();
    });

    it('sets last_used_at to null', async () => {
      const { agent } = await agentService.create({ name: 'Test Agent' });

      expect(agent.last_used_at).toBeNull();
    });

    it('does not include api_key_hash in returned agent', async () => {
      const { agent } = await agentService.create({ name: 'Test Agent' });

      expect(agent).not.toHaveProperty('api_key_hash');
    });
  });

  describe('list', () => {
    it('returns all non-revoked agents', async () => {
      await agentService.create({ name: 'Agent 1' });
      await agentService.create({ name: 'Agent 2' });
      await agentService.create({ name: 'Agent 3' });

      const agents = await agentService.list();

      expect(agents).toHaveLength(3);
    });

    it('includes revoked agents in list', async () => {
      await agentService.create({ name: 'Active' });
      const { agent: a2 } = await agentService.create({ name: 'Revoked' });
      await agentService.revoke(a2.id);

      const agents = await agentService.list();

      expect(agents).toHaveLength(2);
      const revoked = agents.find(a => a.id === a2.id);
      expect(revoked?.revoked_at).not.toBeNull();
    });

    it('does not include api_key_hash in listed agents', async () => {
      await agentService.create({ name: 'Agent' });

      const agents = await agentService.list();

      for (const agent of agents) {
        expect(agent).not.toHaveProperty('api_key_hash');
      }
    });

    it('returns empty array when no agents exist', async () => {
      const agents = await agentService.list();

      expect(agents).toEqual([]);
    });
  });

  describe('get', () => {
    it('returns agent by id', async () => {
      const { agent: created } = await agentService.create({ name: 'Find me' });

      const found = await agentService.get(created.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Find me');
    });

    it('returns null for non-existent id', async () => {
      const found = await agentService.get('non-existent-uuid');

      expect(found).toBeNull();
    });

    it('returns revoked agents', async () => {
      const { agent } = await agentService.create({ name: 'To revoke' });
      await agentService.revoke(agent.id);

      const found = await agentService.get(agent.id);

      expect(found).not.toBeNull();
      expect(found?.revoked_at).not.toBeNull();
    });

    it('does not include api_key_hash', async () => {
      const { agent: created } = await agentService.create({ name: 'Agent' });

      const found = await agentService.get(created.id);

      expect(found).not.toHaveProperty('api_key_hash');
    });
  });

  describe('revoke', () => {
    it('sets revoked_at timestamp', async () => {
      const { agent } = await agentService.create({ name: 'To revoke' });

      await agentService.revoke(agent.id);

      const raw = db.getRawAgent(agent.id);
      expect(raw?.revoked_at).not.toBeNull();
    });

    it('does not hard delete the agent', async () => {
      const { agent } = await agentService.create({ name: 'To revoke' });

      await agentService.revoke(agent.id);

      const raw = db.getRawAgent(agent.id);
      expect(raw).toBeDefined();
    });

    it('throws error for non-existent agent', async () => {
      await expect(
        agentService.revoke('non-existent')
      ).rejects.toThrow('Agent not found');
    });

    it('throws error for already revoked agent', async () => {
      const { agent } = await agentService.create({ name: 'Agent' });
      await agentService.revoke(agent.id);

      await expect(
        agentService.revoke(agent.id)
      ).rejects.toThrow('Agent already revoked');
    });
  });
});
