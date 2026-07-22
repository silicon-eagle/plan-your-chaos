CREATE TABLE "event_attendants" (
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "event_attendants_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "event_attendants" ADD CONSTRAINT "event_attendants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendants" ADD CONSTRAINT "event_attendants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_attendants_user_id_idx" ON "event_attendants" USING btree ("user_id");