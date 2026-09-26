import { Router } from 'express';
import { createProductController } from '../controllers/product.controller.js';
import { createAuthRoutes } from './auth.routes.js'; // Thêm dòng này

export function createRoutes(productService) {
  const router = Router();
  const products = createProductController(productService);

  router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
  router.get('/products', products.list);

  // Gắn đường dẫn đăng nhập
  router.use('/auth', createAuthRoutes());

  return router;
}