import { AppError } from '../errors/app-error.js';

function id(value, field) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return n;
}

function pagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(limit) || limit <= 0 || limit > 20)
    throw new AppError(400, 'VALIDATION_ERROR', 'Tham số phân trang không hợp lệ');
  return { page, limit, offset: (page - 1) * limit };
}

export function createOrderService({ orderRepository, voucherRepository, transactionManager }) {
  if (!orderRepository || !voucherRepository || !transactionManager)
    throw new TypeError('Order service requires repositories and transaction manager');

  function userId(auth) {
    return id(auth?.userId, 'user_id');
  }

  async function getVoucher(rawValue, total, connection) {
    if (rawValue === null || rawValue === undefined || rawValue === '')
      return { voucher: null, discountAmount: 0 };
    const raw = String(rawValue).trim();
    const voucher = /^\d+$/.test(raw)
      ? await voucherRepository.findById(Number(raw), connection, true)
      : await voucherRepository.findByCode(raw.toUpperCase(), connection, true);
    if (!voucher) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy voucher');
    if (voucher.status !== 'active')
      throw new AppError(422, 'BUSINESS_RULE_VIOLATION', 'Voucher không hoạt động');
    if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date())
      throw new AppError(410, 'EXPIRED', 'Voucher đã hết hạn');
    if (voucher.usage_limit !== null && Number(voucher.used_count) >= Number(voucher.usage_limit))
      throw new AppError(409, 'CONFLICT', 'Voucher đã hết lượt sử dụng');
    if (total < Number(voucher.min_order_amount))
      throw new AppError(
        422,
        'BUSINESS_RULE_VIOLATION',
        'Chưa đạt giá trị đơn tối thiểu của voucher',
      );
    let discount =
      voucher.discount_type === 'percent'
        ? (total * Number(voucher.discount_value)) / 100
        : Number(voucher.discount_value);
    if (voucher.max_discount !== null) discount = Math.min(discount, Number(voucher.max_discount));
    return { voucher, discountAmount: Math.min(discount, total) };
  }

  async function detail(auth, orderId, executor) {
    const caller = userId(auth);
    const order = await orderRepository.findById(orderId, executor);
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
    if (!['admin', 'employee'].includes(auth.role) && Number(order.customer_id) !== caller)
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập đơn hàng này');
    return { ...order, items: await orderRepository.getItems(orderId, executor) };
  }

  return {
    async checkout(auth, input) {
      const customerId = userId(auth);
      const deliveryMethod = String(input?.delivery_method ?? 'pickup').trim();
      const paymentMethod = String(input?.payment_method ?? 'cash')
        .trim()
        .toLowerCase();
      const shippingAddress = String(input?.shipping_address ?? '').trim();
      const note =
        input?.note === null || input?.note === undefined ? null : String(input.note).trim();
      if (note !== null && note.length > 255)
        throw new AppError(400, 'VALIDATION_ERROR', 'note quá dài');
      if (!['pickup', 'delivery'].includes(deliveryMethod))
        throw new AppError(400, 'VALIDATION_ERROR', 'delivery_method không hợp lệ');
      if (deliveryMethod === 'delivery' && !shippingAddress)
        throw new AppError(400, 'VALIDATION_ERROR', 'Địa chỉ giao hàng là bắt buộc');
      if (paymentMethod !== 'cash')
        throw new AppError(
          422,
          'BUSINESS_RULE_VIOLATION',
          'Buổi 5 chỉ nghiệm thu phương thức cash',
        );

      return transactionManager.run(async (connection) => {
        const [carts] = await connection.execute(
          `SELECT cart_id, user_id FROM carts WHERE user_id = ? LIMIT 1 FOR UPDATE`,
          [customerId],
        );
        const cart = carts[0] ?? null;
        if (!cart) throw new AppError(400, 'VALIDATION_ERROR', 'Giỏ hàng đang trống');
        const items = await orderRepository.getCartItemsForUpdate(cart.cart_id, connection);
        if (!items.length) throw new AppError(400, 'VALIDATION_ERROR', 'Giỏ hàng đang trống');

        let totalAmount = 0;
        const normalizedItems = [];
        for (const item of items) {
          const quantity = Number(item.quantity);
          if (!Number.isSafeInteger(quantity) || quantity <= 0)
            throw new AppError(400, 'VALIDATION_ERROR', 'Số lượng sản phẩm trong giỏ không hợp lệ');
          if (item.status !== 'active')
            throw new AppError(409, 'CONFLICT', 'Sản phẩm trong giỏ đã ngừng bán');
          if (Number(item.stock) < quantity)
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              `Không đủ tồn kho cho ${item.product_name}`,
            );
          const price = Number(item.price);
          const subtotal = price * quantity;
          totalAmount += subtotal;
          normalizedItems.push({ product_id: Number(item.product_id), quantity, price, subtotal });
        }

        const voucherValue = input?.voucher_id ?? input?.voucher_code ?? null;
        const { voucher, discountAmount } = await getVoucher(voucherValue, totalAmount, connection);
        const order = await orderRepository.createOrder(
          {
            customerId,
            voucherId: voucher?.voucher_id ?? null,
            deliveryMethod,
            totalAmount,
            discountAmount,
            finalAmount: totalAmount - discountAmount,
            paymentMethod,
            shippingAddress: deliveryMethod === 'delivery' ? shippingAddress : null,
            note,
          },
          connection,
        );

        for (const item of normalizedItems) {
          await orderRepository.createOrderItem({ orderId: order.order_id, ...item }, connection);
          await orderRepository.decrementProductStock(item.product_id, item.quantity, connection);
        }
        await orderRepository.createPayment(
          {
            orderId: order.order_id,
            method: paymentMethod,
            amount: order.final_amount,
            status: 'pending',
            transactionId: null,
          },
          connection,
        );
        if (voucher) await voucherRepository.incrementUsed(voucher.voucher_id, connection);
        await orderRepository.clearCart(cart.cart_id, connection);
        return detail({ userId: customerId, role: 'customer' }, order.order_id, connection);
      });
    },

    async getById(auth, rawOrderId) {
      return detail(auth, id(rawOrderId, 'order_id'));
    },

    async listMine(auth, query) {
      const customerId = userId(auth);
      const p = pagination(query);
      const result = await orderRepository.listByCustomer(customerId, p);
      return {
        data: result.rows,
        meta: {
          page: p.page,
          limit: p.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / p.limit),
        },
      };
    },

    async listAll(auth, query) {
      if (!['admin', 'employee'].includes(auth?.role))
        throw new AppError(403, 'FORBIDDEN', 'Không có quyền xem danh sách đơn');
      const p = pagination(query);
      const result = await orderRepository.listAll({
        ...p,
        status: query.status ? String(query.status) : null,
      });
      return {
        data: result.rows,
        meta: {
          page: p.page,
          limit: p.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / p.limit),
        },
      };
    },

    async confirm(auth, rawOrderId) {
      const employeeId = userId(auth);
      if (!['admin', 'employee'].includes(auth?.role))
        throw new AppError(403, 'FORBIDDEN', 'Không có quyền xác nhận đơn');
      return transactionManager.run(async (connection) => {
        const order = await orderRepository.findById(id(rawOrderId, 'order_id'), connection, true);
        if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
        if (order.status !== 'pending')
          throw new AppError(409, 'CONFLICT', 'Đơn không còn ở trạng thái chờ xử lý');
        const nextStatus = order.delivery_method === 'delivery' ? 'shipping' : 'completed';
        return orderRepository.updateStatus(
          order.order_id,
          { status: nextStatus, orderStatus: nextStatus, employeeId, confirmedAt: new Date() },
          connection,
        );
      });
    },

    async reject(auth, rawOrderId, input) {
      const employeeId = userId(auth);
      if (!['admin', 'employee'].includes(auth?.role))
        throw new AppError(403, 'FORBIDDEN', 'Không có quyền từ chối đơn');
      const reason = String(input?.reason ?? '').trim();
      if (!reason) throw new AppError(400, 'VALIDATION_ERROR', 'Lý do từ chối là bắt buộc');
      return transactionManager.run(async (connection) => {
        const order = await orderRepository.findById(id(rawOrderId, 'order_id'), connection, true);
        if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
        if (order.status !== 'pending')
          throw new AppError(409, 'CONFLICT', 'Chỉ được từ chối đơn pending');
        if (order.payment_status === 'paid')
          throw new AppError(
            422,
            'BUSINESS_RULE_VIOLATION',
            'Đơn đã thanh toán cần xử lý hoàn tiền trước khi từ chối',
          );
        const items = await orderRepository.getItems(order.order_id, connection, true);
        for (const item of items)
          await orderRepository.incrementProductStock(
            item.product_id,
            Number(item.quantity),
            connection,
          );
        if (order.voucher_id) await voucherRepository.decrementUsed(order.voucher_id, connection);
        return orderRepository.updateStatus(
          order.order_id,
          {
            status: 'rejected',
            orderStatus: 'rejected',
            employeeId,
            confirmedAt: new Date(),
            rejectionReason: reason,
          },
          connection,
        );
      });
    },

    async receive(auth, rawOrderId) {
      const customerId = userId(auth);
      return transactionManager.run(async (connection) => {
        const order = await orderRepository.findById(id(rawOrderId, 'order_id'), connection, true);
        if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
        if (Number(order.customer_id) !== customerId)
          throw new AppError(403, 'FORBIDDEN', 'Đơn hàng không thuộc tài khoản của bạn');
        if (order.delivery_method !== 'delivery' || order.status !== 'shipping')
          throw new AppError(409, 'CONFLICT', 'Đơn chưa ở trạng thái có thể xác nhận đã nhận');
        return orderRepository.updateStatus(
          order.order_id,
          { status: 'completed', orderStatus: 'completed' },
          connection,
        );
      });
    },

    async payCash(auth, rawOrderId) {
      if (!['employee', 'admin'].includes(auth?.role))
        throw new AppError(403, 'FORBIDDEN', 'Không có quyền xác nhận tiền mặt');
      return transactionManager.run(async (connection) => {
        const order = await orderRepository.findById(id(rawOrderId, 'order_id'), connection, true);
        if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
        if (order.status === 'rejected') throw new AppError(409, 'CONFLICT', 'Đơn đã bị từ chối');
        if (order.payment_status === 'paid') return order;
        const paidAt = new Date();
        await orderRepository.updatePaymentStatus(order.order_id, 'paid', paidAt, connection);
        return orderRepository.updateStatus(
          order.order_id,
          { paymentStatus: 'paid', paidAt },
          connection,
        );
      });
    },
  };
}
