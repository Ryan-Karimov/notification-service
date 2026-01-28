import type { FastifyRequest, FastifyReply } from 'fastify';
import { templateService } from './template.service.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
  previewTemplateSchema,
} from './template.schema.js';

export const templateController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createTemplateSchema.parse(request.body);
    const template = await templateService.create(request.apiKey.id, input);
    return reply.status(201).send(template);
  },

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    const query = templateQuerySchema.parse(request.query);
    const { data, total } = await templateService.findAll(request.apiKey.id, query);

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
    const template = await templateService.findById(request.params.id, request.apiKey.id);
    return reply.send(template);
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const input = updateTemplateSchema.parse(request.body);
    const template = await templateService.update(request.params.id, request.apiKey.id, input);
    return reply.send(template);
  },

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await templateService.delete(request.params.id, request.apiKey.id);
    return reply.status(204).send();
  },

  async preview(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const input = previewTemplateSchema.parse(request.body);
    const result = await templateService.preview(request.params.id, request.apiKey.id, input.variables);
    return reply.send(result);
  },
};
