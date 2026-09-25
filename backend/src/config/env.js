import 'dotenv/config';

function port(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return value;
}

export const env = {
  port: port('PORT', 3000),
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: port('DB_PORT', 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'mini_supermarket',
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
};
