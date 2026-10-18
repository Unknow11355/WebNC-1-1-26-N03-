import { AppError } from '../errors/app-error.js';

function integerId(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', 'voucher_id không hợp lệ');
  return n;
}

function nonNegative(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return n;
}

function positive(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ`);
  return n;
}

function todayInVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function expiryDateText(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function calculateVoucherDiscount(voucher, total, today = todayInVietnam()) {
  if (!voucher) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy voucher');
  if (voucher.status !== 'active')
    throw new AppError(422, 'BUSINESS_RULE_VIOLATION', 'Voucher không hoạt động');
  const expiry = expiryDateText(voucher.expiry_date);
  if (expiry && expiry < today) throw new AppError(410, 'EXPIRED', 'Voucher đã hết hạn');
  if (voucher.usage_limit !== null && Number(voucher.used_count) >= Number(voucher.usage_limit))
    throw new AppError(409, 'CONFLICT', 'Voucher đã hết lượt sử dụng');
  const amount = Number(total);
  if (!Number.isFinite(amount) || amount < 0)
    throw new AppError(400, 'VALIDATION_ERROR', 'order_amount không hợp lệ');
  if (amount < Number(voucher.min_order_amount))
    throw new AppError(
      422,
      'BUSINESS_RULE_VIOLATION',
      'Chưa đạt giá trị đơn tối thiểu của voucher',
    );
  let discount =
    voucher.discount_type === 'percent'
      ? (amount * Number(voucher.discount_value)) / 100
      : Number(voucher.discount_value);
  if (voucher.max_discount !== null) discount = Math.min(discount, Number(voucher.max_discount));
  return { voucher, discount_amount: Math.min(discount, amount) };
}

export function createVoucherService(repository, transactionManager = null) {
  if (!repository) throw new TypeError('Voucher service requires repository');
  function normalize(input, current = {}) {
    const code = String(input?.code ?? current.code ?? '')
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9_-]{3,50}$/.test(code))
      throw new AppError(400, 'VALIDATION_ERROR', 'Mã voucher không hợp lệ');
    const discountType = String(input?.discount_type ?? current.discount_type ?? '').trim();
    if (!['fixed', 'percent'].includes(discountType))
      throw new AppError(400, 'VALIDATION_ERROR', 'discount_type không hợp lệ');
    const discountValue = positive(
      input?.discount_value ?? current.discount_value,
      'discount_value',
    );
    if (discountType === 'percent' && discountValue > 100)
      throw new AppError(400, 'VALIDATION_ERROR', 'Phần trăm giảm tối đa 100');
    const minOrderAmount = nonNegative(
      input?.min_order_amount ?? current.min_order_amount ?? 0,
      'min_order_amount',
    );
    const maxDiscount =
      input?.max_discount === null
        ? null
        : input?.max_discount !== undefined
          ? nonNegative(input.max_discount, 'max_discount')
          : current.max_discount === null || current.max_discount === undefined
            ? null
            : nonNegative(current.max_discount, 'max_discount');
    let usageLimit = input?.usage_limit ?? current.usage_limit ?? null;
    if (usageLimit !== null) {
      usageLimit = Number(usageLimit);
      if (!Number.isSafeInteger(usageLimit) || usageLimit <= 0)
        throw new AppError(400, 'VALIDATION_ERROR', 'usage_limit không hợp lệ');
    }
    const status = String(input?.status ?? current.status ?? 'active');
    if (!['active', 'inactive'].includes(status))
      throw new AppError(400, 'VALIDATION_ERROR', 'status không hợp lệ');
    const expiryDate = input?.expiry_date ?? current.expiry_date ?? null;
    if (expiryDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(expiryDate)))
      throw new AppError(400, 'VALIDATION_ERROR', 'expiry_date phải có dạng YYYY-MM-DD');
    return {
      code,
      description: input?.description ?? current.description ?? null,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      expiryDate,
      status,
    };
  }
  return {
    async list() {
      return repository.list();
    },
    async getById(rawId) {
      const voucherId = integerId(rawId);
      const voucher = await repository.findById(voucherId);
      if (!voucher) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy voucher');
      return voucher;
    },
    async create(input) {
      return repository.create(normalize(input));
    },
    async update(rawId, input) {
      const voucherId = integerId(rawId);
      const current = await repository.findById(voucherId);
      if (!current) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy voucher');
      if (input?.code !== undefined && String(input.code).trim().toUpperCase() !== current.code)
        throw new AppError(400, 'VALIDATION_ERROR', 'Không đổi code voucher sau khi tạo');
      return repository.update(voucherId, normalize({ ...input, code: current.code }, current));
    },
    async remove(rawId) {
      const voucherId = integerId(rawId);
      if (!(await repository.findById(voucherId)))
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy voucher');
      await repository.setInactive(voucherId);
    },
    async available(auth) {
      if (auth?.role !== 'customer')
        throw new AppError(403, 'FORBIDDEN', 'Chỉ khách hàng được xem voucher khả dụng');
      return repository.listAvailableForCustomer(Number(auth.userId), todayInVietnam());
    },
    async mine(auth) {
      if (auth?.role !== 'customer')
        throw new AppError(403, 'FORBIDDEN', 'Chỉ khách hàng được xem voucher đã lưu');
      return repository.listForCustomer(Number(auth.userId), todayInVietnam());
    },
    async forCustomer(auth, rawUserId) {
      if (!['employee', 'admin'].includes(auth?.role))
        throw new AppError(403, 'FORBIDDEN', 'Chỉ nhân viên được tra voucher khách hàng');
      const userId = integerId(rawUserId);
      return repository.listForCustomer(userId, todayInVietnam());
    },
    async claim(auth, input) {
      if (auth?.role !== 'customer')
        throw new AppError(403, 'FORBIDDEN', 'Chỉ khách hàng được lưu voucher');
      if (!transactionManager)
        throw new AppError(500, 'INTERNAL_ERROR', 'Voucher transaction chưa được cấu hình');
      const raw = String(input?.voucher_id ?? input?.voucher_code ?? '').trim();
      if (!raw)
        throw new AppError(400, 'VALIDATION_ERROR', 'voucher_id hoặc voucher_code là bắt buộc');
      const userId = integerId(auth.userId);
      const today = todayInVietnam();
      return transactionManager.run(async (connection) => {
        const voucher = /^\d+$/.test(raw)
          ? await repository.findById(Number(raw), connection, true)
          : await repository.findByCode(raw.toUpperCase(), connection, true);
        const expiry = expiryDateText(voucher?.expiry_date);
        if (!voucher) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy voucher');
        if (voucher.status !== 'active')
          throw new AppError(422, 'BUSINESS_RULE_VIOLATION', 'Voucher không hoạt động');
        if (expiry && expiry < today) throw new AppError(410, 'EXPIRED', 'Voucher đã hết hạn');
        if (
          voucher.usage_limit !== null &&
          Number(voucher.used_count) >= Number(voucher.usage_limit)
        )
          throw new AppError(409, 'CONFLICT', 'Voucher đã hết lượt sử dụng');
        await repository.claimForCustomer(userId, voucher.voucher_id, connection);
        return repository.findCustomerVoucher(userId, voucher.voucher_id, connection);
      });
    },
    async validate(auth, input) {
      if (auth?.role !== 'customer')
        throw new AppError(403, 'FORBIDDEN', 'Chỉ khách hàng được kiểm tra voucher');
      const raw = String(input?.voucher_id ?? input?.voucher_code ?? '').trim();
      const total = Number(input?.order_amount);
      if (!raw)
        throw new AppError(400, 'VALIDATION_ERROR', 'voucher_id hoặc voucher_code là bắt buộc');
      if (!Number.isFinite(total) || total < 0)
        throw new AppError(400, 'VALIDATION_ERROR', 'order_amount không hợp lệ');
      const voucher = /^\d+$/.test(raw)
        ? await repository.findById(Number(raw))
        : await repository.findByCode(raw.toUpperCase());
      const result = calculateVoucherDiscount(voucher, total);
      if (
        !(await repository.findCustomerVoucher(integerId(auth.userId), result.voucher.voucher_id))
      )
        throw new AppError(403, 'FORBIDDEN', 'Bạn cần lưu voucher trước khi sử dụng');
      return result;
    },
  };
}
