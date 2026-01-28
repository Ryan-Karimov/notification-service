import { z } from 'zod';

const channelEnum = z.enum(['email', 'telegram', 'sms']);

export const createTemplateSchema = z.object({
  code: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Code must contain only alphanumeric characters, underscores, and hyphens'),
  name: z.string().min(1).max(255),
  channel: channelEnum,
  subject: z.string().max(500).optional(),
  body: z.string().min(1),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().max(500).optional().nullable(),
  body: z.string().min(1).optional(),
});

export const templateQuerySchema = z.object({
  channel: channelEnum.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const previewTemplateSchema = z.object({
  variables: z.record(z.unknown()).default({}),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TemplateQuery = z.infer<typeof templateQuerySchema>;
export type PreviewTemplateInput = z.infer<typeof previewTemplateSchema>;
