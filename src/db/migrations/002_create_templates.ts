import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('templates')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('api_key_id', 'uuid', (col) =>
      col.notNull().references('api_keys.id').onDelete('cascade')
    )
    .addColumn('code', 'varchar(100)', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('channel', 'varchar(20)', (col) => col.notNull())
    .addColumn('subject', 'varchar(500)')
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('variables', sql`text[]`, (col) => col.notNull().defaultTo(sql`'{}'::text[]`))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_templates_api_key_id')
    .on('templates')
    .column('api_key_id')
    .execute();

  await db.schema
    .createIndex('idx_templates_code')
    .on('templates')
    .columns(['api_key_id', 'code'])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('templates').execute();
}
