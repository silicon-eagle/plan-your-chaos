function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = getRequiredEnvironmentVariable("POSTGRES_APP_USER");
  const password = getRequiredEnvironmentVariable("POSTGRES_APP_PASSWORD");
  const host = getRequiredEnvironmentVariable("POSTGRES_HOST");
  const port = getRequiredEnvironmentVariable("POSTGRES_PORT");
  const database = getRequiredEnvironmentVariable("POSTGRES_DB");

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}
