import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "home_journal_limit" numeric DEFAULT 8 NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "archive_batch_size" numeric DEFAULT 5 NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "home_journal_limit";
  ALTER TABLE "site_settings" DROP COLUMN "archive_batch_size";`)
}
