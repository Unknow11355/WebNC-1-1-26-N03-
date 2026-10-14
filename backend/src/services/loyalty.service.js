import { AppError } from '../errors/app-error.js';

export const POINTS_PER_VND = 10_000;
export const VND_PER_POINT = 1_000;

function positiveId(value, field) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return n;
}

function nonNegativePoints(value) {
  const n = Number(value ?? 0);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new AppError(400, 'VALIDATION_ERROR', 'points_used phải là số nguyên không âm');
  return n;
}

function amountNumber(value, field = 'amount') {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return n;
}

function memberView(member) {
  const userId = Number(member.user_id);
  return {
    user_id: userId,
    full_name: member.full_name,
    email: member.email,
    phone: member.phone ?? null,
    address: member.address ?? null,
    membership_code: member.membership_code ?? `MEM${String(userId).padStart(8, '0')}`,
    points: Number(member.points ?? 0),
    status: member.status,
    role_name: member.role_name,
    created_at: member.created_at,
  };
}

function historyView(row) {
  return {
    loyalty_id: Number(row.loyalty_id),
    user_id: Number(row.user_id),
    order_id: row.order_id === null ? null : Number(row.order_id),
    points_change: Number(row.points_change),
    type: row.type,
    note: row.note ?? null,
    order_status: row.order_status ?? null,
    payment_status: row.payment_status ?? null,
    final_amount: row.final_amount === null ? null : Number(row.final_amount),
    created_at: row.created_at,
  };
}

function pagination(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (
    !Number.isSafeInteger(page) ||
    page <= 0 ||
    !Number.isSafeInteger(limit) ||
    limit <= 0 ||
    limit > 20
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Tham số phân trang không hợp lệ');
  }
  return { page, limit, offset: (page - 1) * limit };
}

function isDuplicateError(error) {
  return error?.code === 'ER_DUP_ENTRY';
}

function assertRole(auth, roles) {
  if (!roles.includes(auth?.role))
    throw new AppError(403, 'FORBIDDEN', 'Không có quyền thực hiện thao tác này');
}

function assertCanViewMember(auth, customerId) {
  if (['admin', 'employee'].includes(auth?.role)) return;
  if (auth?.role === 'customer' && positiveId(auth.userId, 'user_id') === customerId) return;
  throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập khách hàng này');
}

function previewRedemption({ pointsUsed, eligibleAmount }) {
  const points = nonNegativePoints(pointsUsed);
  const amount = amountNumber(eligibleAmount, 'eligible_amount');
  const maxByAmount = Math.floor(amount / VND_PER_POINT);
  if (points > maxByAmount) {
    throw new AppError(
      422,
      'BUSINESS_RULE_VIOLATION',
      `points_used vượt số điểm tối đa cho số tiền phải trả (tối đa ${maxByAmount} điểm)`,
    );
  }
  const discount = points * VND_PER_POINT;
  return {
    points_used: points,
    points_discount: discount,
    final_amount: amount - discount,
    max_points: maxByAmount,
  };
}

export function createLoyaltyService({ repository } = {}) {
  if (!repository) throw new TypeError('Loyalty service requires repository');

  async function requireCustomer(customerId, executor, lock = false) {
    const member = await repository.findCustomerById(customerId, executor, lock);
    if (!member) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng');
    if (member.status !== 'active')
      throw new AppError(409, 'CONFLICT', 'Tài khoản khách hàng không hoạt động');
    const points = Number(member.points ?? 0);
    if (!Number.isSafeInteger(points) || points < 0)
      throw new AppError(409, 'BUSINESS_RULE_VIOLATION', 'Số điểm trong database không hợp lệ');
    if (member.role_name !== 'customer')
      throw new AppError(422, 'BUSINESS_RULE_VIOLATION', 'Tài khoản không phải khách hàng');
    return member;
  }

  async function findExisting(orderId, type, executor) {
    return repository.findTransactionByOrderType(orderId, type, executor, false);
  }

  return {
    previewRedemption,

    async me(auth) {
      const customerId = positiveId(auth?.userId, 'user_id');
      return memberView(await requireCustomer(customerId));
    },

    async search(auth, query = {}) {
      assertRole(auth, ['employee', 'admin']);
      const q = String(query.q ?? '').trim();
      if (q.length > 100) throw new AppError(400, 'VALIDATION_ERROR', 'q tối đa 100 ký tự');
      const p = pagination(query);
      const result = await repository.searchCustomers({ q, limit: p.limit, offset: p.offset });
      return {
        data: result.rows.map(memberView),
        meta: {
          page: p.page,
          limit: p.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / p.limit),
        },
      };
    },

    async getMember(auth, rawCustomerId) {
      const customerId = positiveId(rawCustomerId, 'customer_id');
      assertCanViewMember(auth, customerId);
      return memberView(await requireCustomer(customerId));
    },

    async history(auth, rawCustomerId, query = {}) {
      const customerId = positiveId(rawCustomerId, 'customer_id');
      assertCanViewMember(auth, customerId);
      const p = pagination(query);
      await requireCustomer(customerId);
      const result = await repository.listHistory(customerId, p);
      return {
        data: result.rows.map(historyView),
        meta: {
          page: p.page,
          limit: p.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / p.limit),
        },
      };
    },

    async redeemForOrder({ customerId, orderId, pointsUsed = 0, eligibleAmount, executor }) {
      const memberId = positiveId(customerId, 'customer_id');
      const order = positiveId(orderId, 'order_id');
      const preview = previewRedemption({ pointsUsed, eligibleAmount });
      if (preview.points_used === 0) return preview;
      if (!executor)
        throw new TypeError('redeemForOrder requires the active transaction connection');

      const existing = await findExisting(order, 'redeem', executor);
      if (existing) {
        const used = Math.max(0, -Number(existing.points_change));
        return { points_used: used, points_discount: used * VND_PER_POINT };
      }

      const member = await requireCustomer(memberId, executor, true);
      if (Number(member.points ?? 0) < preview.points_used) {
        throw new AppError(409, 'INSUFFICIENT_POINTS', 'Khách hàng không đủ điểm để đổi');
      }

      try {
        await repository.createTransaction(
          {
            userId: memberId,
            orderId: order,
            pointsChange: -preview.points_used,
            type: 'redeem',
            note: `Đổi ${preview.points_used} điểm, giảm ${preview.points_discount} VND`,
          },
          executor,
        );
      } catch (error) {
        if (!isDuplicateError(error)) throw error;
        const duplicate = await findExisting(order, 'redeem', executor);
        if (!duplicate) throw error;
        const used = Math.max(0, -Number(duplicate.points_change));
        return { points_used: used, points_discount: used * VND_PER_POINT };
      }

      if ((await repository.decrementPoints(memberId, preview.points_used, executor)) !== 1) {
        throw new AppError(409, 'INSUFFICIENT_POINTS', 'Số điểm đã thay đổi, vui lòng thử lại');
      }

      await repository.updateOrderPoints(
        order,
        {
          pointsUsed: preview.points_used,
          pointsEarned: 0,
          pointsDiscount: preview.points_discount,
        },
        executor,
      );

      return preview;
    },

    async earnForPaidOrder({ customerId, orderId, finalAmount, paymentStatus, executor }) {
      if (!customerId) return 0;
      if (String(paymentStatus).toLowerCase() !== 'paid') {
        throw new AppError(
          422,
          'BUSINESS_RULE_VIOLATION',
          'Chỉ đơn đã thanh toán mới được cộng điểm',
        );
      }
      if (!executor)
        throw new TypeError('earnForPaidOrder requires the active transaction connection');

      const memberId = positiveId(customerId, 'customer_id');
      const order = positiveId(orderId, 'order_id');
      const amount = amountNumber(finalAmount, 'final_amount');
      const earned = Math.floor(amount / POINTS_PER_VND);

      const existing = await findExisting(order, 'earn', executor);
      if (existing) return Math.max(0, Number(existing.points_change));
      if (earned === 0) {
        await repository.updateOrderPoints(order, { pointsEarned: 0 }, executor);
        return 0;
      }

      await requireCustomer(memberId, executor, true);
      try {
        await repository.createTransaction(
          {
            userId: memberId,
            orderId: order,
            pointsChange: earned,
            type: 'earn',
            note: `Tích điểm từ đơn đã thanh toán: ${amount} VND`,
          },
          executor,
        );
      } catch (error) {
        if (!isDuplicateError(error)) throw error;
        const duplicate = await findExisting(order, 'earn', executor);
        if (!duplicate) throw error;
        return Math.max(0, Number(duplicate.points_change));
      }

      if ((await repository.incrementPoints(memberId, earned, executor)) !== 1) {
        throw new AppError(409, 'CONFLICT', 'Không thể cập nhật số điểm khách hàng');
      }
      await repository.updateOrderPoints(order, { pointsEarned: earned }, executor);
      return earned;
    },

    async releaseForOrder({ customerId, orderId, pointsUsed = null, executor }) {
      if (!customerId) return 0;
      if (!executor)
        throw new TypeError('releaseForOrder requires the active transaction connection');

      const memberId = positiveId(customerId, 'customer_id');
      const order = positiveId(orderId, 'order_id');
      const existingRedeem = await findExisting(order, 'redeem', executor);
      if (!existingRedeem) return 0;

      const used =
        pointsUsed === null
          ? Math.max(0, -Number(existingRedeem.points_change))
          : nonNegativePoints(pointsUsed);
      if (used === 0) return 0;

      const existingRelease = await findExisting(order, 'release', executor);
      if (existingRelease) return Number(existingRelease.points_change);

      await requireCustomer(memberId, executor, true);
      try {
        await repository.createTransaction(
          {
            userId: memberId,
            orderId: order,
            pointsChange: used,
            type: 'release',
            note: `Hoàn lại ${used} điểm do đơn chưa thanh toán/bị hủy`,
          },
          executor,
        );
      } catch (error) {
        if (!isDuplicateError(error)) throw error;
        const duplicate = await findExisting(order, 'release', executor);
        if (!duplicate) throw error;
        return Number(duplicate.points_change);
      }

      if ((await repository.incrementPoints(memberId, used, executor)) !== 1) {
        throw new AppError(409, 'CONFLICT', 'Không thể hoàn điểm khách hàng');
      }
      return used;
    },
  };
}
