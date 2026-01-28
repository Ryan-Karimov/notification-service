import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectToRabbitMQ, closeRabbitMQConnection } from './queue/connection.js';
import { closeDatabaseConnection } from './db/connection.js';
import { QUEUES } from './config/rabbitmq.js';
import { startNotificationWorker } from './queue/workers/notification.worker.js';
import { runSchedulerLoop, stopSchedulerLoop } from './queue/workers/scheduler.worker.js';
import { startWebhookWorker } from './modules/webhooks/webhook.worker.js';

async function main() {
  logger.info('Starting notification worker...');

  try {
    await connectToRabbitMQ();
    logger.info('Connected to RabbitMQ');

    await startNotificationWorker(QUEUES.EMAIL_CRITICAL);
    await startNotificationWorker(QUEUES.EMAIL_HIGH);
    await startNotificationWorker(QUEUES.EMAIL_NORMAL);
    await startNotificationWorker(QUEUES.EMAIL_LOW);

    await startNotificationWorker(QUEUES.TELEGRAM_CRITICAL);
    await startNotificationWorker(QUEUES.TELEGRAM_HIGH);
    await startNotificationWorker(QUEUES.TELEGRAM_NORMAL);
    await startNotificationWorker(QUEUES.TELEGRAM_LOW);

    await startNotificationWorker(QUEUES.SMS_CRITICAL);
    await startNotificationWorker(QUEUES.SMS_HIGH);
    await startNotificationWorker(QUEUES.SMS_NORMAL);
    await startNotificationWorker(QUEUES.SMS_LOW);

    await startWebhookWorker();

    runSchedulerLoop();

    logger.info('All workers started');

    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');

      stopSchedulerLoop();

      await closeRabbitMQConnection();
      await closeDatabaseConnection();

      logger.info('Worker shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.fatal({ error }, 'Failed to start worker');
    process.exit(1);
  }
}

main();
