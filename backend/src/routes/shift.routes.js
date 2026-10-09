import { Router } from 'express';
import { createShiftController } from '../controllers/shift.controller.js';
export function createShiftRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  router.use(requireAuth, requireRole('admin', 'employee'));
  const c = createShiftController(service);
  router.get('/employee/:employeeId/current', c.current);
  router.get('/employee/:employeeId', c.history);
  router.post('/employee/:employeeId/start', c.start);
  router.post('/employee/:employeeId/end', c.end);
  return router;
}
