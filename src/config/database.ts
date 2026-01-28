import { config } from './index.js';

export const databaseConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: config.database.pool.max,
  min: config.database.pool.min,
} as const;
