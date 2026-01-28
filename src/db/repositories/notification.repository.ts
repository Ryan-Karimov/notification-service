import { db } from '../connection.js';
import type {
  Notification,
  NewNotification,
  NotificationUpdate,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from '../../types/database.js';
import { sql } from 'kysely';

export interface NotificationFilters {
  apiKeyId: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  from?: Date;
  to?: Date;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export const notificationRepository = {
  async findById(id: string): Promise<Notification | undefined> {
    return db
      .selectFrom('notifications')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  },

  async findAll(
    filters: NotificationFilters,
    pagination: PaginationOptions
  ): Promise<{ data: Notification[]; total: number }> {
    let query = db
      .selectFrom('notifications')
      .selectAll()
      .where('api_key_id', '=', filters.apiKeyId);

    if (filters.channel) {
      query = query.where('channel', '=', filters.channel);
    }

    if (filters.status) {
      query = query.where('status', '=', filters.status);
    }

    if (filters.priority) {
      query = query.where('priority', '=', filters.priority);
    }

    if (filters.from) {
      query = query.where('created_at', '>=', filters.from);
    }

    if (filters.to) {
      query = query.where('created_at', '<=', filters.to);
    }

    let countQuery = db
      .selectFrom('notifications')
      .select(db.fn.count<number>('id').as('count'))
      .where('api_key_id', '=', filters.apiKeyId);

    if (filters.channel) {
      countQuery = countQuery.where('channel', '=', filters.channel);
    }

    if (filters.status) {
      countQuery = countQuery.where('status', '=', filters.status);
    }

    const [data, countResult] = await Promise.all([
      query
        .orderBy('created_at', 'desc')
        .limit(pagination.limit)
        .offset(pagination.offset)
        .execute(),
      countQuery.executeTakeFirst(),
    ]);

    return {
      data,
      total: Number(countResult?.count ?? 0),
    };
  },

  async create(data: NewNotification): Promise<Notification> {
    return db
      .insertInto('notifications')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async createMany(data: NewNotification[]): Promise<Notification[]> {
    if (data.length === 0) return [];
    return db
      .insertInto('notifications')
      .values(data)
      .returningAll()
      .execute();
  },

  async update(id: string, data: NotificationUpdate): Promise<Notification | undefined> {
    return db
      .updateTable('notifications')
      .set({ ...data, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  },

  async cancel(id: string, apiKeyId: string): Promise<Notification | undefined> {
    return db
      .updateTable('notifications')
      .set({ status: 'cancelled', updated_at: new Date() })
      .where('id', '=', id)
      .where('api_key_id', '=', apiKeyId)
      .where('status', 'in', ['pending', 'scheduled', 'queued'])
      .returningAll()
      .executeTakeFirst();
  },

  async findScheduledNotifications(limit: number = 100): Promise<Notification[]> {
    return db
      .selectFrom('notifications')
      .selectAll()
      .where('status', '=', 'scheduled')
      .where('scheduled_at', '<=', new Date())
      .orderBy('scheduled_at', 'asc')
      .limit(limit)
      .execute();
  },

  async findRetryableNotifications(limit: number = 100): Promise<Notification[]> {
    return db
      .selectFrom('notifications')
      .selectAll()
      .where('status', '=', 'processing')
      .where('next_retry_at', '<=', new Date())
      .where(sql`attempt_count < max_attempts`)
      .orderBy('next_retry_at', 'asc')
      .limit(limit)
      .execute();
  },

  async markAsQueued(id: string): Promise<Notification | undefined> {
    return this.update(id, { status: 'queued' });
  },

  async markAsProcessing(id: string): Promise<Notification | undefined> {
    return db
      .updateTable('notifications')
      .set({
        status: 'processing',
        attempt_count: sql`attempt_count + 1`,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  },

  async markAsSent(id: string): Promise<Notification | undefined> {
    return this.update(id, {
      status: 'sent',
      sent_at: new Date(),
      error_message: null,
      next_retry_at: null,
    });
  },

  async markAsFailed(id: string, errorMessage: string, nextRetryAt?: Date): Promise<Notification | undefined> {
    return this.update(id, {
      status: nextRetryAt ? 'processing' : 'failed',
      error_message: errorMessage,
      next_retry_at: nextRetryAt ?? null,
    });
  },

  async existsForApiKey(id: string, apiKeyId: string): Promise<boolean> {
    const result = await db
      .selectFrom('notifications')
      .select('id')
      .where('id', '=', id)
      .where('api_key_id', '=', apiKeyId)
      .executeTakeFirst();
    return !!result;
  },
};
