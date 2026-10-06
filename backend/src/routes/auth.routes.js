import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';

export function createAuthRoutes({ service, requireAuth, requireRole }) {
  if (!service || typeof requireAuth !== 'function' || typeof requireRole !== 'function') {
    throw new TypeError('Auth routes require service and auth middleware');
  }

  const router = Router();
  const controller = createAuthController(service);
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/logout', requireAuth, controller.logout);
  router.get('/me', requireAuth, controller.me);
  router.patch('/me', requireAuth, controller.updateMe);
  router.get('/users', requireAuth, requireRole('admin'), controller.listUsers);
  return router;
}
