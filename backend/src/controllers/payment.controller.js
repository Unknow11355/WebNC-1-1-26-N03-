export function createPaymentController(service) {
  if (!service) throw new TypeError('Payment controller requires service');

  function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }

  // Giao diện tự động báo kết quả khi VNPay trả về
  function renderReturnHtml({ title, message, paymentStatus, orderId }) {
    const statusColor =
      paymentStatus === 'paid' ? '#1B7F4D' : paymentStatus === 'pending' ? '#B45309' : '#B91C1C';
    return `<!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #f6f7f9; margin: 0; padding: 20px; text-align: center; }
        .card { max-width: 420px; margin: 48px auto; background: #fff; border-radius: 16px; padding: 30px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        h1 { font-size: 22px; margin: 0 0 10px; color: ${statusColor}; }
        p { color: #374151; line-height: 1.5; }
        .btn { display: inline-block; margin-top: 25px; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${title}</h1>
        <p>${message}</p>
        <p>Mã đơn hàng: <strong>#${orderId || '-'}</strong></p>
        <a href="/#orders" class="btn">Quay lại quản lý đơn hàng</a>
      </div>
    </body>
    </html>`;
  }

  return {
    async createVnpay(req, res) {
      const userId = req.auth.userId;
      const orderId = Number(req.body.order_id || req.body.orderId);
      if (!orderId) return res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng' });

      const data = await service.createVnpayUrl(userId, orderId, clientIp(req));
      res.json({ success: true, data });
    },

    async vnpayReturn(req, res) {
      const result = await service.processVnpayCallback(req.query);
      const title =
        result.paymentStatus === 'paid' ? 'Thanh toán thành công' : 'Thanh toán thất bại';
      const message =
        result.paymentStatus === 'paid'
          ? 'VNPay đã xác nhận thanh toán.'
          : 'Giao dịch không thành công hoặc đã bị hủy.';
      res.status(200).send(
        renderReturnHtml({
          title,
          message,
          paymentStatus: result.paymentStatus,
          orderId: result.orderId,
        }),
      );
    },

    async vnpayIpn(req, res) {
      const result = await service.processVnpayCallback(req.query);
      res.status(200).json({ RspCode: result.rspCode, Message: result.message });
    },
  };
}
