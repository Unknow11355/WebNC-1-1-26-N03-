// Tầng HTTP: nhận danh tính đã xác thực và tham số route, gọi service.
export function createCartController(service) {
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
