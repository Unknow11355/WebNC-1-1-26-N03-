import { AppError } from '../errors/app-error.js';

function positiveInteger(value, field) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return n;
}

export function createCartService({ cartRepository, userRepository, productRepository = null }) {
  if (!cartRepository || !userRepository)
    throw new TypeError('Cart service requires cartRepository and userRepository');

  async function customerId(auth) {
    const id = positiveInteger(auth?.userId, 'user_id');
    const user = await userRepository.findById(id);
    if (!user || user.status !== 'active' || user.role_name !== 'customer')
      throw new AppError(403, 'FORBIDDEN', 'Chỉ khách hàng hoạt động mới được quản lý giỏ hàng');
    return id;
  }

  async function ownedCart(auth, rawCartId) {
    const id = positiveInteger(rawCartId, 'cart_id');
    const userId = await customerId(auth);
    const cart = await cartRepository.findById(id);
    if (!cart) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy giỏ hàng');
    if (Number(cart.user_id) !== userId)
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập giỏ hàng này');
    return cart;
  }

  return {
    async create(auth) {
      const userId = await customerId(auth);
      if (await cartRepository.findByUserId(userId))
        throw new AppError(409, 'CART_ALREADY_EXISTS', 'Tài khoản đã có giỏ hàng');
      return cartRepository.create({ userId });
    },
    async getById(auth, rawCartId) {
      const cart = await ownedCart(auth, rawCartId);
      return cartRepository.findById(cart.cart_id);
    },
    async getMine(auth) {
      const userId = await customerId(auth);
      const cart = await cartRepository.findByUserId(userId);
      return cart
        ? cartRepository.findById(cart.cart_id)
        : { cart_id: null, user_id: userId, items: [] };
    },
    async addItem(auth, rawCartId, input) {
      const cart = await ownedCart(auth, rawCartId);
      if (!productRepository) throw new TypeError('Cart addItem requires productRepository');
      const productId = positiveInteger(input?.product_id, 'product_id');
      const quantity = positiveInteger(input?.quantity, 'quantity');
      const product = await productRepository.findById(productId);
      if (!product || product.status !== 'active')
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
      const existing = await cartRepository.findItemByCartAndProduct(cart.cart_id, productId);
      const nextQuantity = Number(existing?.quantity ?? 0) + quantity;
      if (Number(product.stock) < nextQuantity)
        throw new AppError(409, 'INSUFFICIENT_STOCK', 'Số lượng vượt tồn kho');
      return cartRepository.addItem({ cartId: cart.cart_id, productId, quantity });
    },
    async updateItem(auth, rawCartId, rawItemId, input) {
      const cart = await ownedCart(auth, rawCartId);
      const itemId = positiveInteger(rawItemId, 'cart_item_id');
      const quantity = positiveInteger(input?.quantity, 'quantity');
      const item = await cartRepository.findItem(itemId);
      if (!item || Number(item.cart_id) !== Number(cart.cart_id))
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dòng giỏ hàng');
      if (Number(item.stock) < quantity)
        throw new AppError(409, 'INSUFFICIENT_STOCK', 'Số lượng vượt tồn kho');
      await cartRepository.updateItem(itemId, quantity);
      return cartRepository.findById(cart.cart_id);
    },
    async removeItem(auth, rawCartId, rawItemId) {
      const cart = await ownedCart(auth, rawCartId);
      const itemId = positiveInteger(rawItemId, 'cart_item_id');
      const item = await cartRepository.findItem(itemId);
      if (!item || Number(item.cart_id) !== Number(cart.cart_id))
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dòng giỏ hàng');
      await cartRepository.removeItem(itemId);
      return cartRepository.findById(cart.cart_id);
    },
  };
}
