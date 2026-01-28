import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('delivery_attempts')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('notification_id', 'uuid', (col) =>
      col.notNull().references('notifications.id').onDelete('cascade')
    )
    .addColumn('attempt_number', 'integer', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.notNull())
    .addColumn('error_message', 'text')
    .addColumn('duration_ms', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_delivery_attempts_notification_id')
    .on('delivery_attempts')
    .column('notification_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('delivery_attempts').execute();
}
