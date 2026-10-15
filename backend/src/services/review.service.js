import { AppError } from '../errors/app-error.js';

// Hàm lọc mã độc XSS đơn giản (biến thẻ <script> thành chữ thường không nguy hiểm)
function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createReviewService({ reviewRepository }) {
  if (!reviewRepository) throw new TypeError('Review service requires reviewRepository');

  return {
    async getProductReviews(productId) {
      if (!productId) throw new AppError(400, 'VALIDATION_ERROR', 'Thiếu product_id');
      return await reviewRepository.findByProductId(productId);
    },

    async createReview(user, input) {
      if (user.role_name !== 'customer') {
        throw new AppError(403, 'FORBIDDEN', 'Chỉ khách hàng mới được đánh giá sản phẩm');
      }

      const productId = Number(input.product_id || input.productId);
      const rating = Number(input.rating);
      let comment = String(input.comment || '').trim();

      if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Vui lòng nhập ID sản phẩm và số sao từ 1 đến 5');
      }
      if (!comment) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Nội dung đánh giá không được để trống');
      }

      // Lọc XSS an toàn
      comment = escapeHTML(comment);

      // 1. Kiểm tra khách đã mua và nhận hàng chưa?
      const orderItem = await reviewRepository.checkCompletedOrderItem(user.user_id, productId);
      if (!orderItem) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn chỉ được đánh giá sản phẩm đã mua và được giao thành công');
      }

      // 2. Chống đánh giá trùng
      const isDuplicated = await reviewRepository.checkDuplicateReview(user.user_id, productId);
      if (isDuplicated) {
        throw new AppError(409, 'CONFLICT', 'Bạn đã đánh giá sản phẩm này rồi');
      }

      // 3. Lưu vào database
      const reviewId = await reviewRepository.createReview({
        userId: user.user_id,
        productId,
        orderId: orderItem.order_id,
        orderItemId: orderItem.order_item_id,
        rating,
        comment
      });

      return { review_id: reviewId, rating, comment, message: 'Đã gửi đánh giá thành công' };
    },

    async deleteReview(user, reviewId) {
      const review = await reviewRepository.findById(reviewId);
      if (!review) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá');

      // Khách A không được xóa đánh giá khách B. Admin thì được phép xóa mọi đánh giá.
      if (user.role_name !== 'admin' && review.user_id !== user.user_id) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xóa đánh giá của người khác');
      }

      await reviewRepository.deleteReview(reviewId);
      return { deleted: true };
    }
  };
}