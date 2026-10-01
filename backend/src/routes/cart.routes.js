import { Router } from 'express';
import { createCartController } from '../controllers/cart.controller.js';

export function createCartRoutes({ service, requireAuth, requireRole }) {
  if (!service || typeof requireAuth !== 'function' || typeof requireRole !== 'function')
    throw new TypeError('Cart routes require service and auth middleware');
  const router = Router();
  const controller = createCartController(service);
  router.get('/', requireAuth, requireRole('customer'), controller.getMine);
  router.post('/', requireAuth, requireRole('customer'), controller.create);
  router.get('/:cartId', requireAuth, requireRole('customer'), controller.getById);
  router.post('/:cartId/items', requireAuth, requireRole('customer'), controller.addItem);
  router.patch(
    '/:cartId/items/:cartItemId',
    requireAuth,
    requireRole('customer'),
    controller.updateItem,
  );
  router.delete(
    '/:cartId/items/:cartItemId',
    requireAuth,
    requireRole('customer'),
    controller.removeItem,
  );
  return router;
}
