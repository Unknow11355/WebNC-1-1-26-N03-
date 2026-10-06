import { Router } from 'express';
import { createStaffToolsController } from '../controllers/staff-tools.controller.js';
export function createStaffToolsRoutes({
  barcodeService,
  scheduleService,
  requireAuth,
  requireRole,
}) {
  const router = Router();
  const c = createStaffToolsController({ barcodeService, scheduleService });
  const guard = [requireAuth, requireRole('admin', 'employee')];
  router.get('/products/scan/:code', ...guard, c.scan);
  router.get('/products/check-code/:code', ...guard, c.check);
  router.post('/products/generate-code', ...guard, c.generate);
  router.get('/employee-schedules/overview/month', ...guard, requireRole('admin'), c.overview);
  router.get('/employee-schedules/employee/:employeeId/month', ...guard, c.month);
  router.put(
    '/employee-schedules/employee/:employeeId/day',
    ...guard,
    requireRole('admin'),
    c.setDay,
  );
  return router;
}
