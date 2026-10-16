import { REPORT_CACHE_STATUS } from '../services/report.service.js';

export function createReportController(service) {
  if (!service) throw new TypeError('Report controller requires service');
  return {
    async revenue(req, res) {
      res.status(200).json({ success: true, ...(await service.revenue(req.auth, req.query)) });
    },
    async products(req, res) {
      const result = await service.products(req.auth, req.query);
      res.setHeader('X-Report-Cache', result[REPORT_CACHE_STATUS] ?? 'BYPASS');
      res.status(200).json({ success: true, ...result });
    },
    async employees(req, res) {
      res.status(200).json({ success: true, ...(await service.employees(req.auth, req.query)) });
    },
  };
}
