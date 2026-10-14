import { Router } from 'express';
import { createLoyaltyController } from '../controllers/loyalty.controller.js';

export function createLoyaltyRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createLoyaltyController(service);

  router.get('/me', requireAuth, requireRole('customer'), controller.me);
  router.get('/search', requireAuth, requireRole('employee', 'admin'), controller.search);
  router.get(
    '/:customerId/points/history',
    requireAuth,
    requireRole('customer', 'employee', 'admin'),
    controller.history,
  );
  router.get(
    '/:customerId',
    requireAuth,
    requireRole('customer', 'employee', 'admin'),
    controller.getMember,
  );

  return router;
}
