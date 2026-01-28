import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('notifications')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('api_key_id', 'uuid', (col) =>
      col.notNull().references('api_keys.id').onDelete('cascade')
    )
    .addColumn('template_id', 'uuid', (col) =>
      col.references('templates.id').onDelete('set null')
    )
    .addColumn('channel', 'varchar(20)', (col) => col.notNull())
    .addColumn('recipient', 'varchar(500)', (col) => col.notNull())
    .addColumn('subject', 'varchar(500)')
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('priority', 'varchar(20)', (col) => col.notNull().defaultTo('normal'))
    .addColumn('scheduled_at', 'timestamptz')
    .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
    .addColumn('attempt_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('max_attempts', 'integer', (col) => col.notNull().defaultTo(4))
    .addColumn('next_retry_at', 'timestamptz')
    .addColumn('sent_at', 'timestamptz')
    .addColumn('error_message', 'text')
    .addColumn('metadata', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_notifications_api_key_id')
    .on('notifications')
    .column('api_key_id')
    .execute();

  await db.schema
    .createIndex('idx_notifications_status')
    .on('notifications')
    .column('status')
    .execute();

  await db.schema
    .createIndex('idx_notifications_scheduled_at')
    .on('notifications')
    .column('scheduled_at')
    .where('scheduled_at', 'is not', null)
    .execute();

  await db.schema
    .createIndex('idx_notifications_next_retry_at')
    .on('notifications')
    .column('next_retry_at')
    .where('next_retry_at', 'is not', null)
    .execute();

  await db.schema
    .createIndex('idx_notifications_channel_status')
    .on('notifications')
    .columns(['channel', 'status', 'priority'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('notifications').execute();
}
