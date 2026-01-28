import { buildApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectToRabbitMQ, closeRabbitMQConnection } from './queue/connection.js';
import { closeDatabaseConnection } from './db/connection.js';
import { registerGracefulShutdown } from './plugins/graceful-shutdown.plugin.js';

async function main() {
  try {
    logger.info('Starting notification service...');

    await connectToRabbitMQ();
    logger.info('Connected to RabbitMQ');

    const app = await buildApp();

    registerGracefulShutdown(app, async () => {
      logger.info('Shutting down...');
      await closeRabbitMQConnection();
      await closeDatabaseConnection();
    });

    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info({
      port: config.server.port,
      host: config.server.host,
    }, 'Server started');

    logger.info(`Swagger documentation available at http://${config.server.host}:${config.server.port}/docs`);
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

main();
