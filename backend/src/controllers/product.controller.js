// Tầng trình diễn HTTP: nhận request, gọi service và trả response.
export function createProductController(service) {
  return {
    async list(req, res) {
      const result = await service.list(req.query);
      res.status(200).json({ success: true, ...result });
    },
  };
}
