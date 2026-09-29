// Controller chỉ lấy identity đã xác thực và params HTTP rồi gọi service.
export function createCartController(service) {
  if (!service) throw new TypeError('Cart controller requires service');

  return {
    async create(req, res) {
      const data = await service.create(req.auth);
      res.status(201).json({ success: true, data });
    },

    async getById(req, res) {
      const data = await service.getById(req.auth, req.params.cartId);
      res.status(200).json({ success: true, data });
    },
  };
}
