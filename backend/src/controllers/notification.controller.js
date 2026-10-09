export function createNotificationController(service) {
  if (!service) throw new TypeError('Notification controller requires service');
  return {
    async list(req, res) {
      res.status(200).json({ success: true, ...(await service.list(req.auth, req.query)) });
    },
    async markRead(req, res) {
      res
        .status(200)
        .json({ success: true, data: await service.markRead(req.auth, req.params.id) });
    },
  };
}
