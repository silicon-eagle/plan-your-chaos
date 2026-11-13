ALTER TABLE "users" DROP CONSTRAINT "users_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_name_case_insensitive_unique" ON "users" USING btree (lower("name"));