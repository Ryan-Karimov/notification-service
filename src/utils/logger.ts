import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.logging.level,
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'notification-service',
    env: config.env,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createChildLogger(name: string) {
  return logger.child({ module: name });
}
