export function createProductController(service) {
  return {
    async list(req, res) {
      res.status(200).json({ success: true, ...(await service.list(req.query)) });
    },
    async getById(req, res) {
      res.status(200).json({ success: true, data: await service.getById(req.params.productId) });
    },
    async create(req, res) {
      res.status(201).json({ success: true, data: await service.create(req.body) });
    },
    async update(req, res) {
      res.status(200).json({
        success: true,
        data: await service.update(req.params.productId, req.body),
      });
    },
    async remove(req, res) {
      await service.softDelete(req.params.productId, { ...req.auth, requestId: req.traceId });
      res.status(204).send();
    },
  };
}
