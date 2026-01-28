import type { FastifyRequest, FastifyReply } from 'fastify';
import { TooManyRequestsError } from './error-handler.middleware.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('rate-limiter');

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKey = request.apiKey;
  if (!apiKey) {
    return;
  }

  const key = `rate:${apiKey.id}`;
  const now = Date.now();
  const windowMs = apiKey.rate_window;
  const maxRequests = apiKey.rate_limit;

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  } else {
    entry.count++;
  }

  const remaining = Math.max(0, maxRequests - entry.count);
  const resetAt = Math.ceil(entry.resetAt / 1000);

  reply.header('X-RateLimit-Limit', maxRequests);
  reply.header('X-RateLimit-Remaining', remaining);
  reply.header('X-RateLimit-Reset', resetAt);

  if (entry.count > maxRequests) {
    logger.warn({
      apiKeyId: apiKey.id,
      count: entry.count,
      limit: maxRequests,
    }, 'Rate limit exceeded');

    reply.header('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    throw new TooManyRequestsError(
      `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds`
    );
  }
}

export function createRateLimitHook() {
  return rateLimitMiddleware;
}
