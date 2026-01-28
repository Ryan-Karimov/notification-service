import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { databaseConfig } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';
import type { Database } from '../types/database.js';

const logger = createChildLogger('database');

const pool = new pg.Pool({
  host: databaseConfig.host,
  port: databaseConfig.port,
  database: databaseConfig.database,
  user: databaseConfig.user,
  password: databaseConfig.password,
  ssl: databaseConfig.ssl,
  max: databaseConfig.max,
  min: databaseConfig.min,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

pool.on('connect', () => {
  logger.debug('New database client connected');
});

const dialect = new PostgresDialect({ pool });

export const db = new Kysely<Database>({
  dialect,
  log(event) {
    if (event.level === 'query') {
      logger.debug({ query: event.query.sql, duration: event.queryDurationMillis }, 'Query executed');
    } else if (event.level === 'error') {
      logger.error({ err: event.error, query: event.query.sql }, 'Query error');
    }
  },
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error({ error }, 'Database connection check failed');
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  logger.info('Closing database connection');
  await db.destroy();
  await pool.end();
}
