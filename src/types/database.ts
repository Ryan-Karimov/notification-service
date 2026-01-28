import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export type NotificationChannel = 'email' | 'telegram' | 'sms';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type NotificationStatus = 'pending' | 'scheduled' | 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type DeliveryAttemptStatus = 'success' | 'failed';

export interface ApiKeyTable {
  id: Generated<string>;
  key: string;
  name: string;
  rate_limit: number;
  rate_window: number;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TemplateTable {
  id: Generated<string>;
  api_key_id: string;
  code: string;
  name: string;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  variables: string[];
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface NotificationTable {
  id: Generated<string>;
  api_key_id: string;
  template_id: string | null;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  priority: NotificationPriority;
  scheduled_at: Date | null;
  status: NotificationStatus;
  attempt_count: Generated<number>;
  max_attempts: number;
  next_retry_at: Date | null;
  sent_at: Date | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DeliveryAttemptTable {
  id: Generated<string>;
  notification_id: string;
  attempt_number: number;
  status: DeliveryAttemptStatus;
  error_message: string | null;
  duration_ms: number;
  created_at: Generated<Date>;
}

export interface Database {
  api_keys: ApiKeyTable;
  templates: TemplateTable;
  notifications: NotificationTable;
  delivery_attempts: DeliveryAttemptTable;
}

export type ApiKey = Selectable<ApiKeyTable>;
export type NewApiKey = Insertable<ApiKeyTable>;
export type ApiKeyUpdate = Updateable<ApiKeyTable>;

export type Template = Selectable<TemplateTable>;
export type NewTemplate = Insertable<TemplateTable>;
export type TemplateUpdate = Updateable<TemplateTable>;

export type Notification = Selectable<NotificationTable>;
export type NewNotification = Insertable<NotificationTable>;
export type NotificationUpdate = Updateable<NotificationTable>;

export type DeliveryAttempt = Selectable<DeliveryAttemptTable>;
export type NewDeliveryAttempt = Insertable<DeliveryAttemptTable>;
