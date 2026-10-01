export function createCategoryController(service) {
  return {
    async list(req, res) {
      res.status(200).json({ success: true, data: await service.list() });
    },
    async getById(req, res) {
      res.status(200).json({ success: true, data: await service.getById(req.params.categoryId) });
    },
    async create(req, res) {
      res.status(201).json({ success: true, data: await service.create(req.body) });
    },
    async update(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.update(req.params.categoryId, req.body) });
    },
    async remove(req, res) {
      await service.remove(req.params.categoryId);
      res.status(204).send();
    },
  };
}
