import type { Channel, ConsumeMessage } from 'amqplib';
import { getChannel } from './connection.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('consumer');

export type MessageHandler<T> = (message: T, originalMessage: ConsumeMessage) => Promise<void>;

export interface ConsumerOptions {
  queue: string;
  prefetch?: number;
}

export async function createConsumer<T>(
  options: ConsumerOptions,
  handler: MessageHandler<T>
): Promise<void> {
  const channel = getChannel();

  if (options.prefetch) {
    await channel.prefetch(options.prefetch);
  }

  await channel.consume(
    options.queue,
    async (msg) => {
      if (!msg) {
        return;
      }

      try {
        const content = JSON.parse(msg.content.toString()) as T;
        await handler(content, msg);
        channel.ack(msg);
      } catch (error) {
        logger.error({
          error,
          queue: options.queue,
          messageId: msg.properties.messageId,
        }, 'Error processing message');

        const redelivered = msg.fields.redelivered;
        if (redelivered) {
          channel.reject(msg, false);
        } else {
          channel.nack(msg, false, true);
        }
      }
    },
    { noAck: false }
  );

  logger.info({ queue: options.queue }, 'Consumer started');
}

export function ackMessage(msg: ConsumeMessage): void {
  const channel = getChannel();
  channel.ack(msg);
}

export function nackMessage(msg: ConsumeMessage, requeue: boolean = false): void {
  const channel = getChannel();
  channel.nack(msg, false, requeue);
}

export function rejectMessage(msg: ConsumeMessage): void {
  const channel = getChannel();
  channel.reject(msg, false);
}
