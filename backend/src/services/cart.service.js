import { AppError } from '../errors/app-error.js';

function parseUserId(auth) {
  const userId = Number(auth?.userId);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new AppError(401, 'UNAUTHORIZED', 'Danh tính đăng nhập không hợp lệ');
  }

  return userId;
}

function parseCartId(value) {
  const cartId = Number(value);

  if (!Number.isSafeInteger(cartId) || cartId <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'cart_id không hợp lệ', [
      { field: 'cart_id', issue: 'Phải là số nguyên dương' },
    ]);
  }

  return cartId;
}

export function createCartService({ cartRepository, userRepository }) {
  if (!cartRepository || !userRepository) {
    throw new TypeError('Cart service requires cartRepository and userRepository');
  }

  return {
    async create(auth) {
      const userId = parseUserId(auth);

      const user = await userRepository.findById(userId);
      if (!user || user.status !== 'active') {
        throw new AppError(403, 'FORBIDDEN', 'Tài khoản không được phép thực hiện thao tác này');
      }

      if (user.role_name !== 'customer') {
        throw new AppError(403, 'FORBIDDEN', 'Chỉ khách hàng mới được tạo giỏ hàng');
      }

      const existingCart = await cartRepository.findByUserId(userId);
      if (existingCart) {
        throw new AppError(409, 'CART_ALREADY_EXISTS', 'Tài khoản đã có giỏ hàng');
      }

      return cartRepository.create({ userId });
    },

    async getById(auth, rawCartId) {
      const userId = parseUserId(auth);
      const cartId = parseCartId(rawCartId);

      const cart = await cartRepository.findById(cartId);
      if (!cart) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy giỏ hàng');
      }

      if (Number(cart.user_id) !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập giỏ hàng này');
      }

      return cart;
    },
  };
}
