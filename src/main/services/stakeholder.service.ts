import { v4 as uuid } from 'uuid';
import type { Stakeholder, CreateStakeholderInput, UpdateStakeholderInput } from '@shared/types';
import type { DbContext } from '../db/types';

export interface StakeholderService {
  create(input: CreateStakeholderInput): Promise<Stakeholder>;
  get(id: string): Promise<Stakeholder | null>;
  getAll(): Promise<Stakeholder[]>;
  update(id: string, input: UpdateStakeholderInput): Promise<Stakeholder>;
  delete(id: string): Promise<void>;
}

export function createStakeholderService(ctx: DbContext): StakeholderService {
  const { db } = ctx;

  return {
    async create(input: CreateStakeholderInput): Promise<Stakeholder> {
      const id = uuid();
      const now = new Date().toISOString();

      const stakeholder: Stakeholder = {
        id,
        name: input.name,
        organization: input.organization ?? null,
        role: input.role ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        avatar_url: input.avatar_url ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      await db.execute(`
        INSERT INTO stakeholders (
          id, name, organization, role, email, phone, notes, avatar_url,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        stakeholder.id, stakeholder.name, stakeholder.organization,
        stakeholder.role, stakeholder.email, stakeholder.phone,
        stakeholder.notes, stakeholder.avatar_url,
        stakeholder.created_at, stakeholder.updated_at, stakeholder.deleted_at,
      ]);

      return stakeholder;
    },

    async get(id: string): Promise<Stakeholder | null> {
      return db.getOptional<Stakeholder>(
        'SELECT * FROM stakeholders WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
    },

    async getAll(): Promise<Stakeholder[]> {
      return db.getAll<Stakeholder>(
        'SELECT * FROM stakeholders WHERE deleted_at IS NULL ORDER BY name, created_at'
      );
    },

    async update(id: string, input: UpdateStakeholderInput): Promise<Stakeholder> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Stakeholder not found');
      }

      const now = new Date().toISOString();

      const updated: Stakeholder = {
        ...existing,
        ...input,
        updated_at: now,
      };

      await db.execute(`
        UPDATE stakeholders SET
          name = ?, organization = ?, role = ?, email = ?, phone = ?,
          notes = ?, avatar_url = ?, updated_at = ?
        WHERE id = ?
      `, [
        updated.name, updated.organization, updated.role,
        updated.email, updated.phone, updated.notes,
        updated.avatar_url, updated.updated_at,
        id,
      ]);

      return updated;
    },

    async delete(id: string): Promise<void> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Stakeholder not found');
      }

      const now = new Date().toISOString();
      await db.execute(
        'UPDATE stakeholders SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [now, now, id]
      );
    },
  };
}
