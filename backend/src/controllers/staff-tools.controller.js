export function createStaffToolsController({ barcodeService, scheduleService }) {
  const ok = (res, data) => res.json({ success: true, data });
  return {
    scan: async (req, res) => ok(res, await barcodeService.scan(req.params.code)),
    check: async (req, res) => ok(res, await barcodeService.check(req.params.code)),
    generate: async (req, res) => ok(res, await barcodeService.generate(req.body)),
    month: async (req, res) =>
      ok(res, await scheduleService.month(req.auth, req.params.employeeId, req.query)),
    overview: async (req, res) => ok(res, await scheduleService.overview(req.auth, req.query)),
    setDay: async (req, res) =>
      ok(res, await scheduleService.setDay(req.auth, req.params.employeeId, req.body)),
  };
}
