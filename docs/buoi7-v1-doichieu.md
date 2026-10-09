# Buổi 7 — Bảng đối chiếu V1 của Linh

Ngày rà soát: 04/10/2026. Nền: `Vinh/v2-v3/buoi6`, sau commit `tichhopLinhcheckvasualai`. Nhánh bàn giao: `Linh/v1/buoi7`.

## 1. Căn cứ và phạm vi

- Sổ tay thực hành 10 buổi CSE702051, trang 39–42: V1 đối chiếu 10 khối và phân công phần thiếu; V2 truy vấn ba báo cáo/chỉ mục; V3 tìm kiếm/nhật ký; V4 kiểm tra upload; V5 biểu đồ/xuất tệp/online.
- Yêu cầu dự án cuối khóa, Phụ lục 03, trang 16: K1–K10 bên dưới. Các yêu cầu này khác việc sao chép toàn bộ tính năng source cũ.
- Source cũ chỉ tham khảo nghiệp vụ. Không sao chép truy vấn vào controller hoặc tin quyền/giá từ client. Không tự đổi kho và kệ thành một loại tồn.
- Đây là sản phẩm thiết kế/điều phối V1, không phải chứng nhận nhóm hoàn thành Buổi 7. Bảng là rà soát mã nguồn; chưa xác nhận bản online. Bảng SQL tồn tại không đồng nghĩa chức năng đã chạy.
- Chưa có tài liệu hướng dẫn kỹ thuật mục 6.6 và VII.7.2 trong bộ nguồn đã đọc. Nhóm bổ sung và đối chiếu trước nghiệm thu; không tự khẳng định đã tuân thủ những mục chưa đọc.

## 2. Bảng 10 khối chức năng tối thiểu

Đường dẫn bằng chứng dưới đây tương đối với gốc repository. Không đánh dấu “đạt” chỉ vì có route.

| Mã | Yêu cầu của thầy | Hiện trạng và bằng chứng | Phần thiếu / người phụ trách |
| --- | --- | --- | --- |
| K1 | Đăng ký/nhập/xuất, đổi/khôi phục mật khẩu, khóa/mở khóa, phiên/token có hạn | Một phần: `backend/src/routes/auth.routes.js`, `services/auth.service.js`, `routes/user.routes.js`; JWT 1 giờ và session; admin quản lý tài khoản | Vinh: đổi mật khẩu của chính mình, khôi phục có token một lần/hết hạn và thu hồi phiên phù hợp; Kiên: test khóa/mở khóa và phiên cũ. Không coi admin sửa tài khoản là tự đổi mật khẩu |
| K2 | Ít nhất 3 vai trò, kiểm quyền phía server | Có nền admin/employee/customer trong `backend/src/routes/`; các route có middleware, chưa nghiệm thu toàn bộ | Vinh: áp quyền cho API mới; Kiên: test 401/403 và truy cập chéo đối tượng; Linh review ma trận |
| K3 | Ít nhất 3 luồng nhiều bước/nhiều vai trò | Có kho, đơn online, POS qua `services/inventory.service.js`, `order.service.js`, `pos.service.js`; POS đang cash tối thiểu | Vinh/Kiên: chứng minh đầu-cuối và vai trò thực chất của từng luồng; không mặc nhiên tính POS một thao tác là đủ tiêu chí nhiều vai trò. Chạy lại kiểm thử đồng thời đầu buổi; chưa có bằng chứng online trong hồ sơ này |
| K4 | CRUD ít nhất 6 thực thể, validation và toàn vẹn | Có routes users/categories/products/inventory/carts/vouchers; xem thêm `docs/buoi5-v2-v3-crud-matrix.md` | Vinh: đối chiếu đủ C/R/U/D từng thực thể thực tế; Kiên: kiểm tra FK/soft-delete/quyền và giao diện. Không tính số bảng SQL thay CRUD |
| K5 | Tìm nhiều điều kiện, sắp xếp, phân trang server | Một phần: `services/product.service.js`, `repositories/product.repository.js`; q + category, limit tối đa 20, thứ tự product_id ổn định | Vinh: lọc giá/tồn, sort allowlist + khóa chính phụ; test nhiều trang. Hiện limit >20 trả 400, không trả tất cả dữ liệu |
| K6 | Upload đúng kiểu thực/dung lượng, lưu và truy xuất có quyền | Chưa có module upload; trường image_url không phải upload | Kiên V4: upload ảnh an toàn và test; Vinh phối hợp gắn ảnh vào sản phẩm; Kiên UI và Ảnh 23 |
| K7 | 3 báo cáo nhiều bảng/tổng hợp/thời gian, biểu đồ và CSV/Excel | Chưa có module báo cáo trong `backend/src/routes/index.js` | Vinh V2/V3: SQL + API; Kiên V5: 3 biểu đồ + xuất tệp + online. Chi tiết trong hợp đồng Buổi 7 |
| K8 | Log đăng nhập đúng/sai, đổi quyền, xóa; admin tra cứu | Chưa có audit module. `inventory_logs` chỉ là nhật ký kho, không đủ K8 | Vinh: schema/service/hooks/API audit; Kiên: màn hình tra cứu và kiểm thử không lộ bí mật |
| K9 | Thông báo sự kiện nghiệp vụ | Chỉ thấy bảng notifications trong `database/01_schema.sql`, chưa có API; bảng chưa có người nhận | Vinh: thông báo trong ứng dụng cho khách khi đơn được xác nhận/từ chối, thêm người nhận và chống lặp; Kiên: UI và test chủ sở hữu. Không cần gửi email/SMS thật |
| K10 | Nhóm trang công khai, metadata, khả năng truy cập | API sản phẩm công khai đã có; chưa có frontend web trong nền này | Kiên V5 nhận phạm vi bổ sung: trang danh sách/chi tiết công khai, tiêu đề/description, bàn phím/nhãn ảnh. Linh duyệt phạm vi; API JSON không thay trang công khai |

Kết luận: K1/K5 mới một phần; K6–K10 thiếu các đầu ra quan trọng; K2–K4 có nền để kiểm chứng, chưa đủ căn cứ đóng toàn bộ. Không quy đổi bảng này thành phần trăm hoàn thành dự án.

## 3. Quyết định kiến trúc và thứ tự

1. Giữ Node.js/Express + MySQL, controller → service → repository, `/api/v1`, lỗi tập trung và quy tắc `CONTRIBUTING.md`.
2. Buổi 7 ưu tiên K5/K6/K7/K8; sau đó đóng lỗ hổng K1/K9/K10. Nếu chưa kịp phải báo thiếu, không đánh dấu đủ 10 khối.
3. Giao diện tối thiểu cần ngay: đăng nhập quản trị; tìm kiếm sản phẩm; 3 báo cáo; upload; tra cứu audit. Trang công khai và hộp thông báo nằm trong checklist bổ sung. Không yêu cầu hoàn thiện toàn bộ giao diện source cũ trong một buổi.
4. Chưa tự chốt React hay Flutter Web thay nhóm. Kiên và Linh xác nhận công nghệ phù hợp đăng ký trước khi tạo frontend. API/hợp đồng bên dưới độc lập công nghệ.
5. Chưa làm thêm VNPAY production, hóa đơn điện tử thật, đa chi nhánh hay mua hàng đầy đủ. Lịch/ca/điểm/đánh giá vẫn là backlog phạm vi nhóm, không bị xóa vì Buổi 7 tập trung khối khác.

## 4. Theo dõi V1

| Hạng mục kế hoạch V1 | Trạng thái |
| --- | --- |
| Rà sổ tay và Phụ lục 03 | Xong |
| Đối chiếu K1–K10 với code nền | Xong |
| Soạn hợp đồng và tiêu chí bàn giao | Xong |
| Phân công Vinh/Kiên | Xong |
| Review yêu cầu hợp nhất của hai bạn | Chờ code |
| Chứng kiến nghiệm thu, kiểm bằng chứng online | Chờ chạy |

Chỉ số tại lúc lập: yêu cầu hợp nhất đã review trong Buổi 7 = **0**; kế hoạch V1 = **4/6 = 66,7%**. Đây không phải phần trăm hoàn thành Buổi 7 của cả nhóm. Bảng này là nơi ghi chỉ số V1 trong repo; nếu lớp dùng dashboard riêng, Linh còn phải nhập vào đó.

Lịch bàn giao thực tế: chốt frontend ___; SQL/API ___; UI/upload ___; test ___; online ___; hạn nộp ___ (nhóm điền, không tự đặt giờ giả).

Đọc tiếp: [Hợp đồng triển khai](buoi7-v1-hopdong.md) và [Checklist từng người](checklistbuoi7.md).
