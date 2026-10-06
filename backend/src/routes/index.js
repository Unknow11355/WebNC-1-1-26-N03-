import { Router } from 'express';
import { createStaffToolsRoutes } from './staff-tools.routes.js';
import { createProductController } from '../controllers/product.controller.js';
import { createAuthRoutes } from './auth.routes.js';
import { createCartRoutes } from './cart.routes.js';
import { createCategoryRoutes } from './category.routes.js';
import { createInventoryRoutes } from './inventory.routes.js';
import { createOrderRoutes } from './order.routes.js';
import { createPosRoutes } from './pos.routes.js';
import { createUserRoutes } from './user.routes.js';
import { createVoucherRoutes } from './voucher.routes.js';

function hasAuth(requireAuth, requireRole) {
  return typeof requireAuth === 'function' && typeof requireRole === 'function';
}

export function createRoutes({
  productService,
  cartService,
  authService,
  categoryService,
  inventoryService,
  orderService,
  posService,
  userService,
  voucherService,
  barcodeService,
  scheduleService,
  requireAuth,
  requireRole,
} = {}) {
  if (!productService) throw new TypeError('Routes require productService');

  const router = Router();
  if (barcodeService && scheduleService && hasAuth(requireAuth, requireRole)) {
    router.use(
      createStaffToolsRoutes({ barcodeService, scheduleService, requireAuth, requireRole }),
    );
  }
  const products = createProductController(productService);

  router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
  router.get('/products', products.list);
  router.get('/products/:productId', products.getById);

  if (authService && hasAuth(requireAuth, requireRole)) {
    router.use('/auth', createAuthRoutes({ service: authService, requireAuth, requireRole }));
  }

  if (userService && hasAuth(requireAuth, requireRole)) {
    router.use('/users', createUserRoutes({ service: userService, requireAuth, requireRole }));
  }

  if (categoryService && hasAuth(requireAuth, requireRole)) {
    router.use(
      '/categories',
      createCategoryRoutes({ service: categoryService, requireAuth, requireRole }),
    );
  }

  if (inventoryService && hasAuth(requireAuth, requireRole)) {
    router.use(
      '/inventory',
      createInventoryRoutes({ service: inventoryService, requireAuth, requireRole }),
    );
  }

  if (cartService && hasAuth(requireAuth, requireRole)) {
    router.use('/carts', createCartRoutes({ service: cartService, requireAuth, requireRole }));
  }

  if (orderService && hasAuth(requireAuth, requireRole)) {
    router.use('/orders', createOrderRoutes({ service: orderService, requireAuth, requireRole }));
  }

  if (posService && hasAuth(requireAuth, requireRole)) {
    router.use('/pos', createPosRoutes({ service: posService, requireAuth, requireRole }));
  }

  if (voucherService && hasAuth(requireAuth, requireRole)) {
    router.use(
      '/vouchers',
      createVoucherRoutes({ service: voucherService, requireAuth, requireRole }),
    );
  }

  if (hasAuth(requireAuth, requireRole)) {
    router.post('/products', requireAuth, requireRole('admin'), products.create);
    router.patch('/products/:productId', requireAuth, requireRole('admin'), products.update);
    router.delete('/products/:productId', requireAuth, requireRole('admin'), products.remove);
  }

  return router;
}
