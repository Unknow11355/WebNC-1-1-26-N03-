import crypto from 'node:crypto';
import { AppError } from '../errors/app-error.js';

export function createPaymentService({ paymentRepository }) {
  if (!paymentRepository) throw new TypeError('Payment service requires paymentRepository');

  // Cấu hình Sandbox mặc định (bạn có thể đưa vào file .env sau)
  function getConfig() {
    return {
      tmnCode: process.env.VNP_TMN_CODE || 'X8TMBV7T', // Thay bằng mã Sandbox của nhóm nếu có
      hashSecret: process.env.VNP_HASH_SECRET || 'IKPOGMZXOMKAYWOSQAYLDBKIFIFKAYWO',
      paymentUrl: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: process.env.VNP_RETURN_URL || 'http://localhost:5173/api/v1/payments/vnpay-return',
      ipnUrl: process.env.VNP_IPN_URL || 'http://localhost:5173/api/v1/payments/vnpay-ipn',
    };
  }

  function buildTxnRef(orderId) {
    return `${orderId}_${Date.now().toString().slice(-10)}`;
  }

  function sortAndEncodeParams(params) {
    return Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
      .join("&");
  }

  function hmacSha512(secret, data) {
    return crypto.createHmac("sha512", secret).update(Buffer.from(data, "utf-8")).digest("hex");
  }

  function formatVnpDate(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      date.getFullYear().toString() + pad(date.getMonth() + 1) + pad(date.getDate()) +
      pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds())
    );
  }

  return {
    async createVnpayUrl(userId, orderId, ipAddr) {
      const order = await paymentRepository.getOrderForPayment(orderId);
      if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
      if (Number(order.customer_id) !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Không có quyền thanh toán đơn này');
      }
      if (['paid', 'success'].includes(String(order.payment_status || '').toLowerCase())) {
        throw new AppError(400, 'BAD_REQUEST', 'Đơn hàng đã được thanh toán');
      }

      const config = getConfig();
      const txnRef = buildTxnRef(orderId);
      const createDate = new Date();
      const expireDate = new Date(createDate.getTime() + 15 * 60 * 1000); // 15 phút
      const vnpAmount = Math.round(Number(order.final_amount) * 100);

      const params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: config.tmnCode,
        vnp_Amount: vnpAmount,
        vnp_CurrCode: "VND",
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
        vnp_OrderType: "other",
        vnp_Locale: "vn",
        vnp_ReturnUrl: config.returnUrl,
        vnp_IpAddr: ipAddr || "127.0.0.1",
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

      const txnRef = input.vnp_TxnRef || "";
      const orderIdMatch = String(txnRef).match(/^(\d+)/);
      const orderId = orderIdMatch ? Number(orderIdMatch[1]) : null;

      if (!receivedHash || receivedHash !== expectedHash) {
        return { success: false, httpStatus: 400, rspCode: "97", message: "Sai chữ ký bảo mật", paymentStatus: "failed", orderId };
      }
      if (!orderId) {
        return { success: false, httpStatus: 400, rspCode: "01", message: "Không tìm thấy đơn hàng", paymentStatus: "failed", orderId: null };
      }

      const order = await paymentRepository.getOrderForPayment(orderId);
      if (!order) {
        return { success: false, httpStatus: 404, rspCode: "01", message: "Order not found", paymentStatus: "failed", orderId };
      }

      const expectedAmount = Math.round(Number(order.final_amount) * 100);
      if (expectedAmount !== Number(input.vnp_Amount || 0)) {
        return { success: false, httpStatus: 400, rspCode: "04", message: "Sai số tiền", paymentStatus: "failed", orderId };
      }

      if (input.vnp_ResponseCode === "00") {
        const result = await paymentRepository.markOrderPaid(orderId, txnRef, "vnpay");
        return { success: true, httpStatus: 200, rspCode: "00", message: "Confirm Success", paymentStatus: "paid", orderId, alreadyPaid: result.alreadyPaid };
      } else {
        await paymentRepository.markOrderFailed(orderId, txnRef, "vnpay");
        return { success: true, httpStatus: 200, rspCode: "00", message: "Confirm Success", paymentStatus: "failed", orderId };
      }
    }
  };
}