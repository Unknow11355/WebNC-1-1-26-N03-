# CN11 — Voucher khách hàng và POS

## Quy tắc hiện thực

- Khách xem voucher mới khả dụng tại `GET /api/v1/vouchers/available`, xem voucher đã lưu tại `GET /api/v1/vouchers/mine`, và lưu mã bằng `POST /api/v1/vouchers/claim`.
- Voucher phải được lưu vào tài khoản khách trước khi dùng online hoặc tại POS. Nhân viên xem voucher đã lưu của khách qua `GET /api/v1/vouchers/customers/:customerId`.
- Checkout online và POS khóa voucher trước khi tính giảm; cập nhật `vouchers.used_count` bằng câu UPDATE có điều kiện `used_count < usage_limit`. InnoDB chỉ cho một giao dịch lấy lượt cuối cùng; giao dịch còn lại nhận lỗi xung đột.
- Online tính voucher trước điểm. POS cũng tính voucher trước, rồi mới đổi điểm; POS yêu cầu có khách khi dùng voucher hoặc điểm. Giá, tồn, giảm giá và tổng tiền đều được máy chủ tính lại.
- Idempotency key POS bao gồm khách, mã voucher, số điểm và sản phẩm. Gửi lại đúng phiếu không tính lại voucher hoặc điểm.
- Ngày hết hạn là ngày lịch Việt Nam và còn dùng được hết ngày `expiry_date`.
- Khi đơn online chưa thanh toán bị nhân viên từ chối, giao dịch hoàn tồn kho, lượt voucher toàn cục, lượt voucher của khách và điểm đã đổi cùng transaction. Lặp yêu cầu từ chối không hoàn lượt lần hai.

## Phạm vi hủy

POS hiện ghi nhận tiền mặt là đã thanh toán ngay trong transaction. Hệ thống chưa có quy trình hủy/hoàn tiền cho đơn POS đã thanh toán; không tự hoàn lượt voucher sau một giao dịch POS đã commit. Nếu thêm luồng void/refund POS, cần thống nhất quy trình hoàn tiền trước rồi mới hoàn lượt và điểm.

## Các ca kiểm tra đã thêm

- Ngày hết hạn hôm nay còn dùng được; ngày trước hôm nay bị từ chối.
- Hai giao dịch tranh lượt cuối: chỉ một UPDATE tăng bộ đếm được chấp nhận.
- Từ chối đơn online hoàn bộ đếm toàn cục và bộ đếm voucher của khách đúng một lần.
- Claim voucher hết hạn không tạo dòng `user_vouchers`.
- POS có khách đổi điểm: trừ điểm trong transaction và tính điểm tích từ số tiền cuối sau giảm.

Các ca trên là kiểm tra tự động qua repository/service. Xác nhận tính đồng thời trên MySQL thật và chạy fixture báo cáo cần dịch vụ MySQL khả dụng.
