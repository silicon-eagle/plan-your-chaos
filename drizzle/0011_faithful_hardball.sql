CREATE TABLE "reader_icon_permissions" (
	"user_id" integer NOT NULL,
	"icon_id" integer NOT NULL,
	CONSTRAINT "reader_icon_permissions_user_id_icon_id_pk" PRIMARY KEY("user_id","icon_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reader_all_icons" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reader_icon_permissions" ADD CONSTRAINT "reader_icon_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_icon_permissions" ADD CONSTRAINT "reader_icon_permissions_icon_id_icons_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."icons"("id") ON DELETE cascade ON UPDATE no action;