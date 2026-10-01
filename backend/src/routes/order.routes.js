import { Router } from 'express';
import { createOrderController } from '../controllers/order.controller.js';

export function createOrderRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createOrderController(service);
  router.post('/checkout', requireAuth, requireRole('customer'), controller.checkout);
  router.get('/mine', requireAuth, requireRole('customer'), controller.mine);
  router.get('/', requireAuth, requireRole('employee', 'admin'), controller.all);
  router.get('/:orderId', requireAuth, controller.getById);
  router.post(
    '/:orderId/confirm',
    requireAuth,
    requireRole('employee', 'admin'),
    controller.confirm,
  );
  router.post('/:orderId/reject', requireAuth, requireRole('employee', 'admin'), controller.reject);
  router.post('/:orderId/receive', requireAuth, requireRole('customer'), controller.receive);
  router.post(
    '/:orderId/pay-cash',
    requireAuth,
    requireRole('employee', 'admin'),
    controller.payCash,
  );
  return router;
}
