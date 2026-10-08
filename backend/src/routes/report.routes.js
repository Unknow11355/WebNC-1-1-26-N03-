import { Router } from 'express';
import { createReportController } from '../controllers/report.controller.js';

export function createReportRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createReportController(service);
  const guard = [requireAuth, requireRole('admin')];
  router.get('/revenue', ...guard, controller.revenue);
  router.get('/products', ...guard, controller.products);
  router.get('/employees', ...guard, controller.employees);
  return router;
}
