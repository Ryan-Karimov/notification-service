import { createConsumer } from '../../queue/consumer.js';
import { QUEUES } from '../../config/rabbitmq.js';
import { createWebhookPayload, deliverWebhook } from './webhook.service.js';
import { createChildLogger } from '../../utils/logger.js';
import type { WebhookMessage } from '../../queue/publisher.js';

const logger = createChildLogger('webhook-worker');

async function processWebhook(message: WebhookMessage): Promise<void> {
  logger.info({
    notificationId: message.notificationId,
    status: message.status,
    webhookUrl: message.webhookUrl,
  }, 'Processing webhook delivery');

  const payload = createWebhookPayload(message);

  const result = await deliverWebhook(
    message.webhookUrl,
    payload,
    message.webhookSecret
  );

  if (!result.success) {
    logger.warn({
      notificationId: message.notificationId,
      error: result.error,
      statusCode: result.statusCode,
    }, 'Webhook delivery failed');
  }
}

export async function startWebhookWorker(): Promise<void> {
  await createConsumer<WebhookMessage>(
    { queue: QUEUES.WEBHOOKS },
    processWebhook
  );
  logger.info('Webhook worker started');
}
