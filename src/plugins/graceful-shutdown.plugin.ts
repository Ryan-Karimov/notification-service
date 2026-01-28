import type { FastifyInstance } from 'fastify';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('graceful-shutdown');

export function registerGracefulShutdown(
  app: FastifyInstance,
  cleanup: () => Promise<void>
): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, 'Received shutdown signal');

    const shutdownTimeout = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 30000);

    try {
      logger.info('Closing HTTP server...');
      await app.close();

      logger.info('Running cleanup tasks...');
      await cleanup();

      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimeout);
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
}
