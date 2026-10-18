import { Router } from 'express';
import { createVoucherController } from '../controllers/voucher.controller.js';

export function createVoucherRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createVoucherController(service);
  router.get('/available', requireAuth, requireRole('customer'), controller.available);
  router.get('/mine', requireAuth, requireRole('customer'), controller.mine);
  router.post('/claim', requireAuth, requireRole('customer'), controller.claim);
  router.post('/validate', requireAuth, requireRole('customer'), controller.validate);
  router.get(
    '/customers/:customerId',
    requireAuth,
    requireRole('employee', 'admin'),
    controller.customerList,
  );
  router.get('/', requireAuth, requireRole('admin'), controller.list);
  router.post('/', requireAuth, requireRole('admin'), controller.create);
  router.get('/:voucherId', requireAuth, requireRole('admin'), controller.getById);
  router.patch('/:voucherId', requireAuth, requireRole('admin'), controller.update);
  router.delete('/:voucherId', requireAuth, requireRole('admin'), controller.remove);
  return router;
}
