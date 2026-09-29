import { Router } from 'express';
import { createCartController } from '../controllers/cart.controller.js';

export function createCartRoutes({ service, requireAuth, requireRole }) {
  if (!service) throw new TypeError('Cart routes require service');
  if (typeof requireAuth !== 'function' || typeof requireRole !== 'function') {
    throw new TypeError('Cart routes require auth middleware functions');
  }

  const router = Router();
  const controller = createCartController(service);

  router.post('/', requireAuth, requireRole('customer'), controller.create);
  router.get('/:cartId', requireAuth, requireRole('customer'), controller.getById);

  return router;
}
