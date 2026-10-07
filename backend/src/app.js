import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';
import { createRoutes } from './routes/index.js';
import { createProductService } from './services/product.service.js';

export function createApp({
  productRepository,
  cartService,
  authService,
  categoryService,
  inventoryService,
  orderService,
  posService,
  userService,
  voucherService,
  barcodeService,
  scheduleService,
  shiftService,
  requireAuth,
  requireRole,
  corsOrigins = [],
}) {
  if (!productRepository) throw new TypeError('App requires productRepository');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    req.traceId = randomUUID();
    res.setHeader('X-Request-Id', req.traceId);
    next();
  });
  app.use(cors({ origin: corsOrigins, exposedHeaders: ['X-Request-Id'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    '/api/v1',
    createRoutes({
      productService: createProductService(productRepository),
      cartService,
      authService,
      categoryService,
      inventoryService,
      orderService,
      posService,
      userService,
      voucherService,
      barcodeService,
      scheduleService,
      shiftService,
      requireAuth,
      requireRole,
    }),
  );
  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy API yêu cầu')));
  app.use(errorHandler);
  return app;
}
