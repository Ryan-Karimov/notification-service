import { notificationRepository } from '../../db/repositories/index.js';
import { publishNotification } from '../publisher.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('scheduler-worker');

const POLL_INTERVAL = 5000;
const BATCH_SIZE = 100;

let isRunning = false;

export async function processScheduledNotifications(): Promise<number> {
  const notifications = await notificationRepository.findScheduledNotifications(BATCH_SIZE);

  if (notifications.length === 0) {
    return 0;
  }

  logger.info({ count: notifications.length }, 'Processing scheduled notifications');

  let processed = 0;

  for (const notification of notifications) {
    try {
      await notificationRepository.markAsQueued(notification.id);
      await publishNotification({ ...notification, status: 'queued' });
      processed++;

      logger.debug({
        notificationId: notification.id,
        channel: notification.channel,
      }, 'Scheduled notification queued');
    } catch (error) {
      logger.error({
        error,
        notificationId: notification.id,
      }, 'Failed to queue scheduled notification');
    }
  }

  return processed;
}

export async function processRetryableNotifications(): Promise<number> {
  const notifications = await notificationRepository.findRetryableNotifications(BATCH_SIZE);

  if (notifications.length === 0) {
    return 0;
  }

  logger.info({ count: notifications.length }, 'Processing retryable notifications');

  let processed = 0;

  for (const notification of notifications) {
    try {
      await publishNotification(notification);
      processed++;

      logger.debug({
        notificationId: notification.id,
        attemptCount: notification.attempt_count,
      }, 'Notification re-queued for retry');
    } catch (error) {
      logger.error({
        error,
        notificationId: notification.id,
      }, 'Failed to re-queue notification for retry');
    }
  }

  return processed;
}

export async function runSchedulerLoop(): Promise<void> {
  isRunning = true;

  logger.info('Scheduler worker started');

  while (isRunning) {
    try {
      await processScheduledNotifications();
      await processRetryableNotifications();
    } catch (error) {
      logger.error({ error }, 'Scheduler loop error');
    }

    await sleep(POLL_INTERVAL);
  }

  logger.info('Scheduler worker stopped');
}

export function stopSchedulerLoop(): void {
  isRunning = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
