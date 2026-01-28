import type { FastifyInstance } from 'fastify';
import { notificationController } from './notification.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', rateLimitMiddleware);

  app.post('/', {
    schema: {
      tags: ['Notifications'],
      summary: 'Create a new notification',
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['channel', 'recipient'],
        properties: {
          channel: { type: 'string', enum: ['email', 'telegram', 'sms'] },
          recipient: { type: 'string', minLength: 1, maxLength: 500 },
          subject: { type: 'string', maxLength: 500 },
          body: { type: 'string', minLength: 1 },
          templateCode: { type: 'string' },
          templateVariables: { type: 'object', additionalProperties: true },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
          scheduledAt: { type: 'string', format: 'date-time' },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            api_key_id: { type: 'string' },
            template_id: { type: 'string', nullable: true },
            channel: { type: 'string' },
            recipient: { type: 'string' },
            subject: { type: 'string', nullable: true },
            body: { type: 'string' },
            priority: { type: 'string' },
            scheduled_at: { type: 'string', nullable: true },
            status: { type: 'string' },
            attempt_count: { type: 'number' },
            max_attempts: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
      },
    },
  }, notificationController.create);

  app.post('/bulk', {
    schema: {
      tags: ['Notifications'],
      summary: 'Create multiple notifications',
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['notifications'],
        properties: {
          notifications: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              required: ['channel', 'recipient'],
              properties: {
                channel: { type: 'string', enum: ['email', 'telegram', 'sms'] },
                recipient: { type: 'string' },
                subject: { type: 'string' },
                body: { type: 'string' },
                templateCode: { type: 'string' },
                templateVariables: { type: 'object' },
                priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
                scheduledAt: { type: 'string', format: 'date-time' },
                metadata: { type: 'object' },
              },
            },
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            created: { type: 'number' },
            notifications: { type: 'array' },
          },
        },
      },
    },
  }, notificationController.createBulk);

  app.get('/', {
    schema: {
      tags: ['Notifications'],
      summary: 'List notifications',
      security: [{ apiKey: [] }],
      querystring: {
        type: 'object',
        properties: {
          channel: { type: 'string', enum: ['email', 'telegram', 'sms'] },
          status: { type: 'string', enum: ['pending', 'scheduled', 'queued', 'processing', 'sent', 'failed', 'cancelled'] },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
          from: { type: 'string', format: 'date-time' },
          to: { type: 'string', format: 'date-time' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
  }, notificationController.findAll);

  app.get('/:id', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get notification by ID',
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, notificationController.findById);

  app.delete('/:id', {
    schema: {
      tags: ['Notifications'],
      summary: 'Cancel notification',
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, notificationController.cancel);
}
