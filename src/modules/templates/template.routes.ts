import type { FastifyInstance } from 'fastify';
import { templateController } from './template.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware.js';

export async function templateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', rateLimitMiddleware);

  app.post('/', {
    schema: {
      tags: ['Templates'],
      summary: 'Create a new template',
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['code', 'name', 'channel', 'body'],
        properties: {
          code: { type: 'string', minLength: 1, maxLength: 100 },
          name: { type: 'string', minLength: 1, maxLength: 255 },
          channel: { type: 'string', enum: ['email', 'telegram', 'sms'] },
          subject: { type: 'string', maxLength: 500 },
          body: { type: 'string', minLength: 1 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            api_key_id: { type: 'string' },
            code: { type: 'string' },
            name: { type: 'string' },
            channel: { type: 'string' },
            subject: { type: 'string', nullable: true },
            body: { type: 'string' },
            variables: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
      },
    },
  }, templateController.create);

  app.get('/', {
    schema: {
      tags: ['Templates'],
      summary: 'List templates',
      security: [{ apiKey: [] }],
      querystring: {
        type: 'object',
        properties: {
          channel: { type: 'string', enum: ['email', 'telegram', 'sms'] },
          search: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
  }, templateController.findAll);

  app.get('/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Get template by ID',
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, templateController.findById);

  app.put('/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Update template',
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          subject: { type: 'string', maxLength: 500, nullable: true },
          body: { type: 'string', minLength: 1 },
        },
      },
    },
  }, templateController.update);

  app.delete('/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Delete template',
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        204: { type: 'null' },
      },
    },
  }, templateController.delete);

  app.post('/:id/preview', {
    schema: {
      tags: ['Templates'],
      summary: 'Preview template with variables',
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          variables: { type: 'object', additionalProperties: true },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
          },
        },
      },
    },
  }, templateController.preview);
}
