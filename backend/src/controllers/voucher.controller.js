export function createVoucherController(service) {
  return {
    async list(req, res) {
      res.status(200).json({ success: true, data: await service.list() });
    },
    async available(req, res) {
      res.status(200).json({ success: true, data: await service.available(req.auth) });
    },
    async mine(req, res) {
      res.status(200).json({ success: true, data: await service.mine(req.auth) });
    },
    async customerList(req, res) {
      res.status(200).json({
        success: true,
        data: await service.forCustomer(req.auth, req.params.customerId),
      });
    },
    async claim(req, res) {
      res.status(201).json({ success: true, data: await service.claim(req.auth, req.body) });
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
      res.status(200).json({ success: true, data: await service.validate(req.auth, req.body) });
    },
  };
}
