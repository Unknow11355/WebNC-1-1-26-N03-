import { createHash } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import { invalidateReportCache } from '../cache/report-cache.js';
import { calculateVoucherDiscount } from './voucher.service.js';

const OPERATION = 'POS_CASH';
const MAX_KEY_LENGTH = 64;
const MAX_DECIMAL_CENTS = 9_999_999_999n;
const MAX_INT = 2_147_483_647;

function positiveId(value, field) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  }

  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > MAX_INT) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  }

  return parsed;
}

function positiveQuantity(value, field = 'quantity') {
  const parsed = positiveId(value, field);
  return parsed;
}

function optionalCustomerId(value) {
  if (value === undefined || value === null) return null;
  return positiveId(value, 'customer_id');
}

function normalizeMoneyCents(value, field) {
  const raw = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new AppError(409, 'BUSINESS_RULE_VIOLATION', `${field} trong database không hợp lệ`);
  }

  const [whole, fraction = ''] = raw.split('.');
  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));

  if (cents > MAX_DECIMAL_CENTS) {
    throw new AppError(409, 'BUSINESS_RULE_VIOLATION', `${field} vượt giới hạn DECIMAL(10,2)`);
  }

  return cents;
}

function formatMoneyCents(cents) {
  const whole = cents / 100n;
  const fraction = String(cents % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
}

function assertUnsupportedFields(input, items) {
  const fields = [
    'employee_id',
    'shift_id',
    'order_type',
    'delivery_method',
    'status',
    'order_status',
    'payment_status',
    'paid',
    'paid_at',
    'transaction_id',
    'total_amount',
    'discount_amount',
    'final_amount',
    'points_discount',
  ];

  const clientFields = fields.filter((field) =>
    Object.prototype.hasOwnProperty.call(input ?? {}, field),
  );

  const itemFields = items.flatMap((item) =>
    ['price', 'subtotal', 'discount_amount'].filter((field) =>
      Object.prototype.hasOwnProperty.call(item ?? {}, field),
    ),
  );

  if (clientFields.length || itemFields.length) {
    throw new AppError(
      422,
      'BUSINESS_RULE_VIOLATION',
      'Phiên bản POS cash không cho client tự truyền trạng thái, nhân viên hoặc giá tiền',
    );
  }
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Danh sách sản phẩm không được rỗng');
  }

  const quantities = new Map();

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Dòng sản phẩm không hợp lệ');
    }

    const productId = positiveId(item.product_id, 'product_id');
    const quantity = positiveQuantity(item.quantity);

    const current = quantities.get(productId) ?? 0;
    if (current > MAX_INT - quantity) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Tổng số lượng vượt giới hạn');
    }

    quantities.set(productId, current + quantity);
  }

  return [...quantities.entries()]
    .sort(([left], [right]) => left - right)
    .map(([productId, quantity]) => ({ productId, quantity }));
}

function normalizeNote(value) {
  if (value === undefined || value === null) return null;
  const note = String(value).trim();
  if (note.length > 255) throw new AppError(400, 'VALIDATION_ERROR', 'note quá dài');
  return note || null;
}

function normalizeIdempotencyKey(value) {
  const key = String(value ?? '').trim();
  if (key.length < 1 || key.length > MAX_KEY_LENGTH || !/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Idempotency-Key phải dài 1-64 ký tự và chỉ gồm A-Z, a-z, 0-9, _ hoặc -',
    );
  }
  return key;
}

function canonicalPayload({ customerId, voucherValue, paymentMethod, note, pointsUsed, items }) {
  return JSON.stringify({
    customer_id: customerId,
    voucher: voucherValue,
    payment_method: paymentMethod,
    note,
    points_used: pointsUsed,
    items: items.map(({ productId, quantity }) => ({
      product_id: productId,
      quantity,
    })),
  });
}

function isSaleRequestDuplicate(error) {
  const message = `${error?.sqlMessage ?? ''} ${error?.message ?? ''}`;
  return error?.code === 'ER_DUP_ENTRY' && message.includes('uq_sale_requests_actor_operation_key');
}

function ensureEmployee(auth) {
  if (!['employee', 'admin'].includes(auth?.role)) {
    throw new AppError(403, 'FORBIDDEN', 'Chỉ employee/admin được bán tại quầy');
  }
  return positiveId(auth?.userId, 'user_id');
}

async function readReplay({ repository, actorId, requestKey, requestHash }) {
  const request = await repository.findSaleRequest(actorId, OPERATION, requestKey);

  if (!request) {
    throw new AppError(
      409,
      'CONFLICT',
      'Không tìm thấy yêu cầu POS đã ghi; vui lòng gửi lại với key mới',
    );
  }

  if (String(request.request_hash) !== requestHash) {
    throw new AppError(409, 'KEY_REUSE_CONFLICT', 'Idempotency-Key đã được dùng cho dữ liệu khác');
  }

  if (!request.order_id) {
    throw new AppError(409, 'IDEMPOTENCY_IN_PROGRESS', 'Yêu cầu POS đang được xử lý');
  }

  const order = await repository.findOrderForReplay(request.order_id, actorId);
  if (!order) {
    throw new AppError(409, 'CONFLICT', 'Yêu cầu POS đã ghi nhưng không truy xuất được đơn hàng');
  }

  const items = await repository.findOrderItems(order.order_id);
  return {
    replayed: true,
    data: { ...order, items },
  };
}

export function createPosService({
  repository,
  loyaltyService = null,
  voucherRepository = null,
  transactionManager,
}) {
  if (!repository || !transactionManager) {
    throw new TypeError('POS service requires repository and transaction manager');
  }

  return {
    async sellCash(auth, idempotencyKey, input) {
      const actorId = ensureEmployee(auth);
      const requestKey = normalizeIdempotencyKey(idempotencyKey);

      const payload = input ?? {};
      if (typeof payload !== 'object' || Array.isArray(payload)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Body yêu cầu không hợp lệ');
      }

      const rawItems = payload.items;
      assertUnsupportedFields(payload, Array.isArray(rawItems) ? rawItems : []);
      const items = normalizeItems(rawItems);

      const paymentMethod = String(payload.payment_method ?? 'cash')
        .trim()
        .toLowerCase();
      if (paymentMethod !== 'cash') {
        throw new AppError(
          422,
          'BUSINESS_RULE_VIOLATION',
          'POS chỉ hỗ trợ thanh toán cash trong phiên bản Buổi 6',
        );
      }

      const customerId = optionalCustomerId(payload.customer_id);
      if (payload.voucher_id !== undefined && payload.voucher_code !== undefined)
        throw new AppError(400, 'VALIDATION_ERROR', 'Chỉ truyền voucher_id hoặc voucher_code');
      let voucherValue = payload.voucher_id ?? payload.voucher_code ?? null;
      if (voucherValue !== null) {
        voucherValue = String(voucherValue).trim();
        if (!voucherValue || voucherValue.length > 50)
          throw new AppError(400, 'VALIDATION_ERROR', 'Mã voucher không hợp lệ');
        if (customerId === null)
          throw new AppError(
            400,
            'VALIDATION_ERROR',
            'Phải chọn khách hàng khi dùng voucher tại POS',
          );
        if (!voucherRepository)
          throw new AppError(500, 'INTERNAL_ERROR', 'CN11 voucher repository chưa được cấu hình');
      }
      const pointsUsed = Number(payload.points_used ?? 0);
      if (!Number.isSafeInteger(pointsUsed) || pointsUsed < 0) {
        throw new AppError(400, 'VALIDATION_ERROR', 'points_used phải là số nguyên không âm');
      }
      if (pointsUsed > 0) {
        if (customerId === null)
          throw new AppError(400, 'VALIDATION_ERROR', 'Phải có customer_id khi đổi điểm tại POS');
        if (!loyaltyService)
          throw new AppError(500, 'INTERNAL_ERROR', 'CN10 loyalty service chưa được cấu hình');
      }
      const note = normalizeNote(payload.note);
      const requestHash = createHash('sha256')
        .update(
          canonicalPayload({
            customerId,
            voucherValue,
            paymentMethod,
            note,
            pointsUsed,
            items,
          }),
        )
        .digest('hex');

      try {
        const result = await transactionManager.run(async (connection) => {
          let saleRequest;
          try {
            saleRequest = await repository.createSaleRequest(
              {
                actorId,
                operation: OPERATION,
                requestKey,
                requestHash,
              },
              connection,
            );
          } catch (error) {
            if (isSaleRequestDuplicate(error)) throw error;
            throw error;
          }

          if (customerId !== null) {
            const customer = await repository.findCustomer(customerId, connection);
            if (!customer) {
              throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng');
            }
            if (customer.role_name !== 'customer') {
              throw new AppError(
                422,
                'BUSINESS_RULE_VIOLATION',
                'customer_id phải là tài khoản customer',
              );
            }
            if (customer.status !== 'active') {
              throw new AppError(409, 'CONFLICT', 'Tài khoản khách hàng đã ngừng hoạt động');
            }
          }

          const shiftId = await repository.findCurrentShift(actorId, connection);
          const lockedProducts = [];
          let totalCents = 0n;

          for (const item of items) {
            const product = await repository.findProductForUpdate(item.productId, connection);

            if (!product) {
              throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
            }

            if (product.status !== 'active') {
              throw new AppError(409, 'CONFLICT', `Sản phẩm ${product.product_name} đã ngừng bán`);
            }

            const stock = Number(product.stock);
            if (!Number.isSafeInteger(stock) || stock < 0) {
              throw new AppError(500, 'INTERNAL_ERROR', 'Tồn kho trong database không hợp lệ');
            }

            if (stock < item.quantity) {
              throw new AppError(
                409,
                'INSUFFICIENT_STOCK',
                `Không đủ tồn kho cho ${product.product_name}`,
              );
            }

            const priceCents = normalizeMoneyCents(product.price, 'price');
            if (priceCents <= 0n) {
              throw new AppError(
                409,
                'BUSINESS_RULE_VIOLATION',
                `Giá sản phẩm ${product.product_name} phải lớn hơn 0`,
              );
            }

            const subtotalCents = priceCents * BigInt(item.quantity);
            totalCents += subtotalCents;

            if (totalCents > MAX_DECIMAL_CENTS) {
              throw new AppError(
                409,
                'BUSINESS_RULE_VIOLATION',
                'Tổng tiền vượt giới hạn DECIMAL(10,2)',
              );
            }

            lockedProducts.push({
              ...item,
              product,
              priceCents,
              subtotalCents,
            });
          }

          const totalAmount = formatMoneyCents(totalCents);
          let voucher = null;
          let discountCents = 0n;
          if (voucherValue !== null) {
            voucher = /^\d+$/.test(voucherValue)
              ? await voucherRepository.findById(Number(voucherValue), connection, true)
              : await voucherRepository.findByCode(voucherValue.toUpperCase(), connection, true);
            const voucherResult = calculateVoucherDiscount(voucher, Number(totalAmount));
            voucher = voucherResult.voucher;
            if (
              !(await voucherRepository.findCustomerVoucher(
                customerId,
                voucher.voucher_id,
                connection,
                true,
              ))
            )
              throw new AppError(403, 'FORBIDDEN', 'Khách hàng chưa lưu voucher này');
            discountCents = normalizeMoneyCents(
              voucherResult.discount_amount.toFixed(2),
              'discount_amount',
            );
          }
          const discountAmount = formatMoneyCents(discountCents);
          const eligibleCents = totalCents - discountCents;
          let finalCents = eligibleCents;
          let pointsPreview = {
            points_used: 0,
            points_discount: 0,
            final_amount: Number(formatMoneyCents(eligibleCents)),
          };
          if (pointsUsed > 0) {
            pointsPreview = loyaltyService.previewRedemption({
              pointsUsed,
              eligibleAmount: Number(formatMoneyCents(eligibleCents)),
            });
            finalCents -= BigInt(pointsPreview.points_discount) * 100n;
          }
          const finalAmount = formatMoneyCents(finalCents);
          const paidAt = new Date();

          const orderId = await repository.createOfflineOrder(
            {
              employeeId: actorId,
              customerId,
              shiftId,
              voucherId: voucher?.voucher_id ?? null,
              totalAmount,
              discountAmount,
              finalAmount,
              paidAt,
              note,
            },
            connection,
          );

          if (pointsPreview.points_used > 0) {
            await loyaltyService.redeemForOrder({
              customerId,
              orderId,
              pointsUsed: pointsPreview.points_used,
              eligibleAmount: Number(formatMoneyCents(eligibleCents)),
              executor: connection,
            });
          }

          for (const item of lockedProducts) {
            const affectedRows = await repository.decrementProductStock(
              item.productId,
              item.quantity,
              connection,
            );

            if (affectedRows !== 1) {
              throw new AppError(
                409,
                'INSUFFICIENT_STOCK',
                `Tồn sản phẩm ${item.product.product_name} đã thay đổi`,
              );
            }

            await repository.createOrderItem(
              {
                orderId,
                productId: item.productId,
                quantity: item.quantity,
                price: formatMoneyCents(item.priceCents),
                subtotal: formatMoneyCents(item.subtotalCents),
              },
              connection,
            );
          }

          await repository.createPayment(
            {
              orderId,
              amount: finalAmount,
              paidAt,
            },
            connection,
          );

          if (voucher) {
            await voucherRepository.incrementUsed(voucher.voucher_id, connection);
            await voucherRepository.incrementCustomerUsed(
              customerId,
              voucher.voucher_id,
              connection,
            );
          }

          if (loyaltyService && customerId) {
            await loyaltyService.earnForPaidOrder({
              customerId,
              orderId,
              finalAmount,
              paymentStatus: 'paid',
              executor: connection,
            });
          }

          await repository.updateSaleRequestOrderId(
            saleRequest.sale_request_id,
            orderId,
            connection,
          );

          const order = await repository.findOrderForReplay(orderId, actorId, connection);
          const orderItems = await repository.findOrderItems(orderId, connection);

          return {
            replayed: false,
            data: { ...order, items: orderItems },
          };
        });
        if (!result.replayed) invalidateReportCache();
        return result;
      } catch (error) {
        if (!isSaleRequestDuplicate(error)) throw error;

        return readReplay({
          repository,
          actorId,
          requestKey,
          requestHash,
        });
      }
    },
  };
}
