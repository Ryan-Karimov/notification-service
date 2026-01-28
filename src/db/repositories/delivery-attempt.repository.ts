import { db } from '../connection.js';
import type { DeliveryAttempt, NewDeliveryAttempt } from '../../types/database.js';

export const deliveryAttemptRepository = {
  async findByNotificationId(notificationId: string): Promise<DeliveryAttempt[]> {
    return db
      .selectFrom('delivery_attempts')
      .selectAll()
      .where('notification_id', '=', notificationId)
      .orderBy('attempt_number', 'asc')
      .execute();
  },

  async create(data: NewDeliveryAttempt): Promise<DeliveryAttempt> {
    return db
      .insertInto('delivery_attempts')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getLastAttempt(notificationId: string): Promise<DeliveryAttempt | undefined> {
    return db
      .selectFrom('delivery_attempts')
      .selectAll()
      .where('notification_id', '=', notificationId)
      .orderBy('attempt_number', 'desc')
      .limit(1)
      .executeTakeFirst();
  },
};
