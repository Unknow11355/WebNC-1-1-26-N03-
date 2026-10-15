import { Router } from 'express';
import { createReviewController } from '../controllers/review.controller.js';

export function createReviewRoutes({ service, requireAuth, requireRole }) {
  if (!service || typeof requireAuth !== 'function') {
    throw new TypeError('Review routes require service and auth middleware');
  }

  const router = Router();
  const controller = createReviewController(service);

  // Xem đánh giá (Công khai)
  router.get('/products/:productId', controller.list);

  // Gửi đánh giá mới (Cần đăng nhập)
  router.post('/', requireAuth, controller.create);

  // Xóa đánh giá (Cần đăng nhập, kiểm tra quyền trong service)
  router.delete('/:reviewId', requireAuth, controller.remove);

  return router;
}