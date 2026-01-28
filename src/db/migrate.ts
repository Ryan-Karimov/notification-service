import { Kysely, PostgresDialect, Migrator, FileMigrationProvider } from 'kysely';
import pg from 'pg';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { databaseConfig } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('migrator');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const pool = new pg.Pool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.user,
    password: databaseConfig.password,
    ssl: databaseConfig.ssl,
  });

  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({ pool }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const direction = process.argv[2];

  if (direction === 'down') {
    logger.info('Rolling back last migration...');
    const { error, results } = await migrator.migrateDown();

    results?.forEach((it) => {
      if (it.status === 'Success') {
        logger.info(`Migration "${it.migrationName}" rolled back successfully`);
      } else if (it.status === 'Error') {
        logger.error(`Failed to rollback migration "${it.migrationName}"`);
      }
    });

    if (error) {
      logger.error({ error }, 'Migration rollback failed');
      process.exit(1);
    }
  } else {
    logger.info('Running migrations...');
    const { error, results } = await migrator.migrateToLatest();

    results?.forEach((it) => {
      if (it.status === 'Success') {
        logger.info(`Migration "${it.migrationName}" executed successfully`);
      } else if (it.status === 'Error') {
        logger.error(`Failed to execute migration "${it.migrationName}"`);
      }
    });

    if (error) {
      logger.error({ error }, 'Migration failed');
      process.exit(1);
    }
  }

  await db.destroy();
  await pool.end();

  logger.info('Migration completed');
  process.exit(0);
}

migrate();
