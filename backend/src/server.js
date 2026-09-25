import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { createProductRepository } from './repositories/product.repository.js';

const app = createApp({
  productRepository: createProductRepository(pool),
  corsOrigins: env.corsOrigins,
});
const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}/api/v1`);
});
server.on('error', async (error) => {
  console.error('HTTP server failed:', error.message);
  await pool.end();
  process.exitCode = 1;
});

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    try {
      await pool.end();
    } finally {
      clearTimeout(timeout);
    }
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
