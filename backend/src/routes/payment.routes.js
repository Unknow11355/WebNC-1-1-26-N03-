import { Router } from 'express';
import { createPaymentController } from '../controllers/payment.controller.js';

export function createPaymentRoutes({ service, requireAuth }) {
  if (!service || typeof requireAuth !== 'function') {
    throw new TypeError('Payment routes require service and auth middleware');
  }

  const router = Router();
  const controller = createPaymentController(service);

  // Tạo URL thanh toán (Bảo mật cần Token)
  router.post('/vnpay/create', requireAuth, controller.createVnpay);

  // Callback cho Client (Trình duyệt gọi)
  router.get('/vnpay-return', controller.vnpayReturn);

  // IPN Webhook cho Server VNPay gọi (Không cần đăng nhập)
  router.get('/vnpay-ipn', controller.vnpayIpn);

  return router;
}