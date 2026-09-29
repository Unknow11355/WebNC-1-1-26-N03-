import { Router } from 'express';
import { createProductController } from '../controllers/product.controller.js';
import { createAuthRoutes } from './auth.routes.js';
import { createCartRoutes } from './cart.routes.js';

export function createRoutes({ productService, cartService, requireAuth, requireRole } = {}) {
  if (!productService) throw new TypeError('Routes require productService');

  const hasCartConfig =
    cartService !== undefined || requireAuth !== undefined || requireRole !== undefined;

  if (
    hasCartConfig &&
    (!cartService || typeof requireAuth !== 'function' || typeof requireRole !== 'function')
  ) {
    throw new TypeError('Routes require complete cart auth configuration');
  }

  const router = Router();
  const products = createProductController(productService);

  router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
  router.get('/products', products.list);

  // Auth route thuộc phần của Kiên, không thay thế ở đây.
  router.use('/auth', createAuthRoutes());

  // Cho phép app/test cũ chỉ khởi tạo productService.
  // Khi server cung cấp đủ dependency V3 thì mới gắn /carts.
  if (hasCartConfig) {
    router.use('/carts', createCartRoutes({ service: cartService, requireAuth, requireRole }));
  }

  return router;
}
