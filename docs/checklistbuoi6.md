# Checklist Buổi 6 và phân công nhóm

Ngày lập: 02/10/2026. Nhánh tài liệu: `Linh/v1/buoi6`, bắt đầu từ `Vinh/v2-v3/buoi5`, bản `Linhcheckvasualai`.

Đây là bàn giao thiết kế V1 của Linh, không phải xác nhận đã code hoặc nghiệm thu Buổi 6. Không thay đổi mã ứng dụng trong lần bàn giao này.

## 1. Căn cứ và điều kiện bắt đầu

- Sổ tay thực hành 10 buổi CSE702051, trang 35–38: ít nhất 3 luồng hoàn chỉnh; thuật toán theo khung đã xác định và mã giả; ràng buộc database; 50 yêu cầu song song, bảng kết quả và Ảnh 31. V5 triển khai online và viết mục 3.6.
- Đầu buổi thầy chạy lại hai luồng Buổi 5 trên online. Kết quả local không thay thế yêu cầu này.
- Source tham khảo: `backend_nodejs/src/routes/order.routes.js`, `POST /` (từ dòng 1004 ở bản khảo sát): đơn offline, hàng bán lấy từ products, transaction đơn/chi tiết/payment, ca đang mở nếu có, voucher và điểm. Chỉ khảo sát tĩnh source cũ, không tuyên bố đã chạy lại nó.
- Nền mới: `docs/checklistbuoi5.md`, `docs/Linhcheckvasualai.md`, `database/01_schema.sql`, services/repositories đơn và kho. Hai luồng đã có là kho → kệ và đơn online.
- Chưa tìm thấy tài liệu “Định hướng theo từng đề tài” xác nhận mã khung T1–T6. **Không tự gán T nào**. Linh cùng nhóm phải đối chiếu tài liệu đó trước khi duyệt thuật toán để Vinh code. Thiết kế chống trừ tồn trùng bên dưới là đề xuất kỹ thuật, không thay thế khung của thầy.

Thiết kế: [Mã giả và hợp đồng nghiệp vụ](buoi6-v1-thietke-magia.md). Theo dõi: [Nhật ký V1](buoi6-v1-nhatky.md).

## 2. Phạm vi và người phụ trách

| Thành viên | Vai trò | Đầu ra |
| --- | --- | --- |
| Linh | V1 | Rà thiết kế trước code; mã giả đã rà thiết kế; sau bàn giao đối chiếu code, test và mã giả |
| Vinh | V2/V3 | Migration/ràng buộc, transaction/khóa hàng, luồng thứ ba, thuật toán và mã giả cập nhật theo code |
| Kiên | V4/V5 | Kịch bản và kết quả test, Ảnh 31, bằng chứng vi phạm DB, bản online, mục 3.6 |

Luồng thứ ba đề xuất: **bán tại quầy cash**, từ chọn hàng → thu ngân xác nhận đã thu tiền → tạo đơn offline/chi tiết/payment → trừ tồn kệ → trả chứng từ bán hàng. Không coi hóa đơn điện tử pháp lý là đầu ra của luồng này.

Giữ source: kho và kệ tách biệt; offline mặc định completed/paid sau khi thu ngân xác nhận cash; có thể khách vãng lai; ca hiện hành gắn vào đơn nếu có, không tự thêm điều kiện bắt buộc ca đang mở. Voucher/điểm không bị xóa khỏi phạm vi chung: cần chốt lịch triển khai và quy tắc nguồn trước khi hỗ trợ ở POS. Nếu chưa làm, từ chối rõ yêu cầu sử dụng chúng; không âm thầm bỏ qua hoặc đánh dấu POS đầy đủ tính năng source.

## 3. Checklist Linh V1

- [x] Xác định nền Buổi 5 và kiểm tra worktree sạch trước khi tạo nhánh.
- [x] Khảo sát luồng offline trong source và bảng orders/order_items/payments hiện có.
- [x] Soạn luồng thứ ba đề xuất, bất biến, hợp đồng API, mã giả và điểm sửa có lý do.
- [x] Giao việc riêng V2/V3 và V4/V5, lập tiêu chí kiểm thử.
- [ ] Xác nhận khung T1–T6 với tài liệu định hướng và ghi nguồn cụ thể.
- [ ] Nhóm xác nhận phạm vi POS cash, kế hoạch voucher/điểm/ca, mã lỗi và hợp đồng request trước khi code.
- [ ] Review migration, thứ tự khóa nhất quán với các luồng cũ và mã xử lý yêu cầu lặp.
- [ ] Sau Vinh bàn giao: đối chiếu từng bước mã giả với file/hàm thực tế; chưa được tích ô này chỉ vì đã có mã giả.
- [ ] Chứng kiến test của Kiên; review bảng kết quả, dữ liệu trước/sau, URL và phiên bản online.
- [ ] Cập nhật số yêu cầu hợp nhất đã review và tỷ lệ hoàn thành theo việc thực tế; không tự ghi 100%.

## 4. Checklist Vinh V2 và V3

### Trước code

- [ ] Đọc thiết kế V1, phản hồi chỗ khác source; chốt với Linh khung thuật toán, phạm vi và API.
- [ ] Bắt đầu từ bản đã có `Linhcheckvasualai`; không lấy main cũ nếu thiếu bản sửa.
- [ ] Lập ma trận bảng nào bị ghi trong POS, checkout online, reject và chuyển kho lên kệ.
- [ ] Kiểm tra dữ liệu cũ trước khi thêm NOT NULL/CHECK/UNIQUE; không tự xóa dữ liệu vi phạm.

### V2 dữ liệu

- [ ] Migration riêng cho CHECK tồn >= 0; quantity > 0; tiền >= 0; chặn NULL ở các cột bắt buộc. CHECK một mình không chặn NULL.
- [ ] Bổ sung bảng chống lặp với UNIQUE(actor_id, operation, request_key), request_hash và order_id; FK/index phù hợp.
- [ ] Chạy migration trên DB test mới và thử áp lại theo hướng dẫn; ghi phiên bản MySQL/MariaDB và xác nhận CHECK được thực thi thật.
- [ ] Repository nhận cùng connection từ service; khóa sản phẩm theo product_id tăng dần, dùng UPDATE có điều kiện đủ tồn.
- [ ] Bảo đảm POS và online dùng cùng hàng products khi tranh chấp tồn; rà thứ tự khóa voucher/sản phẩm và nhiều sản phẩm để tránh khóa ngược nhau.
- [ ] Seed riêng cho 50 lượt mua và 10 sản phẩm khả dụng; có dữ liệu hết hàng, sản phẩm ngừng bán, đơn nhiều dòng và yêu cầu lặp.
- [ ] Thử SQL vi phạm trực tiếp và giao Kiên script an toàn trên DB test; không chạy reset vào DB đang dùng.
- [ ] Cập nhật chỉ số V2 bằng số thực: bảng đủ ràng buộc/chỉ mục và P50 truy vấn nóng, kèm điều kiện đo.

### V3 nghiệp vụ

- [ ] Thêm POS theo Route → Controller → Service → Repository; không đặt SQL trong service.
- [ ] Xác thực employee/admin; lấy employee_id từ phiên; kiểm tra khách gắn đơn nếu có.
- [ ] Validate danh sách không rỗng, số lượng nguyên dương an toàn; gộp dòng trùng product_id trước khi kiểm tồn.
- [ ] Lấy giá từ database, không tin giá/tổng tiền/paid/employee_id client gửi; kiểm giới hạn DECIMAL và chính sách làm tròn.
- [ ] Tạo đơn offline completed, payment cash paid và trừ tồn **trong một transaction**, sau thao tác xác nhận thu tiền.
- [ ] Cùng request key + cùng payload trả cùng đơn, không trừ tồn lần hai; key cũ + payload khác trả 409.
- [ ] Lỗi giữa giao dịch rollback đơn/chi tiết/payment/tồn/bản ghi chống lặp; luôn release connection.
- [ ] Không đổi luồng online Buổi 5 ngoài sửa lỗi có căn cứ. Nếu khung máy trạng thái được chọn, thống nhất đổi lỗi chuyển trạng thái sang 422 và cập nhật regression/OpenAPI; không đổi mọi lỗi 409 thành 422.
- [ ] Cập nhật OpenAPI, ví dụ request/response/lỗi, hướng dẫn chạy và mã giả theo code thật.
- [ ] Chạy npm run check, test DB và test riêng POS; giao commit có tên dễ hiểu cùng lỗi chưa xử lý.
- [ ] Cập nhật chỉ số V3: endpoint thực sự chạy được và quy tắc đã kiểm chứng.

## 5. Checklist Kiên V4 và V5

### Chuẩn bị song song

- [ ] Chuẩn bị DB test, 4 nhóm quyền/tài khoản, script gửi yêu cầu song song và lưu kết quả từng request.
- [ ] Ghi dữ liệu đầu vào, kỳ vọng, phiên bản, môi trường, thời gian chạy cho mỗi ca; không ghi đạt khi chỉ mới viết test.
- [ ] Hoàn tất minh chứng hai luồng Buổi 5 trên online trước nghiệm thu đầu Buổi 6.
- [ ] Chuẩn bị bản nháp mục 3.6 từ mã giả Vinh/Linh thống nhất; chưa ghi là code đã khớp khi chưa review.

### Kiểm thử V4

- [ ] Chạy toàn bộ bảng mục 6, gồm 50 giao dịch độc lập và test gửi lặp cùng key riêng biệt.
- [ ] Đối chiếu tồn, số đơn, chi tiết, payment và key thành công trong DB; không chỉ đếm response 2xx.
- [ ] Gửi SQL vi phạm bất biến trực tiếp; lưu câu lệnh, lỗi DB và dữ liệu không đổi.
- [ ] Gây lỗi trong bộ test tại nhiều điểm giữa transaction, kiểm tra rollback; không đưa endpoint gây lỗi lên online.
- [ ] Test 401/403, giả employee_id/giá/trạng thái từ client, key của nhân viên khác không trả nhầm đơn.
- [ ] Chạy hồi quy kho/checkout/confirm/reject/receive/thu tiền và kiểm tra thứ tự khóa khi POS tranh tồn với online.
- [ ] Nếu dùng giữ chỗ: test hết hạn trả tài nguyên. Nếu dùng máy trạng thái: test chuyển sai trả 422.
- [ ] Lưu Ảnh 31 rõ công cụ, 50 request, thành công/thất bại và dữ liệu trước/sau; che token/mật khẩu.

### Triển khai và tài liệu V5

- [ ] Phát hành bản tích hợp lên môi trường online; cấu hình HTTPS/secrets/DB đúng, không public bí mật.
- [ ] Chạy lại ba luồng và kiểm thử đồng thời trên bản online bằng dữ liệu test đã thống nhất, không dùng dữ liệu kinh doanh thật.
- [ ] Mục 3.6 gồm bài toán, đầu vào/đầu ra, bất biến, mã giả, transaction/khóa, xử lý lặp/lỗi, kết quả 50 request và giới hạn.
- [ ] Bàn giao bảng kết quả + Ảnh 31 + link phiên bản/URL + mã giả + script DB/test; ghi rõ người chạy và thời điểm.
- [ ] Cập nhật chỉ số V4 (rủi ro có bằng chứng, test/tỷ lệ đạt) và V5 (phát hành thành công, trang báo cáo).

## 6. Bảng nghiệm thu giao Kiên

Tất cả các ca dưới đây **chưa chạy trong Buổi 6**. Mỗi ca cần thêm cột thực tế, bằng chứng và người chạy khi thực hiện.

| Mã | Kịch bản | Kết quả mong đợi |
| --- | --- | --- |
| B6-01 | POS cash hợp lệ qua employee | 201; 1 đơn offline completed, payment paid; trừ tồn đúng một lần |
| B6-02 | 50 key khác nhau, 50 yêu cầu song song, cùng sản phẩm tồn 10, mỗi yêu cầu mua 1 | 10 đơn thành công, 40 lỗi hết hàng 409; tồn 0; 10 payments và 10 đơn mới; không lỗi 500/deadlock chưa xử lý |
| B6-03 | 50 yêu cầu đồng thời, cùng actor/key/payload | Chỉ 1 đơn và 1 payment; tồn giảm 1; các phản hồi thành công cùng order_id |
| B6-04 | Cùng actor/key nhưng đổi payload | 409 KEY_REUSE_CONFLICT; không ghi thêm hoặc trả kết quả của payload khác |
| B6-05 | Hai dòng cùng product_id, tổng lượng vượt tồn | Chặn sau gộp dòng; không âm tồn/không ghi dở |
| B6-06 | SQL trực tiếp đặt tồn -1, quantity 0, giá trị bắt buộc NULL | DB từ chối; dữ liệu không đổi |
| B6-07 | Gây lỗi sau trừ tồn hoặc tạo payment | Rollback toàn bộ dữ liệu và key của giao dịch lỗi |
| B6-08 | Mất phản hồi sau commit rồi gửi lại cùng key | Trả lại đúng đơn cũ; tồn/payment không thay đổi lần hai |
| B6-09 | Khách gọi POS; thiếu token; giả giá/employee_id/paid | 403/401; dữ liệu không bị thao túng; giá và danh tính từ server |
| B6-10 | Thiếu hàng, hàng inactive, quantity null/NaN/âm/lẻ | 400/404/409 theo hợp đồng; không ghi dữ liệu |
| B6-11 | POS và checkout online tranh cùng tồn cuối | Tổng bán không vượt tồn; không âm tồn; transaction lỗi không để lại dữ liệu dở |
| B6-12 | Đơn hai sản phẩm gửi theo thứ tự đảo ngược | Khóa theo thứ tự thống nhất; không deadlock chưa xử lý; không bán vượt tồn |
| B6-13 | Hồi quy ba luồng trên online | Có URL, phiên bản, ảnh và dữ liệu đúng; không dùng kết quả local thay thế |
| B6-14 | Ca theo khung thuật toán đã xác nhận | Giữ chỗ hết hạn hoặc chuyển sai trạng thái 422 theo đúng khung; không tự tích N/A trước khi chốt |

## 7. Thứ tự bàn giao và tiêu chí kết thúc

1. Linh chốt khung, phạm vi, mã giả với Vinh/Kiên; Kiên hoàn tất online Buổi 5.
2. Vinh giao schema/hợp đồng trước; Kiên chuẩn bị fixture và test song song.
3. Vinh giao luồng POS/thuật toán; Linh review code so với mã giả; Kiên test và lập lỗi.
4. Vinh sửa, Kiên kiểm tra lại và triển khai; Linh kiểm tra bằng chứng trước khi đánh dấu đạt.

Mốc thực tế nhóm điền: chốt thiết kế ___; bàn giao code ___; test ___; online ___; hạn nộp ___. Theo sổ tay: nộp cuối buổi, tối đa 24 giờ nếu có lý do chính đáng.

Chỉ nghiệm thu khi đủ 3 luồng, đúng khung thuật toán có mã giả khớp code, ràng buộc DB chặn được vi phạm, 50 request có kết quả đúng và Ảnh 31, mục 3.6 và bản online. Điểm thầy phân bổ: luồng 2; thuật toán 3; bất biến 2; đồng thời 3.
