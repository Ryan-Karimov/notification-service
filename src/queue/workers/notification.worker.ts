import type { ConsumeMessage } from 'amqplib';
import { createConsumer } from '../consumer.js';
import { notificationRepository, deliveryAttemptRepository } from '../../db/repositories/index.js';
import { getChannel } from '../../channels/index.js';
import { notificationService } from '../../modules/notifications/notification.service.js';
import { calculateNextRetryAt, shouldRetry } from '../../utils/retry.js';
import { createChildLogger } from '../../utils/logger.js';
import type { NotificationMessage } from '../publisher.js';
import type { NotificationChannel } from '../../types/database.js';

const logger = createChildLogger('notification-worker');

export async function processNotification(
  message: NotificationMessage,
  originalMessage: ConsumeMessage
): Promise<void> {
  const startTime = Date.now();
  const { notificationId, channel: channelName, recipient, subject, body } = message;

  logger.info({
    notificationId,
    channel: channelName,
    attemptCount: message.attemptCount,
  }, 'Processing notification');

  const notification = await notificationRepository.findById(notificationId);
  if (!notification) {
    logger.warn({ notificationId }, 'Notification not found, skipping');
    return;
  }

  if (notification.status === 'cancelled' || notification.status === 'sent') {
    logger.info({
      notificationId,
      status: notification.status,
    }, 'Notification already processed, skipping');
    return;
  }

  await notificationRepository.markAsProcessing(notificationId);

  const channelInstance = getChannel(channelName as NotificationChannel);

  const result = await channelInstance.send({
    recipient,
    subject,
    body,
    metadata: message.metadata,
  });

  const durationMs = Date.now() - startTime;
  const attemptNumber = notification.attempt_count + 1;

  await deliveryAttemptRepository.create({
    notification_id: notificationId,
    attempt_number: attemptNumber,
    status: result.success ? 'success' : 'failed',
    error_message: result.error ?? null,
    duration_ms: durationMs,
  });

  if (result.success) {
    await notificationService.markAsSent(notificationId);
    logger.info({
      notificationId,
      channel: channelName,
      durationMs,
    }, 'Notification sent successfully');
  } else {
    const canRetry = shouldRetry(attemptNumber, message.maxAttempts);
    const nextRetryAt = canRetry ? calculateNextRetryAt(attemptNumber) : undefined;

    await notificationService.markAsFailed(notificationId, result.error ?? 'Unknown error', nextRetryAt ?? undefined);

    if (canRetry && nextRetryAt) {
      logger.info({
        notificationId,
        attemptNumber,
        nextRetryAt,
        error: result.error,
      }, 'Notification failed, scheduled for retry');
    } else {
      logger.error({
        notificationId,
        attemptNumber,
        error: result.error,
      }, 'Notification failed permanently');
    }
  }
}

export async function startNotificationWorker(queue: string): Promise<void> {
  await createConsumer<NotificationMessage>(
    { queue },
    processNotification
  );
  logger.info({ queue }, 'Notification worker started');
}
