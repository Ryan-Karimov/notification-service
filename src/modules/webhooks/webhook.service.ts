import crypto from 'crypto';
import { createChildLogger } from '../../utils/logger.js';
import type { WebhookMessage } from '../../queue/publisher.js';

const logger = createChildLogger('webhook-service');

export interface WebhookPayload {
  event: 'notification.sent' | 'notification.failed';
  timestamp: string;
  data: {
    notificationId: string;
    channel: string;
    recipient: string;
    status: 'sent' | 'failed';
    sentAt?: string;
    errorMessage?: string;
  };
}

export function createWebhookPayload(message: WebhookMessage): WebhookPayload {
  return {
    event: message.status === 'sent' ? 'notification.sent' : 'notification.failed',
    timestamp: new Date().toISOString(),
    data: {
      notificationId: message.notificationId,
      channel: message.channel,
      recipient: message.recipient,
      status: message.status,
      sentAt: message.sentAt,
      errorMessage: message.errorMessage,
    },
  };
}

export function signPayload(payload: WebhookPayload, secret: string): string {
  const data = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string | null
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'NotificationService/1.0',
  };

  if (secret) {
    headers['X-Webhook-Signature'] = signPayload(payload, secret);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      logger.info({
        url,
        statusCode: response.status,
        notificationId: payload.data.notificationId,
      }, 'Webhook delivered successfully');

      return { success: true, statusCode: response.status };
    }

    logger.warn({
      url,
      statusCode: response.status,
      notificationId: payload.data.notificationId,
    }, 'Webhook delivery failed with non-2xx status');

    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      error,
      url,
      notificationId: payload.data.notificationId,
    }, 'Webhook delivery error');

    return { success: false, error: errorMessage };
  }
}
