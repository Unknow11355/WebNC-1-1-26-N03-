export function createReviewController({ reviewService }) {
  return {
    async create(req, res, next) {
      try {
        // Lỗi của bạn nằm ở đây: Phải truyền req.auth để báo cho Service biết ai đang đánh giá
        const result = await reviewService.createReview(req.auth, req.body);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async getByProduct(req, res, next) {
      try {
        const result = await reviewService.getProductReviews(req.params.productId);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async delete(req, res, next) {
      try {
        const result = await reviewService.deleteReview(req.auth, req.params.reviewId);
        res.json(result);
      } catch (err) {
        next(err);
      }
    }
  };
}