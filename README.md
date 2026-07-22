# Plan Your Chaos

A household calendar built with Next.js, TypeScript, and PostgreSQL.

## Development

```bash
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

The PostgreSQL data is persisted in the `postgres-data` Docker volume.
Compose creates a separate, non-superuser application login from
`POSTGRES_APP_USER` and `POSTGRES_APP_PASSWORD`. Change the example passwords
before using this setup outside local development.
The application builds its connection URL from the PostgreSQL environment
variables and fails at startup if any are missing. Production environments can
provide `DATABASE_URL` to override the component variables.

## Colour Palette

| Name         | Colour    |
| ------------ | --------- |
| Background   | `#1A1026` |
| Surface      | `#2E1852` |
| Primary      | `#4B2E83` |
| Gold         | `#DEAB15` |
| Yellow       | `#F2C900` |
| Highlight    | `#F5E580` |
| Light Purple | `#D8C7FF` |

## Commands

- `pnpm test` - run unit tests
- `pnpm lint` - run ESLint
- `pnpm build` - create a production build
- `pnpm db:generate` - generate database migrations
- `pnpm db:migrate` - apply database migrations
- `pnpm db:seed` - seed development data
- `pnpm db:studio` - open Drizzle Studio
- `docker compose down` - stop PostgreSQL
- `docker compose down -v` - stop PostgreSQL and delete the database
- `docker compose up -d` - start docker and PostgreSQL
