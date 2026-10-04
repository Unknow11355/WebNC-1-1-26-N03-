import { Router } from 'express';
import { createPosController } from '../controllers/pos.controller.js';

export function createPosRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createPosController(service);

  router.post('/sales', requireAuth, requireRole('employee', 'admin'), controller.sellCash);

  return router;
}
