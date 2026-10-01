import { Router } from 'express';
import { createUserController } from '../controllers/user.controller.js';

export function createUserRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createUserController(service);
  router.get('/', requireAuth, requireRole('admin'), controller.list);
  router.get('/:userId', requireAuth, requireRole('admin'), controller.getById);
  router.post('/', requireAuth, requireRole('admin'), controller.create);
  router.patch('/:userId', requireAuth, requireRole('admin'), controller.update);
  router.delete('/:userId', requireAuth, requireRole('admin'), controller.remove);
  return router;
}
