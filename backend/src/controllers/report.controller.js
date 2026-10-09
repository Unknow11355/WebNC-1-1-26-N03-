export function createReportController(service) {
  if (!service) throw new TypeError('Report controller requires service');
  return {
    async revenue(req, res) {
      res.status(200).json({ success: true, ...(await service.revenue(req.auth, req.query)) });
    },
    async products(req, res) {
      res.status(200).json({ success: true, ...(await service.products(req.auth, req.query)) });
    },
    async employees(req, res) {
      res.status(200).json({ success: true, ...(await service.employees(req.auth, req.query)) });
    },
  };
}
