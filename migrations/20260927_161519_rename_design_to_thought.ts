import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Channel rename: 设计 → 思想, plus the new standalone "页面" category.
 *
 * Hand-adjusted from the generated migration: the column is temporarily cast to
 * text, so existing rows must be remapped *before* the new enum type is applied —
 * otherwise the cast fails on the now-unknown value "设计".
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ALTER COLUMN "category" SET DATA TYPE text;
  ALTER TABLE "posts" ALTER COLUMN "category" SET DEFAULT NULL;
  UPDATE "posts" SET "category" = '思想' WHERE "category" = '设计';
  DROP TYPE "public"."enum_posts_category";
  CREATE TYPE "public"."enum_posts_category" AS ENUM('技术', '思想', '生活', '页面');
  ALTER TABLE "posts" ALTER COLUMN "category" SET DATA TYPE "public"."enum_posts_category" USING "category"::"public"."enum_posts_category";
  ALTER TABLE "_posts_v" ALTER COLUMN "version_category" SET DATA TYPE text;
  ALTER TABLE "_posts_v" ALTER COLUMN "version_category" SET DEFAULT NULL;
  UPDATE "_posts_v" SET "version_category" = '思想' WHERE "version_category" = '设计';
  DROP TYPE "public"."enum__posts_v_version_category";
  CREATE TYPE "public"."enum__posts_v_version_category" AS ENUM('技术', '思想', '生活', '页面');
  ALTER TABLE "_posts_v" ALTER COLUMN "version_category" SET DATA TYPE "public"."enum__posts_v_version_category" USING "version_category"::"public"."enum__posts_v_version_category";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ALTER COLUMN "category" SET DATA TYPE text;
  ALTER TABLE "posts" ALTER COLUMN "category" SET DEFAULT NULL;
  UPDATE "posts" SET "category" = '设计' WHERE "category" = '思想';
  UPDATE "posts" SET "category" = '生活' WHERE "category" = '页面';
  DROP TYPE "public"."enum_posts_category";
  CREATE TYPE "public"."enum_posts_category" AS ENUM('技术', '设计', '生活');
  ALTER TABLE "posts" ALTER COLUMN "category" SET DATA TYPE "public"."enum_posts_category" USING "category"::"public"."enum_posts_category";
  ALTER TABLE "_posts_v" ALTER COLUMN "version_category" SET DATA TYPE text;
  ALTER TABLE "_posts_v" ALTER COLUMN "version_category" SET DEFAULT NULL;
  UPDATE "_posts_v" SET "version_category" = '设计' WHERE "version_category" = '思想';
  UPDATE "_posts_v" SET "version_category" = '生活' WHERE "version_category" = '页面';
  DROP TYPE "public"."enum__posts_v_version_category";
  CREATE TYPE "public"."enum__posts_v_version_category" AS ENUM('技术', '设计', '生活');
  ALTER TABLE "_posts_v" ALTER COLUMN "version_category" SET DATA TYPE "public"."enum__posts_v_version_category" USING "version_category"::"public"."enum__posts_v_version_category";`)
}
