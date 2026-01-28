import amqplib, { type Connection, type Channel } from 'amqplib';
import { config } from '../config/index.js';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '../config/rabbitmq.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('rabbitmq');

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function connectToRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    await channel.prefetch(config.rabbitmq.prefetch);

    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

    await setupExchangesAndQueues(channel);

    logger.info('RabbitMQ connected and configured');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to RabbitMQ');
    throw error;
  }
}

async function setupExchangesAndQueues(ch: Channel): Promise<void> {
  await ch.assertExchange(EXCHANGES.NOTIFICATIONS, 'topic', { durable: true });
  await ch.assertExchange(EXCHANGES.WEBHOOKS, 'direct', { durable: true });
  await ch.assertExchange(EXCHANGES.DLX, 'direct', { durable: true });

  await ch.assertQueue(QUEUES.DEAD, { durable: true });
  await ch.bindQueue(QUEUES.DEAD, EXCHANGES.DLX, ROUTING_KEYS.DEAD);

  const queueOptions = {
    durable: true,
    deadLetterExchange: EXCHANGES.DLX,
    deadLetterRoutingKey: ROUTING_KEYS.DEAD,
  };

  const emailQueues = [
    { queue: QUEUES.EMAIL_CRITICAL, key: ROUTING_KEYS.EMAIL_CRITICAL },
    { queue: QUEUES.EMAIL_HIGH, key: ROUTING_KEYS.EMAIL_HIGH },
    { queue: QUEUES.EMAIL_NORMAL, key: ROUTING_KEYS.EMAIL_NORMAL },
    { queue: QUEUES.EMAIL_LOW, key: ROUTING_KEYS.EMAIL_LOW },
  ];

  const telegramQueues = [
    { queue: QUEUES.TELEGRAM_CRITICAL, key: ROUTING_KEYS.TELEGRAM_CRITICAL },
    { queue: QUEUES.TELEGRAM_HIGH, key: ROUTING_KEYS.TELEGRAM_HIGH },
    { queue: QUEUES.TELEGRAM_NORMAL, key: ROUTING_KEYS.TELEGRAM_NORMAL },
    { queue: QUEUES.TELEGRAM_LOW, key: ROUTING_KEYS.TELEGRAM_LOW },
  ];

  const smsQueues = [
    { queue: QUEUES.SMS_CRITICAL, key: ROUTING_KEYS.SMS_CRITICAL },
    { queue: QUEUES.SMS_HIGH, key: ROUTING_KEYS.SMS_HIGH },
    { queue: QUEUES.SMS_NORMAL, key: ROUTING_KEYS.SMS_NORMAL },
    { queue: QUEUES.SMS_LOW, key: ROUTING_KEYS.SMS_LOW },
  ];

  for (const { queue, key } of [...emailQueues, ...telegramQueues, ...smsQueues]) {
    await ch.assertQueue(queue, queueOptions);
    await ch.bindQueue(queue, EXCHANGES.NOTIFICATIONS, key);
  }

  await ch.assertQueue(QUEUES.SCHEDULED, { durable: true });
  await ch.bindQueue(QUEUES.SCHEDULED, EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.SCHEDULED);

  await ch.assertQueue(QUEUES.WEBHOOKS, { durable: true });
  await ch.bindQueue(QUEUES.WEBHOOKS, EXCHANGES.WEBHOOKS, ROUTING_KEYS.WEBHOOK);

  logger.info('RabbitMQ exchanges and queues configured');
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

export function getConnection(): Connection {
  if (!connection) {
    throw new Error('RabbitMQ connection not initialized');
  }
  return connection;
}

export async function checkRabbitMQConnection(): Promise<boolean> {
  try {
    if (!connection || !channel) {
      return false;
    }
    await channel.checkQueue(QUEUES.DEAD);
    return true;
  } catch {
    return false;
  }
}

export async function closeRabbitMQConnection(): Promise<void> {
  logger.info('Closing RabbitMQ connection');
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
  } catch (error) {
    logger.error({ error }, 'Error closing RabbitMQ connection');
  }
}
