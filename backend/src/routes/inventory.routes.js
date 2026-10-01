import { Router } from 'express';
import { createInventoryController } from '../controllers/inventory.controller.js';

export function createInventoryRoutes({ service, requireAuth, requireRole }) {
  const router = Router();
  const controller = createInventoryController(service);
  router.get('/items', requireAuth, requireRole('employee', 'admin'), controller.list);
  router.get(
    '/items/:inventoryItemId',
    requireAuth,
    requireRole('employee', 'admin'),
    controller.getById,
  );
  router.post('/items', requireAuth, requireRole('admin'), controller.create);
  router.patch('/items/:inventoryItemId', requireAuth, requireRole('admin'), controller.update);
  router.delete('/items/:inventoryItemId', requireAuth, requireRole('admin'), controller.remove);
  router.get('/logs', requireAuth, requireRole('employee', 'admin'), controller.logs);
  router.post('/imports', requireAuth, requireRole('employee', 'admin'), controller.importStock);
  router.post('/exports', requireAuth, requireRole('employee', 'admin'), controller.exportToShelf);
  router.post('/adjustments', requireAuth, requireRole('employee', 'admin'), controller.adjust);
  return router;
}
