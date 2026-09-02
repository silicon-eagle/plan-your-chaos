<p align="center">
  <img
    src="public/images/logoREADME.png"
    alt="Plan Your Chaos"
  >
</p>

# Plan Your Chaos

A household calendar built with Next.js, TypeScript, and PostgreSQL.

## Authentication

Plan Your Chaos uses password-plus-TOTP authentication managed entirely by an
administrator. There is no self-service account recovery, password-reset email,
or in-app registration.

For a complete explanation of the login state machine, TOTP enrollment,
sessions, route protection, Server Action authorization, and API
authentication, see [`docs/authentication.md`](docs/authentication.md).

### Generate an encryption key

TOTP secrets are stored encrypted. Generate a key before first deployment:

```bash
openssl rand -base64 32
```

Set the result as `TOTP_ENCRYPTION_KEY` in `.env`. Store it securely. If the
key is lost or replaced, all enrolled TOTP secrets become unreadable and every
user must re-enroll.

### First rollout

After deploying a fresh database, no user can log in — there are no temporary
passwords yet. Issue one for each household member before announcing the
deployment:

```bash
# Local development
pnpm auth:admin issue-password --user Tim

# Production (via Compose)
docker compose run --rm migrate \
  pnpm auth:admin issue-password --user Tim
```

The temporary password is printed once and never shown again. Share it with the
user over a trusted channel and destroy your copy immediately.

On first login the user must replace the temporary password and enroll TOTP.
Existing users cannot log in until an administrator issues a temporary password
for them.

### Admin commands

| Command | Effect |
| ------- | ------ |
| `pnpm auth:admin issue-password --user <name>` | Sets a new temporary password, marks it must-change, revokes all active sessions, and prints the password once. |
| `pnpm auth:admin reset-totp --user <name>` | Clears the stored TOTP secret, revokes all active sessions. The user's password is unchanged. |
| `pnpm auth:admin cleanup` | Deletes expired and revoked sessions and consumed login challenges. |

Run production commands through the `migrate` service so they share the same
database credentials and network:

```bash
docker compose run --rm migrate \
  pnpm auth:admin issue-password --user Tim

docker compose run --rm migrate \
  pnpm auth:admin reset-totp --user Tim
```

> **Important:** Do not run admin commands against a non-disposable database
> from shell history that could expose credentials. Prefer the Compose approach
> above, which inherits credentials from the environment file without
> interactive input.

### Reset effects

- **issue-password**: revokes all active sessions; user must log in with the
  new temporary password, set a new permanent password, and re-enroll TOTP if
  not already enrolled.
- **reset-totp**: revokes all active sessions; the user must log in with their
  existing password, then re-enroll TOTP. The password is not changed.
- There is no in-app recovery path. A user who loses their TOTP device must
  contact an administrator who runs `reset-totp`.

### Session expiry

Sessions expire automatically:

- **Idle timeout**: 24 hours since last activity. Each page visit extends the
  idle clock.
- **Absolute maximum**: 7 days from login, regardless of activity.

A session that reaches either limit is deleted. The user is redirected to the
login page on their next request.

### Account lockout

After **five** consecutive failed login attempts (wrong password or wrong TOTP
code), the account is locked for **15 minutes**. The lockout clears
automatically; no administrator action is required.



Install Docker with the Compose plugin on the host, then clone the repository
and create the environment file:

```bash
cp .env.example .env
```

Before deployment, replace both example passwords in `.env` with strong,
independent values. Generate a `TOTP_ENCRYPTION_KEY` with
`openssl rand -base64 32` and set it in `.env`. You can also add `APP_PORT` to
change the host port from its default of `3000`.

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

Application and database date-times use `Europe/Amsterdam`, including automatic
CET and CEST daylight-saving transitions.

For an internet-facing deployment, place a reverse proxy with HTTPS in front of
the app, restrict access to the PostgreSQL host port, and keep `.env` out of
version control.

## CI/CD

This repository uses Forgejo Actions to validate, build, publish, and deploy Plan Your Chaos automatically.

The workflow is defined in:

```text
.forgejo/workflows/ci-cd.yml
```

### Pipeline overview

For pull requests targeting `main`, the workflow runs validation only:

1. Installs dependencies with pnpm
2. Runs ESLint
3. Runs the TypeScript compiler
4. Runs the test suite
5. Builds the Next.js application

Pull requests do not publish images or update the production deployment.

After a commit is pushed or merged into `main`, the workflow:

1. Repeats validation
2. Builds the production application image
3. Builds the database migration image
4. Pushes both images to the Forgejo container registry
5. Connects to `erebor` over SSH
6. Pulls the new images
7. Starts PostgreSQL
8. Runs database migrations and seed logic
9. Recreates the application container
10. Waits for the application health check to pass
11. Removes unused Docker images

### Published images

The application image is built from the `runner` Dockerfile target:

```text
forgejo.arda:3000/tkelch/plan-your-chaos:latest
forgejo.arda:3000/tkelch/plan-your-chaos:<commit-sha>
```

The migration image is built from the `database-tools` target:

```text
forgejo.arda:3000/tkelch/plan-your-chaos:migrations-latest
forgejo.arda:3000/tkelch/plan-your-chaos:migrations-<commit-sha>
```

The `latest` tags are used for automatic deployment. The commit-SHA tags provide immutable images that can be used for rollback.

### Runner

The workflow runs on the Forgejo-wide runner hosted on `erebor`.

The workflow jobs use the following runner label:

```text
node-22
```

The job container contains Node.js 22. The Docker CLI is installed during the image-build job and connects to the separate Docker-in-Docker daemon configured for the Forgejo runner.

### Required repository secrets

The following secrets must be configured under:

```text
Repository Settings
→ Actions
→ Secrets
```

| Secret              | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `REGISTRY_USERNAME` | Forgejo username used to publish container images  |
| `REGISTRY_TOKEN`    | Forgejo access token with package write permission |
| `DEPLOY_HOST`       | IP address or hostname of `erebor`                 |
| `DEPLOY_USER`       | SSH deployment user, normally `deploy`             |
| `DEPLOY_SSH_KEY`    | Private SSH key used by the workflow               |
| `DEPLOY_PATH`       | Production Compose directory on `erebor`           |
| `TOTP_ENCRYPTION_KEY` | 32-byte AES key encoded as base64 (see [Authentication](#authentication)) |

The current deployment path is:

```text
/mnt/hoard/services/plan-your-chaos
```

### Production deployment

The production deployment is managed by Docker Compose on `erebor`.

The production directory contains:

```text
/mnt/hoard/services/plan-your-chaos/
├── docker-compose.yml
├── .env
└── init-app-user.sh
```

The Compose project contains three services:

| Service    | Purpose                                 |
| ---------- | --------------------------------------- |
| `postgres` | PostgreSQL database                     |
| `migrate`  | Runs database migrations and seed logic |
| `app`      | Runs the production Next.js application |

The application is exposed on:

```text
http://erebor:3001
```

Nginx Proxy Manager routes the local application domain to this port.

### Manual deployment

A deployment can be run manually on `erebor` with:

```bash
cd /mnt/hoard/services/plan-your-chaos

docker compose pull app migrate
docker compose up -d postgres
docker compose run --rm migrate
docker compose up -d --no-deps --force-recreate app
```

Check the deployment:

```bash
docker compose ps --all
```

View application logs:

```bash
docker compose logs -f app
```

View migration logs:

```bash
docker compose logs migrate
```

### Rollback

Every successful build publishes an image tagged with its Git commit SHA.

To roll back, replace the application image in the production Compose file with a known-good SHA tag:

```yaml
image: forgejo.arda:3000/tkelch/plan-your-chaos:<commit-sha>
```

The migration image can be pinned in the same way:

```yaml
image: forgejo.arda:3000/tkelch/plan-your-chaos:migrations-<commit-sha>
```

Then redeploy:

```bash
docker compose pull app migrate
docker compose run --rm migrate
docker compose up -d --no-deps --force-recreate app
```

Application rollback does not automatically reverse database migrations. Database compatibility must be checked before deploying an older application image.

## Development

To run Next.js on the host while keeping PostgreSQL in Docker:

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:seed
pnpm dev
```

Stop the database container without deleting its data:

```bash
docker compose stop postgres
```

To permanently delete the development database and its Docker volume:

```bash
docker compose down -v
```

Compose creates a separate, non-superuser application login from
`POSTGRES_APP_USER` and `POSTGRES_APP_PASSWORD`. The application builds its
connection URL from the PostgreSQL environment variables and fails at startup
if any are missing. Environments outside Compose can provide `DATABASE_URL` to
override the component variables.

## Colour Palette

| Name           | Colour    |
| -------------- | --------- |
| Background     | `#1A1026` |
| Surface        | `#2E1852` |
| Primary        | `#4B2E83` |
| Gold           | `#DEAB15` |
| Yellow         | `#F2C900` |
| Highlight      | `#F5E580` |
| Light Purple   | `#D8C7FF` |
| Dark Teal      | `#216B6A` |
| Teal           | `#3FA7A3` |
| Highlight Teal | `#82D8D2` |
| Dark Pink      | `#A84F68` |
| Pink           | `#E58AA4` |
| Highlight Pink | `#F6C1D0` |

## Commands

- `pnpm test` - run unit tests
- `pnpm lint` - run ESLint
- `pnpm build` - create a production build
- `pnpm db:generate` - generate database migrations
- `pnpm db:migrate` - apply database migrations
- `pnpm db:seed` - seed development data
- `pnpm db:studio` - open Drizzle Studio
- `pnpm auth:admin issue-password --user <name>` - issue a temporary password (printed once)
- `pnpm auth:admin reset-totp --user <name>` - reset TOTP and revoke sessions
- `pnpm auth:admin cleanup` - delete expired sessions and consumed challenges
- `docker compose up --build` - build and start the app and PostgreSQL
- `docker compose up -d postgres` - start only PostgreSQL
- `docker compose stop postgres` - stop PostgreSQL without deleting its data
- `docker compose down` - stop the app and PostgreSQL
- `docker compose down -v` - stop all services and delete the database
