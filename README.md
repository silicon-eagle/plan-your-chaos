# Plan Your Chaos

A household calendar built with Next.js, TypeScript, and PostgreSQL.

## Docker deployment

Install Docker with the Compose plugin on the host, then clone the repository
and create the environment file:

```bash
cp .env.example .env
```

Before deployment, replace both example passwords in `.env` with strong,
independent values. You can also add `APP_PORT` to change the host port from its
default of `3000`.

Build and start the complete stack:

```bash
docker compose up --build -d
```

This starts three services in order:

1. `postgres` starts PostgreSQL and waits until it is healthy.
2. `migrate` applies all Drizzle migrations and idempotently seeds the initial
   users and event icons.
3. `app` starts the production Next.js standalone server after initialization
   succeeds.

The application is available at `http://localhost:3000`, or at the port set by
`APP_PORT`. Check the deployment with:

```bash
docker compose ps
docker compose logs -f app
```

To deploy a newer version, pull the changes and recreate the images and
containers:

```bash
git pull
docker compose up --build -d
```

The PostgreSQL data persists in the `postgres-data` Docker volume across
container replacements. `docker compose down` stops and removes the containers
without deleting that data. Do not use `docker compose down -v` unless you
intend to permanently delete the database.

For an internet-facing deployment, place a reverse proxy with HTTPS in front of
the app, restrict access to the PostgreSQL host port, and keep `.env` out of
version control.

## Development

To run Next.js on the host while keeping PostgreSQL in Docker:

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:seed
pnpm dev
```

Compose creates a separate, non-superuser application login from
`POSTGRES_APP_USER` and `POSTGRES_APP_PASSWORD`. The application builds its
connection URL from the PostgreSQL environment variables and fails at startup
if any are missing. Environments outside Compose can provide `DATABASE_URL` to
override the component variables.

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
- `docker compose up --build` - build and start the app and PostgreSQL
- `docker compose down` - stop the app and PostgreSQL
- `docker compose down -v` - stop all services and delete the database
