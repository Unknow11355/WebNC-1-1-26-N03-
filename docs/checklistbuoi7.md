# Checklist Buổi 7 — Linh, Vinh, Kiên

Đọc trước [bảng K1–K10](buoi7-v1-doichieu.md) và [hợp đồng V1](buoi7-v1-hopdong.md). Nền chung: `Linh/v1/buoi7` kế thừa Vinh Buổi 6 đã tích hợp `tichhopLinhcheckvasualai`. Không lấy main cũ thiếu bản tích hợp. Đây là checklist giao việc, ô trống chưa hoàn thành/chưa có bằng chứng.

## 1. Làm gì trước?

1. Cả nhóm chạy hồi quy và test đồng thời Buổi 6 đầu buổi, ghi rõ local/online và phiên bản. Lỗi chặn phải ghi lại trước khi phát triển tiếp.
2. Linh/Vinh/Kiên xác nhận hợp đồng, công nghệ frontend và thời điểm bàn giao. Không đổi stack đã đăng ký mà chưa thống nhất.
3. Vinh bàn giao migration, fixture, SQL và mẫu JSON trước. Kiên có thể chuẩn bị upload, test và UI với mock có nhãn rõ trong lúc chờ API.
4. Ghép API thật → kiểm số liệu → kiểm bảo mật/upload/export → phát hành online → Linh nghiệm thu.

## 2. Linh — V1

- [x] Đối chiếu sổ tay trang 39–42 và Phụ lục 03 trang 16.
- [x] Lập bảng K1–K10 có đường dẫn bằng chứng, phần thiếu và chủ việc.
- [x] Soạn hợp đồng tìm kiếm/3 báo cáo/upload/audit và phạm vi bổ sung.
- [x] Phân công Vinh V2/V3 và Kiên V4/V5, thứ tự và tiêu chí bàn giao.
- [ ] Chốt frontend và xác nhận hai bạn đã nhận việc; bổ sung tài liệu kỹ thuật 6.6/VII.7.2.
- [ ] Review code/PR thực tế của từng bạn; ghi link và kết luận, không ghi review khi mới đọc checklist.
- [ ] Chứng kiến các ca kiểm thử bên dưới và kiểm bản online.
- [ ] Cập nhật trạng thái K1–K10, chỉ số V1 và hồ sơ cuối buổi. Chưa đóng buổi chỉ vì đã có tài liệu.

## 3. Vinh — V2/V3

### V2: dữ liệu

- [ ] Tạo nhánh riêng từ nền chung; đọc schema/migration hiện có, không reset DB chung.
- [ ] Viết 3 truy vấn R1/R2/R3 theo hợp đồng: JOIN, aggregate, thời gian, không nhân số tiền do quan hệ 1–n.
- [ ] Tạo fixture đủ nhiều trang, nhiều ngày, trùng tên/giá, nhiều dòng đơn/payment, unpaid/cancelled; kèm bảng đáp án thủ công.
- [ ] Migration audit_logs; nếu làm K9, thêm người nhận/chống lặp cho notifications và xử lý dữ liệu cũ không có owner an toàn.
- [ ] Đề xuất chỉ mục theo WHERE/JOIN/ORDER BY, kiểm tra index có sẵn để tránh trùng; dùng EXPLAIN kiểm chứng, không khẳng định LIKE '%q%' luôn dùng B-tree.
- [ ] Bàn giao script dựng DB test và kết quả 3 truy vấn thực tế; không chỉ ảnh SQL chưa chạy.

### V3: nghiệp vụ/API

- [ ] Mở rộng tìm kiếm nhiều điều kiện, sort allowlist, khóa chính phụ, phân trang server; COUNT cùng điều kiện.
- [ ] 3 API báo cáo admin, validate ngày, timezone thống nhất; cập nhật OpenAPI và JSON mẫu cho Kiên.
- [ ] Audit đăng nhập đúng/sai, đổi quyền, xóa; API tra cứu admin; transaction/rollback đúng và không log bí mật.
- [ ] Phối hợp Kiên gắn ảnh upload vào sản phẩm, không tin URL/path tùy ý.
- [ ] Bổ sung K1 còn thiếu và K9 theo hợp đồng; nếu chưa hoàn thành ghi rõ backlog, không tích đủ 10 khối.
- [ ] Kiểm chứng CRUD 6 thực thể và 3 luồng nhiều vai trò; không tự sửa tùy tiện trạng thái nghiệp vụ source.
- [ ] Chạy `npm run check` trong backend; DB integration trên DB test; bàn giao kết quả thật và giới hạn.

Đầu ra: migration/index, seed/fixture, 3 SQL và kết quả, API/OpenAPI, unit/integration tests, commit riêng. Chỉ số V2: số bảng đủ constraint/index + trung vị truy vấn nóng (ghi số lần/môi trường); V3: endpoint chạy được + quy tắc đã kiểm chứng. Chưa đo thì ghi chưa đo.

## 4. Kiên — V4/V5

### V4: upload và kiểm thử

- [ ] Hiện thực module upload theo ba tầng khi có nghiệp vụ/lưu metadata, giữ middleware kiểm file có thể kiểm thử độc lập.
- [ ] Kiểm chữ ký thực + decode, 5 MiB, kích thước pixel, tên ngẫu nhiên, lưu ngoài đường dẫn thực thi; xử lý file tạm và quyền upload/truy xuất.
- [ ] Thử ảnh đúng, file script đổi đuôi ảnh, MIME giả, ảnh hỏng, quá dung lượng, path traversal và thiếu/sai quyền.
- [ ] Chụp **Ảnh 23**: request tải file giả mạo, phản hồi từ chối và ngữ cảnh; che token/mật khẩu. Không dùng ảnh minh họa làm kết quả thật.
- [ ] Test tìm kiếm/phân trang, đối chiếu ba báo cáo thủ công, CSV ký tự đặc biệt/formula, audit đủ sự kiện và quyền.
- [ ] Chạy hồi quy kho/online/POS, test K1/K9 bổ sung; ghi actual/pass/fail/link bằng chứng.

### V5: giao diện tối thiểu, xuất tệp và online

- [ ] Thống nhất công nghệ frontend với Linh trước khi scaffold; không tự bỏ backend hiện tại.
- [ ] Làm màn hình đăng nhập và 3 báo cáo R1/R2/R3: lọc ngày, bảng, biểu đồ, rỗng/loading/lỗi; dữ liệu thật từ API.
- [ ] Xuất CSV hoặc Excel cho **cả 3 báo cáo**, cùng filter và số liệu; kiểm quyền server và mở được bằng phần mềm bảng tính.
- [ ] Làm màn hình admin tra cứu audit có bộ lọc/phân trang; giao diện upload ảnh. Đây là đầu ra bắt buộc Buổi 7, không hoãn toàn bộ UI đến cuối kỳ.
- [ ] Làm UI tìm kiếm/sort/phân trang; phần bổ sung K10 trang sản phẩm công khai và K9 hộp thông báo theo API Vinh.
- [ ] Phát hành bản tích hợp HTTPS; cấu hình upload bền vững, secrets ngoài repo; kiểm lại sau khởi động/redeploy.
- [ ] Bàn giao URL, phiên bản/commit, hướng dẫn chạy, file xuất mẫu không chứa dữ liệu thật, Ảnh 23 và kết quả test.

Chỉ số V4: số rủi ro BM có bằng chứng, số test đã chạy/tỷ lệ đạt; V5: số phát hành thành công và số trang báo cáo hoàn thành. Không lấy số ca dự kiến làm số đã chạy.

## 5. Bảng nghiệm thu chung (chưa chạy)

Kiên ghi actual/kết luận/người chạy/thời điểm/môi trường và đường dẫn bằng chứng cho mỗi mã; Linh kiểm lại.

| Mã | Ca kiểm thử | Mong đợi |
| --- | --- | --- |
| B7-01 | q + category + min/max price + tồn + sort | Kết quả giao các điều kiện, tổng count đúng; query sai trả 400 |
| B7-02 | limit=1000000; page/limit âm hoặc không nguyên | 400 theo hợp đồng, không truy xuất toàn bộ |
| B7-03 | Duyệt >=3 trang dataset cố định, nhiều giá/tên trùng | Không lặp/bỏ sót; có PK phụ trong sort |
| B7-04 | sort chứa SQL, order lạ | Từ chối 400, không chạy SQL tùy ý |
| B7-05 | 3 báo cáo với fixture R1–R3 | Đúng đáp án thủ công, không nhân doanh thu do nhiều payment/dòng hàng |
| B7-06 | Giao ngày/múi giờ, khoảng rỗng/sai, unpaid/cancelled | Bao đúng biên ngày, loại đúng đơn, không tạo số liệu giả |
| B7-07 | Xuất cả 3 báo cáo; tên có dấu phẩy/nháy/xuống dòng/= | Mở được, đúng cột/Unicode, không chạy công thức; đúng filter |
| B7-08 | Upload ảnh đúng và script đổi thành .jpg | 201 với ảnh đúng, 415 với giả mạo; lưu Ảnh 23 |
| B7-09 | Ảnh quá 5 MiB, ảnh hỏng, tên ../ và thiếu/sai quyền | 413/415/400/401/403 theo ca; không file tùy ý hay file rác |
| B7-10 | Login đúng/sai; đổi quyền; soft-delete; rollback | Có audit đúng outcome/actor/thời gian; rollback không có thành công giả |
| B7-11 | Khách/employee gọi report, export, audit | 403; không token 401; admin lọc được, không lộ secrets |
| B7-12 | Mở UI online 3 báo cáo/upload/audit/search | API thật, đủ biểu đồ/file xuất, có URL/phiên bản; không chỉ screenshot mock |
| B7-13 | Đơn confirm/reject, gửi lại, khách khác đọc thông báo | Đúng người nhận, không trùng, truy cập chéo bị chặn |
| B7-14 | Đổi/reset mật khẩu; token hết hạn/dùng lại; tài khoản khóa | Chính sách xác thực/thu hồi phiên đúng, không lộ tài khoản hoặc token |
| B7-15 | Trang công khai không login, điều khiển bàn phím | Có nội dung, title/description, nhãn/alt/focus; không lộ trang admin |
| B7-16 | Hồi quy Buổi 6 và online trước nộp | Không hỏng tồn/đơn/payment/idempotency; lưu số liệu thực tế |

## 6. Điều kiện kết thúc

- [ ] Tìm kiếm nhiều điều kiện/sort/phân trang phía server hoạt động.
- [ ] Đủ 3 báo cáo có SQL đúng, biểu đồ và file xuất mở được.
- [ ] Upload an toàn có Ảnh 23; audit đủ sự kiện và giao diện admin.
- [ ] Bảng K1–K10 cập nhật trung thực, phần thiếu có chủ việc và hạn thực tế.
- [ ] Bản online hoạt động, bằng chứng/test/chỉ số và lịch sử đóng góp từng người đã nộp.

Thang điểm sổ tay: tìm kiếm 2; báo cáo 3; upload 2; nhật ký 3. Linh chỉ chốt nghiệm thu sau khi có bằng chứng, không lấy điểm dự kiến làm điểm đạt.
