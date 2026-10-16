import { AppError } from '../errors/app-error.js';

export function createReviewService({ reviewRepository }) {
  return {
    async createReview(auth, data) {
      // Bắt chính xác ID của người dùng đang đăng nhập
      const userId = auth?.userId || auth?.user_id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');

      const productId = Number(data.product_id);
      const rating = Number(data.rating);

      if (!productId || !rating || rating < 1 || rating > 5) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu đánh giá không hợp lệ');
      }

      // Kiểm tra xem người dùng đã đánh giá chưa (chống spam)
      const isDuplicate = await reviewRepository.checkDuplicate(productId, userId);
      if (isDuplicate) {
        throw new AppError(409, 'CONFLICT', 'Bạn đã đánh giá sản phẩm này rồi');
      }

      // Bộ lọc cơ bản chống XSS
      const cleanComment = data.comment ? String(data.comment).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

      const result = await reviewRepository.create({
        product_id: productId,
        user_id: userId,
        rating: rating,
        comment: cleanComment
      });

      return result;
    },

    async getProductReviews(productId) {
      return reviewRepository.getByProduct(Number(productId));
    },

    async deleteReview(auth, reviewId) {
      const userId = auth?.userId || auth?.user_id;
      const review = await reviewRepository.findById(Number(reviewId));

      if (!review) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá');

      if (auth.role !== 'admin' && review.user_id !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xóa đánh giá này');
      }

      await reviewRepository.delete(Number(reviewId));
      return { success: true };
    }
  };
}