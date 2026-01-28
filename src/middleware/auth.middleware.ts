import type { FastifyRequest, FastifyReply } from 'fastify';
import { apiKeyRepository } from '../db/repositories/index.js';
import { UnauthorizedError } from './error-handler.middleware.js';
import type { ApiKey } from '../types/database.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey: ApiKey;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKeyHeader = request.headers['x-api-key'];

  if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
    throw new UnauthorizedError('Missing or invalid X-API-Key header');
  }

  const apiKey = await apiKeyRepository.findByKey(apiKeyHeader);

  if (!apiKey) {
    throw new UnauthorizedError('Invalid API key');
  }

  if (!apiKey.is_active) {
    throw new UnauthorizedError('API key is deactivated');
  }

  request.apiKey = apiKey;
}

export function createAuthHook() {
  return authMiddleware;
}
