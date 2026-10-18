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
  jwtSecret: process.env.JWT_SECRET ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .concat(
      process.env.CODESPACE_NAME
        ? [
            `https://${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`,
          ]
        : [],
    ),
  vnpTmnCode: process.env.VNP_TMN_CODE ?? '',
  vnpHashSecret: process.env.VNP_HASH_SECRET ?? '',
  vnpUrl: process.env.VNP_URL ?? '',
  vnpReturnUrl: process.env.VNP_RETURN_URL ?? '',
  vnpIpnUrl: process.env.VNP_IPN_URL ?? '',
};
