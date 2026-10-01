import { Router } from 'express';
import { createProductController } from '../controllers/product.controller.js';

export function createProductRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createProductController(service);
  router.get('/', controller.list);
  router.get('/:productId', controller.getById);
  router.post('/', requireAuth, requireRole('admin'), controller.create);
  router.patch('/:productId', requireAuth, requireRole('admin'), controller.update);
  router.delete('/:productId', requireAuth, requireRole('admin'), controller.remove);
  return router;
}
