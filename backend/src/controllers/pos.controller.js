export function createPosController(service) {
  return {
    async sellCash(req, res) {
      const result = await service.sellCash(req.auth, req.get('Idempotency-Key'), req.body);
      res.status(result.replayed ? 200 : 201).json({
        success: true,
        data: result.data,
        meta: { replayed: result.replayed },
      });
    },
  };
}
