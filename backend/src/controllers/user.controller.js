export function createUserController(service) {
  if (!service) throw new TypeError('User controller requires service');
  return {
    async list(req, res) {
      res.status(200).json({ success: true, ...(await service.list(req.query)) });
    },
    async getById(req, res) {
      res.status(200).json({ success: true, data: await service.getById(req.params.userId) });
    },
    async create(req, res) {
      res.status(201).json({ success: true, data: await service.create(req.body) });
    },
    async update(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.update(req.params.userId, req.body) });
    },
    async remove(req, res) {
      await service.remove(req.params.userId);
      res.status(204).send();
    },
  };
}
