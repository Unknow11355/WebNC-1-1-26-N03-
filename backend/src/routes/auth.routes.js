import { Router } from 'express';
import jwt from 'jsonwebtoken';

export function createAuthRoutes() {
  const router = Router();

  router.post('/login', (req, res) => {
    const { email } = req.body;
    // Cấp một accessToken mẫu hợp lệ cho tài khoản test
    const accessToken = jwt.sign(
      { userId: 3, email: email || 'customer.a@mini.local', role: 'customer' },
      process.env.JWT_SECRET || 'super_secret_key_demo',
      { expiresIn: '1h' }
    );
    return res.json({
      success: true,
      data: {
        accessToken,
        user: { email: email || 'customer.a@mini.local', role: 'customer' }
      }
    });
  });

  return router;
}