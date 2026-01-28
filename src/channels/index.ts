import { emailChannel } from './email.channel.js';
import { telegramChannel } from './telegram.channel.js';
import { smsChannel } from './sms.channel.js';
import type { BaseChannel } from './base.channel.js';
import type { NotificationChannel } from '../types/database.js';

export { BaseChannel, type ChannelMessage, type SendResult } from './base.channel.js';
export { emailChannel } from './email.channel.js';
export { telegramChannel } from './telegram.channel.js';
export { smsChannel } from './sms.channel.js';

const channels: Record<NotificationChannel, BaseChannel> = {
  email: emailChannel,
  telegram: telegramChannel,
  sms: smsChannel,
};

export function getChannel(channelName: NotificationChannel): BaseChannel {
  const channel = channels[channelName];
  if (!channel) {
    throw new Error(`Unknown channel: ${channelName}`);
  }
  return channel;
}
