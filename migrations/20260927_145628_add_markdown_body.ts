import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "body_markdown" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_body_markdown" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP COLUMN "body_markdown";
  ALTER TABLE "_posts_v" DROP COLUMN "version_body_markdown";`)
}
