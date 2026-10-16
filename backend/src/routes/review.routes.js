import { Router } from 'express';
import { createReviewController } from '../controllers/review.controller.js';

export function createReviewRoutes({ service, requireAuth, requireRole }) {
  if (!service || typeof requireAuth !== 'function') {
    throw new TypeError('Review routes require service and auth middleware');
  }

  const router = Router();

  // Đã sửa lại cách truyền parameter cho khớp với Controller
  const controller = createReviewController({ reviewService: service });

  // Xem đánh giá (Công khai) - Đã đổi từ list -> getByProduct
  router.get('/products/:productId', controller.getByProduct);

  // Gửi đánh giá mới (Cần đăng nhập)
  router.post('/', requireAuth, controller.create);

  // Xóa đánh giá (Cần đăng nhập) - Đã đổi từ remove -> delete
  router.delete('/:reviewId', requireAuth, controller.delete);

  return router;
}