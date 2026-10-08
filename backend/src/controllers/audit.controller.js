export function createAuditController(service) {
  if (!service) throw new TypeError('Audit controller requires service');
  return {
    async list(req, res) {
      res.status(200).json({ success: true, ...(await service.list(req.auth, req.query)) });
    },
  };
}
