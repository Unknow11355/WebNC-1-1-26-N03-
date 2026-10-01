export function createCartController(service) {
  if (!service) throw new TypeError('Cart controller requires service');
  return {
    async create(req, res) {
      res.status(201).json({ success: true, data: await service.create(req.auth) });
    },
    async getById(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.getById(req.auth, req.params.cartId) });
    },
    async getMine(req, res) {
      res.status(200).json({ success: true, data: await service.getMine(req.auth) });
    },
    async addItem(req, res) {
      res.status(200).json({
        success: true,
        data: await service.addItem(req.auth, req.params.cartId, req.body),
      });
    },
    async updateItem(req, res) {
      res.status(200).json({
        success: true,
        data: await service.updateItem(
          req.auth,
          req.params.cartId,
          req.params.cartItemId,
          req.body,
        ),
      });
    },
    async removeItem(req, res) {
      res.status(200).json({
        success: true,
        data: await service.removeItem(req.auth, req.params.cartId, req.params.cartItemId),
      });
    },
  };
}
