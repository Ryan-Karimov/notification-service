import { getChannel } from './connection.js';
import { EXCHANGES, getRoutingKeyForChannelAndPriority, ROUTING_KEYS } from '../config/rabbitmq.js';
import { createChildLogger } from '../utils/logger.js';
import type { Notification, NotificationChannel, NotificationPriority } from '../types/database.js';

const logger = createChildLogger('publisher');

export interface NotificationMessage {
  notificationId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  recipient: string;
  subject: string | null;
  body: string;
  attemptCount: number;
  maxAttempts: number;
  apiKeyId: string;
  metadata?: Record<string, unknown> | null;
}

export interface WebhookMessage {
  notificationId: string;
  apiKeyId: string;
  status: 'sent' | 'failed';
  channel: NotificationChannel;
  recipient: string;
  sentAt?: string;
  errorMessage?: string;
  webhookUrl: string;
  webhookSecret: string | null;
}

export async function publishNotification(notification: Notification): Promise<void> {
  const channel = getChannel();
  const routingKey = getRoutingKeyForChannelAndPriority(
    notification.channel,
    notification.priority
  );

  const message: NotificationMessage = {
    notificationId: notification.id,
    channel: notification.channel,
    priority: notification.priority,
    recipient: notification.recipient,
    subject: notification.subject,
    body: notification.body,
    attemptCount: notification.attempt_count,
    maxAttempts: notification.max_attempts,
    apiKeyId: notification.api_key_id,
    metadata: notification.metadata,
  };

  const content = Buffer.from(JSON.stringify(message));

  channel.publish(EXCHANGES.NOTIFICATIONS, routingKey, content, {
    persistent: true,
    contentType: 'application/json',
    timestamp: Date.now(),
  });

  logger.debug({
    notificationId: notification.id,
    channel: notification.channel,
    priority: notification.priority,
    routingKey,
  }, 'Published notification to queue');
}

export async function publishScheduledNotification(notification: Notification): Promise<void> {
  const channel = getChannel();

  const message: NotificationMessage = {
    notificationId: notification.id,
    channel: notification.channel,
    priority: notification.priority,
    recipient: notification.recipient,
    subject: notification.subject,
    body: notification.body,
    attemptCount: notification.attempt_count,
    maxAttempts: notification.max_attempts,
    apiKeyId: notification.api_key_id,
    metadata: notification.metadata,
  };

  const content = Buffer.from(JSON.stringify(message));

  channel.publish(EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.SCHEDULED, content, {
    persistent: true,
    contentType: 'application/json',
    timestamp: Date.now(),
  });

  logger.debug({
    notificationId: notification.id,
    scheduledAt: notification.scheduled_at,
  }, 'Published scheduled notification');
}

export async function publishWebhook(message: WebhookMessage): Promise<void> {
  const channel = getChannel();

  const content = Buffer.from(JSON.stringify(message));

  channel.publish(EXCHANGES.WEBHOOKS, ROUTING_KEYS.WEBHOOK, content, {
    persistent: true,
    contentType: 'application/json',
    timestamp: Date.now(),
  });

  logger.debug({
    notificationId: message.notificationId,
    status: message.status,
  }, 'Published webhook delivery');
}
