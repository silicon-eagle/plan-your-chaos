CREATE TABLE "icons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "icon_id" integer;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_icon_id_icons_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."icons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_icon_id_idx" ON "events" USING btree ("icon_id");