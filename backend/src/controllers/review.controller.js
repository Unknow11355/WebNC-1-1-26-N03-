export function createReviewController(service) {
  if (!service) throw new TypeError('Review controller requires service');

  return {
    async list(req, res) {
      const productId = req.query.productId || req.params.productId;
      res.status(200).json({ success: true, data: await service.getProductReviews(productId) });
    },
    async create(req, res) {
      // req.user chứa thông tin từ token (middleware requireAuth)
      res.status(201).json({ success: true, data: await service.createReview(req.user, req.body) });
    },
    async remove(req, res) {
      res.status(200).json({ success: true, data: await service.deleteReview(req.user, req.params.reviewId) });
    }
  };
}