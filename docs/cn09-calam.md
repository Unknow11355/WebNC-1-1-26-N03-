# CN09 — Thực hiện ca làm

Nhánh `Linh/chucnang/calam`, nền main `8c99451`. Nguồn nghiệp vụ: source cũ `backend_nodejs/src/routes/workShift.routes.js`, `employeeSchedule.routes.js`.

## Phạm vi và thay đổi có lý do

- Nhân viên mở/kết thúc/xem ca của mình. Admin chọn nhân viên và thao tác thay, không mở ca mang danh admin. Khách hàng bị từ chối. Nhân viên inactive không được mở ca; admin có thể đóng ca tồn của nhân viên inactive qua API.
- Giữ full-time/part-time và lịch ngày CN08: leave/sick/blocked cấm mở ca. Thay đổi lịch không tự đóng ca đã mở.
- Dùng trạng thái `active` khi mở (tương thích POS hiện tại), `completed` khi đóng. Đọc được trạng thái cũ `working`/`open`. Mở trùng trả 409, không tự tạo ca thứ hai.
- Mỗi thao tác start/end khóa dòng nhân viên trong transaction. POS dùng cùng khóa, nên kết thúc ca và bán hàng được tuần tự hóa. Không thay công thức tiền/voucher/điểm, không sửa order.service.js.
- POS tự lấy ca mở của người bán, kể cả qua ngày; không cho client gán shift_id. Không có ca vẫn được bán với shift_id NULL như trước. Đơn online không tự gắn ca bằng suy đoán.
- `end` yêu cầu shift_id chính xác: retry màn hình cũ không đóng nhầm ca mới. Mở ca không tự retry; sau lỗi mất mạng tải lại trạng thái trước khi bấm tiếp.
- Giờ nghiệp vụ lấy từ DB UTC + 7, không tin thời gian client hoặc timezone máy chạy Node. Bổ sung ended_at để ca qua đêm có ngày kết thúc rõ; không đoán ngày kết thúc của bản ghi lịch sử.
- Chưa thêm bảng tính lương, duyệt công, chia giờ dự kiến hay tự đóng ca quá hạn. Lịch sử phân trang tối đa 20, lọc tháng theo ngày bắt đầu ca; ca đang mở xem riêng, không bị ẩn bởi bộ lọc tháng.

## Cài đặt

Chạy **một lần** `database/cn09_shift_end.sql` trên đúng DB ứng dụng đã có schema Buổi 6. Script chỉ thêm cột nullable, không xóa/reset hay sửa bản ghi cũ. Kiểm tra `SHOW COLUMNS FROM work_shifts LIKE 'ended_at'` trước; đã có cột thì bỏ qua. Không chạy lại ALTER mù quáng. Bàn giao migration tên riêng này cho Vinh khi tích hợp.

Khởi động lại backend và frontend. Menu **Ca làm**: employee thấy ca của mình; admin chọn nhân viên. Bấm Bắt đầu ca / Kết thúc ca; lịch sử hiện phía dưới. Mã ca và ngày giờ được server quyết định.

## API

Prefix `/api/v1/work-shifts`, Bearer JWT; employee self hoặc admin.

| Method | Path | Dữ liệu |
| --- | --- | --- |
| GET | `/employee/:employeeId/current` | Ca mở hoặc null |
| GET | `/employee/:employeeId` | year, month bắt buộc; page=1, limit=20; items/page/limit/total |
| POST | `/employee/:employeeId/start` | Body `{}`, trả 201 |
| POST | `/employee/:employeeId/end` | Body `{ "shift_id": 123 }`, trả 200 |

400 dữ liệu sai, 401 chưa đăng nhập, 403 sai quyền, 404 không có nhân viên, 409 xung đột/ca trùng/ngày chặn. Envelope success/data và lỗi tập trung theo dự án.

## Kiểm thử và bàn giao

Kết quả local 07/10/2026: 64/64 backend unit tests, 6/6 frontend unit tests, 27 điểm E2E đạt, không có lỗi JavaScript trình duyệt. Admin đóng ca qua đêm được kiểm tra trên UI và SQL (ngày kết thúc cách ngày bắt đầu một ngày). Đặc tả máy đọc: [cn09.openapi.json](cn09.openapi.json).

Chạy backend `node --test test/*.test.js` (64 tests); không dùng `node --test` không giới hạn: main có script test_concurrency.cjs của Vinh gửi request tới cổng 3000, không thuộc bộ test cô lập. Không sửa script đó trong CN09.

Frontend `node --test test/*.test.mjs`; E2E `node test/e2e.mjs` với dependency Playwright theo README. E2E tự tạo DB ngẫu nhiên, apply migration, kiểm UI mở/kết thúc, đơn POS có mã ca, mở đồng thời chỉ một yêu cầu thắng, quyền chéo, ca cũ không đóng ca mới, ngày nghỉ bị chặn; chạy hồi quy chức năng cũ và kiểm màn hình 390px. Unit test kiểm ca qua nửa đêm, validation, phân quyền, tháng nhuận.

Vinh kiểm chéo migration/khóa POS và dữ liệu ca; Kiên kiểm chéo quyền, retry và triển khai. Kết quả local không thay bằng chứng online hay kiểm thử thiết bị thật. Dữ liệu cũ có nhiều ca mở cần rà soát riêng trước triển khai, không tự xóa/đóng hàng loạt.
