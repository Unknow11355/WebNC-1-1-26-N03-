import crypto from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import { invalidateReportCache } from '../cache/report-cache.js';
import { env } from '../config/env.js';

const DEFAULT_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

export function createPaymentService({
  paymentRepository,
  transactionManager,
  loyaltyService = null,
  configProvider = defaultConfig,
}) {
  if (!paymentRepository || !transactionManager)
    throw new TypeError('Payment service requires paymentRepository and transactionManager');

  function getConfig() {
    const config = configProvider();
    const required = ['tmnCode', 'hashSecret', 'returnUrl', 'ipnUrl'];
    if (required.some((key) => typeof config[key] !== 'string' || !config[key].trim())) {
      throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Thanh toán trực tuyến chưa được cấu hình');
    }
    return { ...config, paymentUrl: config.paymentUrl || DEFAULT_PAYMENT_URL };
  }

  function sortAndEncodeParams(params) {
    return Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .sort()
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key])).replace(/%20/g, '+')}`,
      )
      .join('&');
  }

  function hmacSha512(secret, data) {
    return crypto.createHmac('sha512', secret).update(data, 'utf8').digest('hex');
  }

  function signatureMatches(receivedHash, expectedHash) {
    if (typeof receivedHash !== 'string' || !/^[a-f\d]{128}$/i.test(receivedHash)) return false;
    const received = Buffer.from(receivedHash, 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
  }

  function formatVnpDate(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
  }

  function buildTxnRef(orderId) {
    return `${orderId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  function result(rspCode, message, paymentStatus = 'failed', orderId = null, details = {}) {
    return {
      success: rspCode === '00',
      httpStatus: rspCode === '00' ? 200 : rspCode === '01' ? 404 : 400,
      rspCode,
      message,
      paymentStatus,
      orderId,
      ...details,
    };
  }

  return {
    async createVnpayUrl(userId, orderId, ipAddr) {
      const config = getConfig();
      const txnRef = buildTxnRef(orderId);
      const createDate = new Date();
      const expireDate = new Date(createDate.getTime() + 15 * 60 * 1000);
      const order = await transactionManager.run(async (connection) => {
        const current = await paymentRepository.getOrderForPayment(orderId, connection, true);
        if (!current) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
        if (Number(current.customer_id) !== Number(userId))
          throw new AppError(403, 'FORBIDDEN', 'Không có quyền thanh toán đơn này');
        if (['paid', 'success'].includes(String(current.payment_status || '').toLowerCase()))
          throw new AppError(409, 'CONFLICT', 'Đơn hàng đã được thanh toán');
        if (
          ['cancelled', 'rejected'].includes(String(current.status || '').toLowerCase()) ||
          ['cancelled', 'rejected'].includes(String(current.order_status || '').toLowerCase())
        ) {
          throw new AppError(409, 'CONFLICT', 'Đơn hàng không còn hợp lệ để thanh toán');
        }
        await paymentRepository.createVnpayAttempt(
          current.order_id,
          txnRef,
          current.final_amount,
          connection,
        );
        return current;
      });

      const params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: config.tmnCode,
        vnp_Amount: Math.round(Number(order.final_amount) * 100),
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: config.returnUrl,
        vnp_IpAddr: ipAddr || '127.0.0.1',
        vnp_CreateDate: formatVnpDate(createDate),
        vnp_ExpireDate: formatVnpDate(expireDate),
      };
      const signData = sortAndEncodeParams(params);
      const secureHash = hmacSha512(config.hashSecret, signData);
      const paymentUrl = `${config.paymentUrl}?${signData}&vnp_SecureHash=${secureHash}`;
      return { paymentUrl, txnRef, orderId };
    },

    async processVnpayCallback(query) {
      const config = getConfig();
      const input = { ...query };
      const receivedHash = input.vnp_SecureHash;
      delete input.vnp_SecureHash;
      delete input.vnp_SecureHashType;

      const signData = sortAndEncodeParams(input);
      const expectedHash = hmacSha512(config.hashSecret, signData);
      const txnRef = String(input.vnp_TxnRef || '');
      const match = txnRef.match(/^([1-9]\d*)_\d{13}_[a-f\d]{8}$/i);
      const orderId = match ? Number(match[1]) : null;

      if (!signatureMatches(receivedHash, expectedHash))
        return result('97', 'Sai chữ ký bảo mật', 'failed', orderId);
      if (input.vnp_TmnCode !== config.tmnCode)
        return result('97', 'Mã merchant không hợp lệ', 'failed', orderId);
      if (!Number.isSafeInteger(orderId)) return result('01', 'Không tìm thấy đơn hàng');

      const amount = Number(input.vnp_Amount);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        return result('04', 'Số tiền thanh toán không hợp lệ', 'failed', orderId);

      return transactionManager.run(async (connection) => {
        const order = await paymentRepository.getOrderForPayment(orderId, connection, true);
        if (!order) return result('01', 'Không tìm thấy đơn hàng', 'failed', orderId);

        const attempt = await paymentRepository.findVnpayAttempt(orderId, txnRef, connection, true);
        if (!attempt) return result('01', 'Không tìm thấy giao dịch thanh toán', 'failed', orderId);

        if (amount !== Math.round(Number(attempt.amount) * 100))
          return result('04', 'Sai số tiền', 'failed', orderId);
        if (amount !== Math.round(Number(order.final_amount) * 100))
          return result('04', 'Số tiền đơn hàng đã thay đổi', 'failed', orderId);

        if (String(order.payment_status).toLowerCase() === 'paid') {
          if (String(attempt.status).toLowerCase() === 'paid')
            return result('00', 'Confirm Success', 'paid', orderId, { alreadyPaid: true });
          return result('02', 'Đơn hàng đã được xác nhận thanh toán', 'paid', orderId);
        }
        if (
          ['cancelled', 'rejected'].includes(String(order.status || '').toLowerCase()) ||
          ['cancelled', 'rejected'].includes(String(order.order_status || '').toLowerCase())
        ) {
          return result('02', 'Đơn hàng không còn hợp lệ để thanh toán', 'failed', orderId);
        }
        if (String(attempt.status).toLowerCase() !== 'pending')
          return result('02', 'Giao dịch đã được xử lý', 'failed', orderId);

        if (input.vnp_ResponseCode !== '00' || input.vnp_TransactionStatus !== '00') {
          await paymentRepository.markOrderFailed(order, attempt, connection);
          return result('00', 'Confirm Success', 'failed', orderId);
        }

        const update = await paymentRepository.markOrderPaid(
          order,
          attempt,
          txnRef,
          'vnpay',
          connection,
        );
        if (!update.ok) return result('02', 'Giao dịch đã được xử lý', 'failed', orderId);
        if (loyaltyService && order.customer_id) {
          await loyaltyService.earnForPaidOrder({
            customerId: Number(order.customer_id),
            orderId,
            finalAmount: order.final_amount,
            paymentStatus: 'paid',
            executor: connection,
          });
        }
        invalidateReportCache();
        return result('00', 'Confirm Success', 'paid', orderId, { alreadyPaid: false });
      });
    },
  };
}

function defaultConfig() {
  return {
    tmnCode: env.vnpTmnCode,
    hashSecret: env.vnpHashSecret,
    paymentUrl: env.vnpUrl || DEFAULT_PAYMENT_URL,
    returnUrl: env.vnpReturnUrl,
    ipnUrl: env.vnpIpnUrl,
  };
}
// Kien xac nhan da fix VNPay