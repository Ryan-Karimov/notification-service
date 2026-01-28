import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { registerSwagger } from './plugins/swagger.plugin.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { templateRoutes } from './modules/templates/template.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { config } from './config/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  app.addHook('onRequest', async (request) => {
    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
    }, 'Incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });

  app.setErrorHandler(errorHandler);

  await app.register(cors, {
    origin: config.isDev ? true : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-ID'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: config.isProd,
  });

  await registerSwagger(app);

  await app.register(healthRoutes);

  await app.register(async (instance) => {
    await instance.register(templateRoutes, { prefix: '/templates' });
    await instance.register(notificationRoutes, { prefix: '/notifications' });
  }, { prefix: '/api/v1' });

  return app;
}
