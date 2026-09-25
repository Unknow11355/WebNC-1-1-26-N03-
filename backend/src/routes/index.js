import { Router } from 'express';
import { createProductController } from '../controllers/product.controller.js';

export function createRoutes(productService) {
  const router = Router();
  const products = createProductController(productService);
  // Liveness: xác nhận HTTP server đang chạy, không xác nhận kết nối DB.
  router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
  // Danh sách sản phẩm là API công khai theo ma trận Buổi 3.
  router.get('/products', products.list);
  return router;
}
