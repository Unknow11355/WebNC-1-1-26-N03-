import { createApp } from './app.js';
import { createShiftRepository } from './repositories/shift.repository.js';
import { createShiftService } from './services/shift.service.js';
import { createBarcodeRepository } from './repositories/barcode.repository.js';
import { createBarcodeService } from './services/barcode.service.js';
import { createScheduleRepository } from './repositories/schedule.repository.js';
import { createScheduleService } from './services/schedule.service.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { createTransactionManager } from './config/transaction.js';
import { createAuthMiddleware } from './middlewares/auth.middleware.js';
import { createCartRepository } from './repositories/cart.repository.js';
import { createCategoryRepository } from './repositories/category.repository.js';
import { createInventoryRepository } from './repositories/inventory.repository.js';
import { createOrderRepository } from './repositories/order.repository.js';
import { createPosRepository } from './repositories/pos.repository.js';
import { createProductRepository } from './repositories/product.repository.js';
import { createSessionRepository } from './repositories/session.repository.js';
import { createUserRepository } from './repositories/user.repository.js';
import { createVoucherRepository } from './repositories/voucher.repository.js';
import { createAuthService } from './services/auth.service.js';
import { createCartService } from './services/cart.service.js';
import { createCategoryService } from './services/category.service.js';
import { createInventoryService } from './services/inventory.service.js';
import { createOrderService } from './services/order.service.js';
import { createPosService } from './services/pos.service.js';
import { createUserService } from './services/user.service.js';
import { createVoucherService } from './services/voucher.service.js';

if (!env.jwtSecret || env.jwtSecret.length < 16)
  throw new Error('JWT_SECRET is required and must be at least 16 characters');

const transactionManager = createTransactionManager(pool);
const userRepository = createUserRepository(pool);
const sessionRepository = createSessionRepository(pool);
const productRepository = createProductRepository(pool);
const cartRepository = createCartRepository(pool);
const categoryRepository = createCategoryRepository(pool);
const inventoryRepository = createInventoryRepository(pool);
const voucherRepository = createVoucherRepository(pool);
const orderRepository = createOrderRepository(pool);
const posRepository = createPosRepository(pool);

const authService = createAuthService({
  userRepository,
  sessionRepository,
  jwtSecret: env.jwtSecret,
});
const userService = createUserService({ repository: userRepository });
const cartService = createCartService({ cartRepository, userRepository, productRepository });
const categoryService = createCategoryService({ repository: categoryRepository });
const inventoryService = createInventoryService({
  repository: inventoryRepository,
  productRepository,
  transactionManager,
});
const voucherService = createVoucherService(voucherRepository);
const orderService = createOrderService({ orderRepository, voucherRepository, transactionManager });
const posService = createPosService({ repository: posRepository, transactionManager });
const { requireAuth, requireRole } = createAuthMiddleware({
  userRepository,
  sessionRepository,
  jwtSecret: env.jwtSecret,
});

const app = createApp({
  shiftService: createShiftService({ repository: createShiftRepository(pool), transactionManager }),
  barcodeService: createBarcodeService(createBarcodeRepository(pool)),
  scheduleService: createScheduleService(createScheduleRepository(pool)),
  productRepository,
  cartService,
  authService,
  categoryService,
  inventoryService,
  orderService,
  posService,
  userService,
  voucherService,
  requireAuth,
  requireRole,
  corsOrigins: env.corsOrigins,
});

const server = app.listen(env.port, () =>
  console.log(`API listening on http://localhost:${env.port}/api/v1`),
);
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
