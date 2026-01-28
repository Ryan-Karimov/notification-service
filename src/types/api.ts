import type { FastifyRequest } from 'fastify';
import type { ApiKey } from './database.js';

export interface AuthenticatedRequest extends FastifyRequest {
  apiKey: ApiKey;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
    };
    rabbitmq: {
      status: 'up' | 'down';
      latencyMs?: number;
    };
  };
}
