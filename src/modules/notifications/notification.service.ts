import { notificationRepository, templateRepository, apiKeyRepository } from '../../db/repositories/index.js';
import { renderTemplate } from '../../templates/engine.js';
import { publishNotification, publishScheduledNotification, publishWebhook } from '../../queue/publisher.js';
import { NotFoundError, ValidationError } from '../../middleware/error-handler.middleware.js';
import type { Notification, NewNotification, NotificationChannel, NotificationStatus, NotificationPriority } from '../../types/database.js';
import type { CreateNotificationInput, NotificationQuery } from './notification.schema.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('notification-service');

export const notificationService = {
  async create(apiKeyId: string, input: CreateNotificationInput): Promise<Notification> {
    let subject = input.subject ?? null;
    let body = input.body ?? '';

    if (input.templateCode) {
      const template = await templateRepository.findByCode(apiKeyId, input.templateCode);
      if (!template) {
        throw new NotFoundError(`Template with code "${input.templateCode}" not found`);
      }

      if (template.channel !== input.channel) {
        throw new ValidationError(`Template channel (${template.channel}) does not match notification channel (${input.channel})`);
      }

      const rendered = renderTemplate(
        template.subject,
        template.body,
        input.templateVariables ?? {}
      );
      subject = rendered.subject ?? null;
      body = rendered.body;
    }

    if (!body) {
      throw new ValidationError('Notification body is required');
    }

    if (input.channel === 'email' && !subject) {
      throw new ValidationError('Subject is required for email notifications');
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const status: NotificationStatus = scheduledAt && scheduledAt > new Date() ? 'scheduled' : 'pending';

    const notification = await notificationRepository.create({
      api_key_id: apiKeyId,
      template_id: input.templateCode ? (await templateRepository.findByCode(apiKeyId, input.templateCode))?.id : null,
      channel: input.channel,
      recipient: input.recipient,
      subject,
      body,
      priority: input.priority,
      scheduled_at: scheduledAt,
      status,
      max_attempts: 4,
      metadata: input.metadata ?? null,
    });

    if (status === 'pending') {
      await notificationRepository.markAsQueued(notification.id);
      await publishNotification({ ...notification, status: 'queued' });
    } else if (status === 'scheduled') {
      await publishScheduledNotification(notification);
    }

    logger.info({
      notificationId: notification.id,
      channel: notification.channel,
      status: notification.status,
    }, 'Notification created');

    return notification;
  },

  async createBulk(apiKeyId: string, inputs: CreateNotificationInput[]): Promise<Notification[]> {
    const results: Notification[] = [];

    for (const input of inputs) {
      const notification = await this.create(apiKeyId, input);
      results.push(notification);
    }

    return results;
  },

  async findById(id: string, apiKeyId: string): Promise<Notification> {
    const notification = await notificationRepository.findById(id);
    if (!notification || notification.api_key_id !== apiKeyId) {
      throw new NotFoundError('Notification not found');
    }
    return notification;
  },

  async findAll(apiKeyId: string, query: NotificationQuery) {
    return notificationRepository.findAll(
      {
        apiKeyId,
        channel: query.channel as NotificationChannel | undefined,
        status: query.status as NotificationStatus | undefined,
        priority: query.priority as NotificationPriority | undefined,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
      {
        limit: query.limit,
        offset: query.offset,
      }
    );
  },

  async cancel(id: string, apiKeyId: string): Promise<Notification> {
    const notification = await notificationRepository.cancel(id, apiKeyId);
    if (!notification) {
      const existing = await notificationRepository.findById(id);
      if (!existing || existing.api_key_id !== apiKeyId) {
        throw new NotFoundError('Notification not found');
      }
      throw new ValidationError(`Cannot cancel notification with status "${existing.status}"`);
    }

    logger.info({ notificationId: id }, 'Notification cancelled');
    return notification;
  },

  async markAsSent(id: string): Promise<void> {
    const notification = await notificationRepository.markAsSent(id);
    if (!notification) {
      logger.warn({ notificationId: id }, 'Failed to mark notification as sent');
      return;
    }

    const apiKey = await apiKeyRepository.findById(notification.api_key_id);
    if (apiKey?.webhook_url) {
      await publishWebhook({
        notificationId: notification.id,
        apiKeyId: notification.api_key_id,
        status: 'sent',
        channel: notification.channel,
        recipient: notification.recipient,
        sentAt: notification.sent_at?.toISOString(),
        webhookUrl: apiKey.webhook_url,
        webhookSecret: apiKey.webhook_secret,
      });
    }

    logger.info({ notificationId: id }, 'Notification marked as sent');
  },

  async markAsFailed(id: string, errorMessage: string, nextRetryAt?: Date): Promise<void> {
    const notification = await notificationRepository.markAsFailed(id, errorMessage, nextRetryAt);
    if (!notification) {
      logger.warn({ notificationId: id }, 'Failed to mark notification as failed');
      return;
    }

    if (!nextRetryAt) {
      const apiKey = await apiKeyRepository.findById(notification.api_key_id);
      if (apiKey?.webhook_url) {
        await publishWebhook({
          notificationId: notification.id,
          apiKeyId: notification.api_key_id,
          status: 'failed',
          channel: notification.channel,
          recipient: notification.recipient,
          errorMessage,
          webhookUrl: apiKey.webhook_url,
          webhookSecret: apiKey.webhook_secret,
        });
      }
    }

    logger.info({
      notificationId: id,
      hasRetry: !!nextRetryAt,
    }, 'Notification marked as failed');
  },
};
