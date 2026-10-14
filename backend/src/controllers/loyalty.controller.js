export function createLoyaltyController(service) {
  if (!service) throw new TypeError('Loyalty controller requires service');

  return {
    async me(req, res) {
      res.status(200).json({ success: true, data: await service.me(req.auth) });
    },

    async search(req, res) {
      res.status(200).json({ success: true, ...(await service.search(req.auth, req.query)) });
    },

    async getMember(req, res) {
      res.status(200).json({
        success: true,
        data: await service.getMember(req.auth, req.params.customerId),
      });
    },

    async history(req, res) {
      res.status(200).json({
        success: true,
        ...(await service.history(req.auth, req.params.customerId, req.query)),
      });
    },
  };
}
