import { Router } from 'express';
import { createNotificationController } from '../controllers/notification.controller.js';

export function createNotificationRoutes({ service, requireAuth }) {
  const router = Router();
  const controller = createNotificationController(service);
  router.get('/', requireAuth, controller.list);
  router.patch('/:id/read', requireAuth, controller.markRead);
  return router;
}
