INSERT INTO "icons" ("name", "file_name")
SELECT 'Christmas', 'christmas'
WHERE NOT EXISTS (
  SELECT 1
  FROM "icons"
  WHERE "icons"."name" = 'Christmas'
);