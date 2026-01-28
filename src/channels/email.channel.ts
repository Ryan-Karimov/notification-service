import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config/index.js';
import { createChildLogger } from '../utils/logger.js';
import { BaseChannel, type ChannelMessage, type SendResult } from './base.channel.js';

const logger = createChildLogger('email-channel');

export class EmailChannel extends BaseChannel {
  readonly name = 'email' as const;
  private transporter: Transporter | null = null;

  get isConfigured(): boolean {
    return !!(config.smtp.host && config.smtp.user);
  }

  constructor() {
    super();

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.password,
        },
      });

      logger.info('Email channel initialized');
    } else {
      logger.warn('Email channel not configured - SMTP settings missing');
    }
  }

  validateRecipient(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async send(message: ChannelMessage): Promise<SendResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email channel not configured',
      };
    }

    if (!this.validateRecipient(message.recipient)) {
      return {
        success: false,
        error: 'Invalid email address',
      };
    }

    try {
      const result = await this.transporter.sendMail({
        from: config.smtp.from,
        to: message.recipient,
        subject: message.subject ?? 'Notification',
        html: message.body,
        text: message.body.replace(/<[^>]*>/g, ''),
      });

      logger.info({
        messageId: result.messageId,
        recipient: message.recipient,
      }, 'Email sent successfully');

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, recipient: message.recipient }, 'Failed to send email');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const emailChannel = new EmailChannel();
