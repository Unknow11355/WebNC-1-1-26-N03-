import { Router } from 'express';
import { createAuditController } from '../controllers/audit.controller.js';

export function createAuditRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createAuditController(service);
  router.get('/', requireAuth, requireRole('admin'), controller.list);
  return router;
}
