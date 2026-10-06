# CN03 và CN08 — Mã vạch, lịch nhân viên

Ngày 06/10/2026. Nhánh `Linh/chucnang/mavach-lichnhanvien`, kế thừa nhánh hồ sơ `Linh/chucnang/capnhathoso`. Khi merge vào main chưa có hồ sơ, lịch sử nhánh cũng bao gồm CN02; không merge thiếu phụ thuộc.

## Đối chiếu source cũ

Nguồn: `backend_nodejs/src/routes/product.routes.js` (scan/check-code/generate-code) và `employeeSchedule.routes.js`; giao diện `lib/screens/scan_product_screen.dart`, `employee_shift_schedule_screen.dart` là tham khảo luồng. Nguồn được khảo sát tĩnh, không khẳng định source cũ đã được chạy lại.

Giữ: tra mã trên products trước, inventory_items sau; check trùng xét cả hàng inactive; tạo mã nội bộ với tiền tố. Kho và kệ có thể cùng barcode do nghiệp vụ xuất kho, không thêm ràng buộc cấm liên kết này. DB UNIQUE của từng bảng vẫn quyết định khi lưu. Mã sinh chưa giữ chỗ; thay timestamp đơn thuần bằng 8 byte ngẫu nhiên để giảm va chạm giữa yêu cầu đồng thời; thử lại tối đa 20 lần, không hứa tuyệt đối không trùng. Không phải mã GS1/EAN chính thức và chưa có chức năng in tem.

Giữ lịch: full_time mặc định scheduled, part_time flexible; admin đánh dấu leave/sick/blocked hoặc clear/scheduled để xóa override. Dùng đúng `employee_day_overrides` và `work_shifts` hiện có, không cần migration mới. **Không tự thêm chia ca sáng/chiều, giờ dự kiến hay chặn POS khi chưa mở ca.** employment_type lấy từ dữ liệu nhân viên hiện có, màn hình lịch không sửa loại hợp đồng.

Sửa hợp lý: ngày thực sự tồn tại, tháng/năm có giới hạn; kiểm quyền server; actor set_by lấy từ JWT; không để client giả người lập lịch; đọc đủ các ca trong ngày thay vì bỏ các ca sau ca đầu; worked_days đếm ngày khác nhau chứ không đếm số ca. Lịch ghi đè cùng ngày dùng UNIQUE + UPSERT như source, lần ghi sau thắng; chưa có lịch sử phiên bản/optimistic locking.

## Sử dụng

- Đăng nhập employee/admin → **Mã vạch**: nhập/quét bàn phím rồi Enter; kiểm tra trùng; tạo mã và sao chép vào form tạo/sửa sản phẩm hoặc mặt hàng kho. Hàng trên kệ có thể đưa vào phiếu POS; hàng chỉ ở kho phải xuất lên kệ trước.
- Nút **Quét bằng camera** chỉ xin quyền khi người dùng bấm; dừng camera khi tìm được mã, bấm dừng, chuyển trang hoặc ẩn tab. Ảnh camera xử lý tại trình duyệt, chỉ gửi chuỗi mã tới API. Khi không hỗ trợ/từ chối quyền, nhập mã vẫn hoạt động.
- Admin → **Lịch nhân viên** → chọn tháng, nhân viên → chọn trạng thái/ngày và ghi chú → Lưu ngày. Đổi nhân viên tự nạp lại lịch để tránh thao tác trên bảng cũ.
- Employee → **Lịch nhân viên**: chỉ xem lịch của mình, không có nút sửa. Customer không có quyền vào API hoặc menu.
- `schedule_allows_work` chỉ mô tả cho phép theo lịch, **không phải xác nhận đã được mở ca**. CN09 sau này phải kiểm tra thêm ca đang mở, ngày/giờ và gọi kiểm tra lịch tại server. Chưa nối hoặc sửa chức năng bắt đầu/kết thúc ca trong lần này.

Camera dùng BarcodeDetector, phụ thuộc trình duyệt/secure context; tham khảo [MDN](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector). Chưa kiểm chứng quét camera điện thoại thật; không đánh dấu camera đã nghiệm thu. Luồng nhập mã/máy quét bàn phím không phụ thuộc API camera.

## Ranh giới code

- Repository: barcode.repository.js, schedule.repository.js (chỉ SQL tham số hóa).
- Service: barcode.service.js, schedule.service.js (validation/quy tắc/quyền).
- Controller/routes: staff-tools.controller.js, staff-tools.routes.js; wiring tại server/app/routes index. Route công khai products không bị buộc đăng nhập khi gắn module mới.
- Frontend: `frontend/staff-tools.js`; app.js chỉ thêm import/menu/điểm gọi. Giữ nguyên module của Vinh/Kiên, order.service.js và pos.service.js không đổi.
- Đặc tả bổ sung: [staff-tools.openapi.json](staff-tools.openapi.json). Các API mới cùng `/api/v1`, envelope/lỗi theo chuẩn dự án.

## Kiểm thử

Backend 58/58 tests đạt, gồm 7 test mới: thứ tự kệ/kho, mã trùng/inactive, thiếu mã/validation, giới hạn sinh mã, tháng nhuận, ngày ca duy nhất, lịch full-time/part-time, phân quyền và clear.

E2E trên Chrome + API + DB test riêng: kiểm tra tra mã UI/generate/check; admin lưu ngày nghỉ đúng set_by và SQL; employee xem mình 200, xem người khác 403, sửa 403; admin clear xóa override. Chạy hồi quy các luồng cũ. Kết quả browser chỉ là local, không thay bằng chứng online/điện thoại thật. Camera thực tế, máy quét vật lý và nhiều admin sửa cùng lúc chưa nghiệm thu.

Chạy `npm test` trong backend; frontend `node test/e2e.mjs` theo hướng dẫn dependency/DB test trong frontend/README.md. Script E2E tạo và dọn database test riêng, không reset DB nhóm.
