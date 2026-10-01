export function createInventoryController(service) {
  return {
    async list(req, res) {
      res.status(200).json({ success: true, ...(await service.list(req.query)) });
    },
    async getById(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.getById(req.params.inventoryItemId) });
    },
    async create(req, res) {
      res.status(201).json({ success: true, data: await service.create(req.body) });
    },
    async update(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.update(req.params.inventoryItemId, req.body) });
    },
    async remove(req, res) {
      await service.remove(req.params.inventoryItemId);
      res.status(204).send();
    },
    async logs(req, res) {
      res.status(200).json({ success: true, ...(await service.listLogs(req.query)) });
    },
    async importStock(req, res) {
      res.status(200).json({ success: true, data: await service.importStock(req.auth, req.body) });
    },
    async exportToShelf(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.exportToShelf(req.auth, req.body) });
    },
    async adjust(req, res) {
      res.status(200).json({ success: true, data: await service.adjust(req.auth, req.body) });
    },
  };
}
