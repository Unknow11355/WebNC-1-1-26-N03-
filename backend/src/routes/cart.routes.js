import { Router } from 'express';
import { createCartController } from '../controllers/cart.controller.js';

// requireAuth và requireRole được Kiên cung cấp khi tích hợp auth.
// Hợp đồng bắt buộc của middleware là req.auth = { userId, role }.
export function createCartRoutes({ service, requireAuth, requireRole }) {
  if (typeof requireAuth !== 'function' || typeof requireRole !== 'function') {
    throw new TypeError('Cart routes require auth middleware functions');
  }

  const router = Router();
  const controller = createCartController(service);

  router.post('/', requireAuth, requireRole('customer'), controller.create);
  router.get('/:cartId', requireAuth, requireRole('customer'), controller.getById);

  return router;
}
