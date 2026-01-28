import type { NotificationChannel } from '../types/database.js';

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ChannelMessage {
  recipient: string;
  subject: string | null;
  body: string;
  metadata?: Record<string, unknown> | null;
}

export abstract class BaseChannel {
  abstract readonly name: NotificationChannel;
  abstract readonly isConfigured: boolean;

  abstract send(message: ChannelMessage): Promise<SendResult>;

  validateRecipient(recipient: string): boolean {
    return recipient.length > 0;
  }
}
