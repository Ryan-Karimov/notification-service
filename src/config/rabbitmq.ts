export const EXCHANGES = {
  NOTIFICATIONS: 'notifications.main',
  WEBHOOKS: 'webhooks.exchange',
  DLX: 'notifications.dlx',
} as const;

export const QUEUES = {
  EMAIL_CRITICAL: 'notifications.email.critical',
  EMAIL_HIGH: 'notifications.email.high',
  EMAIL_NORMAL: 'notifications.email.normal',
  EMAIL_LOW: 'notifications.email.low',

  TELEGRAM_CRITICAL: 'notifications.telegram.critical',
  TELEGRAM_HIGH: 'notifications.telegram.high',
  TELEGRAM_NORMAL: 'notifications.telegram.normal',
  TELEGRAM_LOW: 'notifications.telegram.low',

  SMS_CRITICAL: 'notifications.sms.critical',
  SMS_HIGH: 'notifications.sms.high',
  SMS_NORMAL: 'notifications.sms.normal',
  SMS_LOW: 'notifications.sms.low',

  SCHEDULED: 'notifications.scheduled',
  WEBHOOKS: 'webhooks.delivery',
  DEAD: 'notifications.dead',
} as const;

export const ROUTING_KEYS = {
  EMAIL_CRITICAL: 'email.critical',
  EMAIL_HIGH: 'email.high',
  EMAIL_NORMAL: 'email.normal',
  EMAIL_LOW: 'email.low',

  TELEGRAM_CRITICAL: 'telegram.critical',
  TELEGRAM_HIGH: 'telegram.high',
  TELEGRAM_NORMAL: 'telegram.normal',
  TELEGRAM_LOW: 'telegram.low',

  SMS_CRITICAL: 'sms.critical',
  SMS_HIGH: 'sms.high',
  SMS_NORMAL: 'sms.normal',
  SMS_LOW: 'sms.low',

  SCHEDULED: 'scheduled',
  WEBHOOK: 'webhook',
  DEAD: 'dead',
} as const;

export function getQueueForChannelAndPriority(
  channel: 'email' | 'telegram' | 'sms',
  priority: 'low' | 'normal' | 'high' | 'critical'
): string {
  const key = `${channel.toUpperCase()}_${priority.toUpperCase()}` as keyof typeof QUEUES;
  return QUEUES[key];
}

export function getRoutingKeyForChannelAndPriority(
  channel: 'email' | 'telegram' | 'sms',
  priority: 'low' | 'normal' | 'high' | 'critical'
): string {
  const key = `${channel.toUpperCase()}_${priority.toUpperCase()}` as keyof typeof ROUTING_KEYS;
  return ROUTING_KEYS[key];
}
