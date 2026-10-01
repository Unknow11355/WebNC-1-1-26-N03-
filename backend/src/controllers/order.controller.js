export function createOrderController(service) {
  return {
    async checkout(req, res) {
      res.status(201).json({ success: true, data: await service.checkout(req.auth, req.body) });
    },
    async mine(req, res) {
      res.status(200).json({ success: true, ...(await service.listMine(req.auth, req.query)) });
    },
    async all(req, res) {
      res.status(200).json({ success: true, ...(await service.listAll(req.auth, req.query)) });
    },
    async getById(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.getById(req.auth, req.params.orderId) });
    },
    async confirm(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.confirm(req.auth, req.params.orderId) });
    },
    async reject(req, res) {
      res.status(200).json({
        success: true,
        data: await service.reject(req.auth, req.params.orderId, req.body),
      });
    },
    async receive(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.receive(req.auth, req.params.orderId) });
    },
    async payCash(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.payCash(req.auth, req.params.orderId) });
    },
  };
}
