export function createShiftController(service) {
  return {
    current: async (req, res) =>
      res.json({ success: true, data: await service.current(req.auth, req.params.employeeId) }),
    history: async (req, res) =>
      res.json({
        success: true,
        data: await service.history(req.auth, req.params.employeeId, req.query),
      }),
    start: async (req, res) =>
      res.status(201).json({
        success: true,
        data: await service.change(req.auth, req.params.employeeId, 'start', req.body),
      }),
    end: async (req, res) =>
      res.json({
        success: true,
        data: await service.change(req.auth, req.params.employeeId, 'end', req.body),
      }),
  };
}
