export function createVoucherController(service) {
  return {
    async list(req, res) {
      res.status(200).json({ success: true, data: await service.list() });
    },
    async getById(req, res) {
      res.status(200).json({ success: true, data: await service.getById(req.params.voucherId) });
    },
    async create(req, res) {
      res.status(201).json({ success: true, data: await service.create(req.body) });
    },
    async update(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.update(req.params.voucherId, req.body) });
    },
    async remove(req, res) {
      await service.remove(req.params.voucherId);
      res.status(204).send();
    },
    async validate(req, res) {
      res.status(200).json({ success: true, data: await service.validate(req.body) });
    },
  };
}
