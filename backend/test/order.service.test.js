import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderService } from '../src/services/order.service.js';

test('checkout uses database prices and a single transaction', async () => {
  const calls = [];
  const service = createOrderService({
    transactionManager: {
      async run(work) {
        calls.push('begin');
        const result = await work({
          execute: async (sql) =>
            sql.includes('FROM carts') ? [[{ cart_id: 8, user_id: 10 }]] : [[], []],
        });
        calls.push('commit');
        return result;
      },
    },
    orderRepository: {
      async findCartByCustomerForUpdate() {
        return { cart_id: 8, user_id: 10 };
      },
      async getCartItemsForUpdate() {
        return [
          {
            product_id: 2,
            product_name: 'Milk',
            quantity: 2,
            price: 15000,
            stock: 10,
            status: 'active',
          },
        ];
      },
      async createOrder(data) {
        calls.push(['order', data.finalAmount]);
        return { order_id: 99, ...data, final_amount: data.finalAmount };
      },
      async createOrderItem(data) {
        assert.equal(data.productId, 2);
        calls.push(['item', data.subtotal]);
      },
      async decrementProductStock(productId, quantity) {
        calls.push(['stock', productId, quantity]);
      },
      async createPayment(data) {
        calls.push(['payment', data.amount, data.status]);
      },
      async clearCart(cartId) {
        calls.push(['clear', cartId]);
      },
      async findById() {
        return { order_id: 99, customer_id: 10, status: 'pending' };
      },
      async getItems() {
        return [];
      },
    },
    voucherRepository: {
      async findById() {
        return null;
      },
      async findByCode() {
        return null;
      },
      async incrementUsed() {},
    },
  });
  const result = await service.checkout(
    { userId: 10, role: 'customer' },
    { delivery_method: 'pickup', payment_method: 'cash' },
  );
  assert.equal(result.order_id, 99);
  assert.deepEqual(calls, [
    'begin',
    ['order', 30000],
    ['item', 30000],
    ['stock', 2, 2],
    ['payment', 30000, 'pending'],
    ['clear', 8],
    'commit',
  ]);
});
