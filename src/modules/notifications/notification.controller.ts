import type { FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from './notification.service.js';
import { deliveryAttemptRepository } from '../../db/repositories/index.js';
import {
  createNotificationSchema,
  createBulkNotificationSchema,
  notificationQuerySchema,
} from './notification.schema.js';

export const notificationController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createNotificationSchema.parse(request.body);
    const notification = await notificationService.create(request.apiKey.id, input);
    return reply.status(201).send(notification);
  },

  async createBulk(request: FastifyRequest, reply: FastifyReply) {
    const input = createBulkNotificationSchema.parse(request.body);
    const notifications = await notificationService.createBulk(request.apiKey.id, input.notifications);
    return reply.status(201).send({
      created: notifications.length,
      notifications,
    });
  },

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const query = notificationQuerySchema.parse(request.query);
    const { data, total } = await notificationService.findAll(request.apiKey.id, query);

    return reply.send({
      data,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + data.length < total,
      },
    });
  },

  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const notification = await notificationService.findById(request.params.id, request.apiKey.id);
    const attempts = await deliveryAttemptRepository.findByNotificationId(notification.id);

    return reply.send({
      ...notification,
      delivery_attempts: attempts,
    });
  },

  async cancel(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const notification = await notificationService.cancel(request.params.id, request.apiKey.id);
    return reply.send(notification);
  },
};
