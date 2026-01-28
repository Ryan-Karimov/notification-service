import { db } from '../connection.js';
import type { Template, NewTemplate, TemplateUpdate, NotificationChannel } from '../../types/database.js';

export interface TemplateFilters {
  apiKeyId: string;
  channel?: NotificationChannel;
  search?: string;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export const templateRepository = {
  async findById(id: string): Promise<Template | undefined> {
    return db
      .selectFrom('templates')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  },

  async findByCode(apiKeyId: string, code: string): Promise<Template | undefined> {
    return db
      .selectFrom('templates')
      .selectAll()
      .where('api_key_id', '=', apiKeyId)
      .where('code', '=', code)
      .executeTakeFirst();
  },

  async findAll(
    filters: TemplateFilters,
    pagination: PaginationOptions
  ): Promise<{ data: Template[]; total: number }> {
    let query = db
      .selectFrom('templates')
      .selectAll()
      .where('api_key_id', '=', filters.apiKeyId);

    if (filters.channel) {
      query = query.where('channel', '=', filters.channel);
    }

    if (filters.search) {
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${filters.search}%`),
          eb('code', 'ilike', `%${filters.search}%`),
        ])
      );
    }

    const [data, countResult] = await Promise.all([
      query
        .orderBy('created_at', 'desc')
        .limit(pagination.limit)
        .offset(pagination.offset)
        .execute(),
      db
        .selectFrom('templates')
        .select(db.fn.count<number>('id').as('count'))
        .where('api_key_id', '=', filters.apiKeyId)
        .executeTakeFirst(),
    ]);

    return {
      data,
      total: Number(countResult?.count ?? 0),
    };
  },

  async create(data: NewTemplate): Promise<Template> {
    return db
      .insertInto('templates')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async update(id: string, data: TemplateUpdate): Promise<Template | undefined> {
    return db
      .updateTable('templates')
      .set({ ...data, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .deleteFrom('templates')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0;
  },

  async existsForApiKey(id: string, apiKeyId: string): Promise<boolean> {
    const result = await db
      .selectFrom('templates')
      .select('id')
      .where('id', '=', id)
      .where('api_key_id', '=', apiKeyId)
      .executeTakeFirst();
    return !!result;
  },
};
