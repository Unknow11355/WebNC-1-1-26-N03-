import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';
import { createRoutes } from './routes/index.js';
import { createProductService } from './services/product.service.js';

export function createApp({
  productRepository,
  transactionManager,
  auditRepository,
  cartService,
  authService,
  auditService,
  categoryService,
  inventoryService,
  notificationService,
  orderService,
  posService,
  reportService,
  userService,
  voucherService,
  barcodeService,
  scheduleService,
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
      productService: createProductService({
        repository: productRepository,
        transactionManager,
        auditRepository,
      }),
      cartService,
      authService,
      auditService,
      categoryService,
      inventoryService,
      notificationService,
      orderService,
      posService,
      reportService,
      userService,
      voucherService,
      barcodeService,
      scheduleService,
      requireAuth,
      requireRole,
    }),
  );
  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy API yêu cầu')));
  app.use(errorHandler);
  return app;
}
