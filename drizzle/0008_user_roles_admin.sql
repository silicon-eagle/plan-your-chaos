CREATE TABLE "seed_initializations" (
	"key" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "user_roles_name_unique" UNIQUE("name"),
	CONSTRAINT "user_roles_fixed" CHECK (("user_roles"."id" = 1 and "user_roles"."name" = 'Admin') or ("user_roles"."id" = 2 and "user_roles"."name" = 'User') or ("user_roles"."id" = 3 and "user_roles"."name" = 'Reader'))
);
--> statement-breakpoint
INSERT INTO "user_roles" ("id", "name") VALUES (1, 'Admin'), (2, 'User'), (3, 'Reader');
--> statement-breakpoint
CREATE FUNCTION prevent_user_role_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'User roles are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER user_roles_immutable
BEFORE UPDATE OR DELETE OR TRUNCATE ON "user_roles"
FOR EACH STATEMENT EXECUTE FUNCTION prevent_user_role_changes();
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_id" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_user_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."user_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "avatar_path";
--> statement-breakpoint
INSERT INTO "users" ("name", "role_id") VALUES ('Tim', 2), ('Veerle', 2)
ON CONFLICT ("name") DO NOTHING;