import { z } from 'zod';

const channelEnum = z.enum(['email', 'telegram', 'sms']);
const priorityEnum = z.enum(['low', 'normal', 'high', 'critical']);
const statusEnum = z.enum(['pending', 'scheduled', 'queued', 'processing', 'sent', 'failed', 'cancelled']);

export const createNotificationSchema = z.object({
  channel: channelEnum,
  recipient: z.string().min(1).max(500),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).optional(),
  templateCode: z.string().optional(),
  templateVariables: z.record(z.unknown()).optional(),
  priority: priorityEnum.default('normal'),
  scheduledAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.body || data.templateCode,
  { message: 'Either body or templateCode must be provided' }
);

export const createBulkNotificationSchema = z.object({
  notifications: z.array(createNotificationSchema).min(1).max(100),
});

export const notificationQuerySchema = z.object({
  channel: channelEnum.optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type CreateBulkNotificationInput = z.infer<typeof createBulkNotificationSchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
