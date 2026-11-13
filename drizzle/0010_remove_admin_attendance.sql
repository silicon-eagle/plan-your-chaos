DELETE FROM "event_attendants"
WHERE "user_id" IN (
  SELECT "id" FROM "users" WHERE "role_id" = 1
);