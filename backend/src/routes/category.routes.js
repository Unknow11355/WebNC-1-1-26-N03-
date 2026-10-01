import { Router } from 'express';
import { createCategoryController } from '../controllers/category.controller.js';

export function createCategoryRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createCategoryController(service);
  router.get('/', controller.list);
  router.get('/:categoryId', controller.getById);
  router.post('/', requireAuth, requireRole('admin'), controller.create);
  router.patch('/:categoryId', requireAuth, requireRole('admin'), controller.update);
  router.delete('/:categoryId', requireAuth, requireRole('admin'), controller.remove);
  return router;
}
