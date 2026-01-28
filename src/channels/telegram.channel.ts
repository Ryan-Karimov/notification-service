import { config } from '../config/index.js';
import { createChildLogger } from '../utils/logger.js';
import { BaseChannel, type ChannelMessage, type SendResult } from './base.channel.js';

const logger = createChildLogger('telegram-channel');

interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
}

export class TelegramChannel extends BaseChannel {
  readonly name = 'telegram' as const;
  private botToken: string;
  private apiUrl: string;

  get isConfigured(): boolean {
    return !!config.telegram.botToken;
  }

  constructor() {
    super();
    this.botToken = config.telegram.botToken;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;

    if (this.isConfigured) {
      logger.info('Telegram channel initialized');
    } else {
      logger.warn('Telegram channel not configured - bot token missing');
    }
  }

  validateRecipient(chatId: string): boolean {
    return /^-?\d+$/.test(chatId);
  }

  async send(message: ChannelMessage): Promise<SendResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Telegram channel not configured',
      };
    }

    if (!this.validateRecipient(message.recipient)) {
      return {
        success: false,
        error: 'Invalid Telegram chat ID',
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: message.recipient,
          text: message.body,
          parse_mode: 'HTML',
        }),
      });

      const data = (await response.json()) as TelegramResponse;

      if (!data.ok) {
        logger.error({
          chatId: message.recipient,
          error: data.description,
        }, 'Telegram API error');

        return {
          success: false,
          error: data.description ?? 'Telegram API error',
        };
      }

      logger.info({
        messageId: data.result?.message_id,
        chatId: message.recipient,
      }, 'Telegram message sent successfully');

      return {
        success: true,
        messageId: data.result?.message_id?.toString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, chatId: message.recipient }, 'Failed to send Telegram message');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const telegramChannel = new TelegramChannel();
