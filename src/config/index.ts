import dotenv from 'dotenv';

dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

export const config = {
  env: getEnv('NODE_ENV', 'development'),
  isDev: getEnv('NODE_ENV', 'development') === 'development',
  isProd: getEnv('NODE_ENV', 'development') === 'production',

  server: {
    port: getEnvNumber('PORT', 3000),
    host: getEnv('HOST', '0.0.0.0'),
  },

  database: {
    host: getEnv('DATABASE_HOST', 'localhost'),
    port: getEnvNumber('DATABASE_PORT', 5432),
    name: getEnv('DATABASE_NAME', 'notifications'),
    user: getEnv('DATABASE_USER', 'postgres'),
    password: getEnv('DATABASE_PASSWORD', 'postgres'),
    ssl: getEnvBoolean('DATABASE_SSL', false),
    pool: {
      min: getEnvNumber('DATABASE_POOL_MIN', 2),
      max: getEnvNumber('DATABASE_POOL_MAX', 10),
    },
  },

  rabbitmq: {
    url: getEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
    prefetch: getEnvNumber('RABBITMQ_PREFETCH', 10),
  },

  smtp: {
    host: getEnv('SMTP_HOST', ''),
    port: getEnvNumber('SMTP_PORT', 587),
    secure: getEnvBoolean('SMTP_SECURE', false),
    user: getEnv('SMTP_USER', ''),
    password: getEnv('SMTP_PASSWORD', ''),
    from: getEnv('SMTP_FROM', 'noreply@example.com'),
  },

  telegram: {
    botToken: getEnv('TELEGRAM_BOT_TOKEN', ''),
  },

  twilio: {
    accountSid: getEnv('TWILIO_ACCOUNT_SID', ''),
    authToken: getEnv('TWILIO_AUTH_TOKEN', ''),
    fromNumber: getEnv('TWILIO_FROM_NUMBER', ''),
  },

  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
  },

  rateLimit: {
    default: getEnvNumber('DEFAULT_RATE_LIMIT', 100),
    window: getEnvNumber('DEFAULT_RATE_WINDOW', 60000),
  },
} as const;

export type Config = typeof config;
