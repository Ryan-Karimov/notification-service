import type { FastifyInstance } from 'fastify';
import { checkDatabaseConnection } from '../../db/connection.js';
import { checkRabbitMQConnection } from '../../queue/connection.js';
import type { HealthStatus } from '../../types/api.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Full health check',
      description: 'Check the health of all services (database and RabbitMQ)',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['up', 'down'] },
                    latencyMs: { type: 'number' },
                  },
                },
                rabbitmq: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['up', 'down'] },
                    latencyMs: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const dbStart = Date.now();
    const dbHealthy = await checkDatabaseConnection();
    const dbLatency = Date.now() - dbStart;

    const mqStart = Date.now();
    const mqHealthy = await checkRabbitMQConnection();
    const mqLatency = Date.now() - mqStart;

    const status: HealthStatus = {
      status: dbHealthy && mqHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealthy ? 'up' : 'down',
          latencyMs: dbLatency,
        },
        rabbitmq: {
          status: mqHealthy ? 'up' : 'down',
          latencyMs: mqLatency,
        },
      },
    };

    const statusCode = status.status === 'healthy' ? 200 : 503;
    return reply.status(statusCode).send(status);
  });

  app.get('/health/live', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness probe',
      description: 'Simple liveness check for Kubernetes',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return { status: 'ok' };
  });

  app.get('/health/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness probe',
      description: 'Check if the service is ready to accept traffic',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const dbHealthy = await checkDatabaseConnection();
    const mqHealthy = await checkRabbitMQConnection();

    if (dbHealthy && mqHealthy) {
      return { status: 'ready' };
    }

    const reasons: string[] = [];
    if (!dbHealthy) reasons.push('database');
    if (!mqHealthy) reasons.push('rabbitmq');

    return reply.status(503).send({
      status: 'not ready',
      reason: `Unhealthy services: ${reasons.join(', ')}`,
    });
  });
}
