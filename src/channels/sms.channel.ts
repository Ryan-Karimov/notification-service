import twilio from 'twilio';
import type { Twilio } from 'twilio';
import { config } from '../config/index.js';
import { createChildLogger } from '../utils/logger.js';
import { BaseChannel, type ChannelMessage, type SendResult } from './base.channel.js';

const logger = createChildLogger('sms-channel');

export class SmsChannel extends BaseChannel {
  readonly name = 'sms' as const;
  private client: Twilio | null = null;
  private fromNumber: string;

  get isConfigured(): boolean {
    return !!(config.twilio.accountSid && config.twilio.authToken && config.twilio.fromNumber);
  }

  constructor() {
    super();
    this.fromNumber = config.twilio.fromNumber;

    if (this.isConfigured) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      logger.info('SMS channel initialized');
    } else {
      logger.warn('SMS channel not configured - Twilio credentials missing');
    }
  }

  validateRecipient(phoneNumber: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }

  async send(message: ChannelMessage): Promise<SendResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'SMS channel not configured',
      };
    }

    if (!this.validateRecipient(message.recipient)) {
      return {
        success: false,
        error: 'Invalid phone number',
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message.body,
        from: this.fromNumber,
        to: message.recipient,
      });

      logger.info({
        messageSid: result.sid,
        recipient: message.recipient,
        status: result.status,
      }, 'SMS sent successfully');

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, recipient: message.recipient }, 'Failed to send SMS');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const smsChannel = new SmsChannel();
