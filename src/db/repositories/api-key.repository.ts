import { db } from '../connection.js';
import type { ApiKey, NewApiKey, ApiKeyUpdate } from '../../types/database.js';

export const apiKeyRepository = {
  async findById(id: string): Promise<ApiKey | undefined> {
    return db
      .selectFrom('api_keys')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  },

  async findByKey(key: string): Promise<ApiKey | undefined> {
    return db
      .selectFrom('api_keys')
      .selectAll()
      .where('key', '=', key)
      .where('is_active', '=', true)
      .executeTakeFirst();
  },

  async findAll(): Promise<ApiKey[]> {
    return db
      .selectFrom('api_keys')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
  },

  async create(data: NewApiKey): Promise<ApiKey> {
    return db
      .insertInto('api_keys')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async update(id: string, data: ApiKeyUpdate): Promise<ApiKey | undefined> {
    return db
      .updateTable('api_keys')
      .set({ ...data, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .deleteFrom('api_keys')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0;
  },

  async deactivate(id: string): Promise<ApiKey | undefined> {
    return this.update(id, { is_active: false });
  },
};
