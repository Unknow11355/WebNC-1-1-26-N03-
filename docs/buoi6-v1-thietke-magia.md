# Thiết kế và mã giả Buổi 6 của Linh

Ngày 02/10/2026. Trạng thái: đã rà thiết kế tĩnh; **chưa đối chiếu với code Buổi 6**. Đề xuất POS cash và chống trừ tồn trùng, chờ xác nhận khung T1–T6 theo tài liệu định hướng. Không coi đây là thuật toán đã nghiệm thu.

## 1. Quy tắc giữ lại và chỉnh có căn cứ

Nguồn: `backend_nodejs/src/routes/order.routes.js`, POST `/` ở source tham khảo. Giữ đơn offline, khách vãng lai, trừ products.stock, order_items, payment, ca nếu có. Không lấy tồn inventory_items để bán trực tiếp.

| Điểm nguồn | Rủi ro | Thiết kế tối thiểu |
| --- | --- | --- |
| Route tạo đơn nguồn không có requireAuth, nhận employee_id từ body | Giả thu ngân | Middleware employee/admin, service lấy danh tính từ auth |
| Nguồn dùng item.price và discount_amount client gửi | Sai doanh thu | Giá DB, giảm giá server; chưa hỗ trợ thì từ chối rõ |
| Kiểm tồn từng dòng rồi trừ sau, không gộp product trùng | Hai dòng mỗi dòng đủ tồn nhưng tổng vượt tồn | Gộp quantity theo product_id; validate tổng; khóa và UPDATE có điều kiện |
| Chưa có khóa yêu cầu duy nhất | Bấm/gửi lại có thể tạo hai hóa đơn | Idempotency key gắn actor + operation và hash payload |
| Có khóa hàng nhưng không bảo vệ bằng CHECK tương ứng | Ghi sai trực tiếp DB vẫn âm tồn | NOT NULL và CHECK ở DB, kiểm thử trực tiếp |

Không tự đổi quy tắc tích/đổi điểm, voucher hoặc ca. Vinh phải đối chiếu module loyalty nguồn và trình Linh nếu đưa vào POS; bản nghiệm thu tối thiểu cash không voucher/điểm phải được nhóm chấp thuận, không tuyên bố bằng toàn bộ source.

## 2. Hợp đồng dự kiến cần xác nhận

API mới đề xuất `POST /api/v1/pos/sales` (chưa tồn tại), quyền employee/admin. Header `Idempotency-Key`: chuỗi 1–64 ký tự trong `[A-Za-z0-9_-]`, bắt buộc, dùng so sánh phân biệt hoa thường trong DB. Một thao tác bán mới dùng key mới; retry thao tác cũ giữ nguyên key.

```json
{
  "items": [{ "product_id": 1, "quantity": 2 }],
  "customer_id": null,
  "payment_method": "cash",
  "note": "Bán tại quầy"
}
```

Thao tác gửi chỉ được thực hiện khi thu ngân đã nhận cash. Server ghi order_type=offline, delivery_method=pickup, status=order_status=completed, payment_status=paid; payment cash paid. Không cho client tự truyền các trạng thái này, employee_id, giá hoặc tổng tiền. customer_id nếu có phải tồn tại, đúng khách hàng; ca lấy từ server theo nhân viên như source, nullable nếu không có ca. Không tự tạo khách hoặc bắt buộc ca ở phạm vi tối thiểu.

Phản hồi 201 cho lần tạo đầu, 200 cho replay, cùng JSON success/data với order_id, totals và items; không rò token/hash/bảng chống lặp. Client gửi trường không hỗ trợ như voucher/điểm trong phiên bản tối thiểu phải nhận 422, không bị bỏ qua im lặng. Tiền tính bằng đơn vị nguyên phù hợp hoặc decimal chính xác, có quy tắc làm tròn, chặn vượt DECIMAL của schema.

Lỗi: 400 sai đầu vào; 401 chưa đăng nhập; 403 sai quyền; 404 tài nguyên không tồn tại; 409 INSUFFICIENT_STOCK hoặc KEY_REUSE_CONFLICT; 422 quy tắc nghiệp vụ không hỗ trợ. Nếu khung máy trạng thái được chốt, chuyển sai trạng thái trả 422 và cập nhật đồng bộ test cũ. Lỗi hạ tầng 500 không được ngụy trang thành hết hàng.

## 3. Bất biến và ràng buộc dự kiến

- `products.stock`, `inventory_items.stock`: NOT NULL, CHECK >= 0. `order_items.quantity`: NOT NULL, CHECK > 0.
- Giá, subtotal, total_amount, discount_amount, final_amount, payments.amount không âm; cột bắt buộc NOT NULL; chiết khấu không vượt tổng. Ràng buộc phải tương thích công thức points_discount khi được triển khai, không viết CHECK vô tình cấm nghiệp vụ nguồn.
- Bảng mới dự kiến `sale_requests`: actor_id, operation, request_key (binary collation), request_hash, order_id, created_at. UNIQUE(actor_id, operation, request_key), FK người thao tác/đơn; order_id nullable **chỉ trong transaction chưa commit**. Không commit key khi chưa có đơn.
- Một key đã commit ánh xạ một đơn, cùng payload; khác payload không được replay. Không tái sử dụng key cũ sau xóa theo thời gian khi chưa có chính sách được duyệt.
- Tổng tiền chi tiết và payment khớp đơn được bảo vệ bằng service/transaction và đối chiếu test; CHECK thông thường không kiểm tra được tổng nhiều hàng/bảng. Không tuyên bố CHECK đã bảo vệ mọi bất biến liên bảng.
- Migration kiểm tra dữ liệu cũ trước; không tự xóa để vượt lỗi migration. DB cũ không thực thi CHECK phải được xử lý rõ bằng nâng phiên bản hoặc cơ chế DB tương đương được duyệt.

## 4. Mã giả xử lý một giao dịch bán

```text
sellCash(auth, requestKey, input):
  kiểm auth là employee/admin; validate key và dữ liệu hỗ trợ
  gộp items theo product_id, kiểm tổng quantity nguyên dương an toàn
  sort product_id tăng dần
  chuẩn hóa payload (customer, cash, items đã gộp/sort, note)
  hash = SHA-256(payload chuẩn hóa)  // hash request, KHÔNG phải băm mật khẩu
  BEGIN trên một connection
  thử INSERT sale_requests(actor, 'POS_CASH', key, hash, order_id=NULL)
  nếu trùng UNIQUE đúng key:
    ROLLBACK transaction hiện tại
    đọc request đã commit trên connection mới/snapshot mới
    nếu hash khác: trả 409 KEY_REUSE_CONFLICT
    nếu hash giống: đọc đơn đó theo actor có quyền, trả 200 cùng order_id
    nếu chưa đọc được bản commit: retry hữu hạn hoặc trả lỗi rõ, không tạo bừa đơn
  kiểm khách nếu có; tra ca server theo quy tắc nguồn
  khóa từng sản phẩm FOR UPDATE theo product_id tăng dần
  kiểm tồn/active, lấy giá server và tính tổng; thiếu tồn thì lỗi 409
  INSERT orders offline/completed/paid với employee từ auth
  với mỗi sản phẩm:
    UPDATE products SET stock=stock-q WHERE id=id AND stock>=q AND active
    nếu affectedRows != 1: lỗi, ROLLBACK toàn giao dịch
    INSERT order_items bằng giá server
  INSERT payment cash paid
  UPDATE sale_requests SET order_id=đơn vừa tạo
  COMMIT
  trả 201 sau commit
  mọi lỗi trước commit: ROLLBACK; luôn release connection
```

INSERT UNIQUE đồng thời sẽ chờ giao dịch giữ key; chỉ xử lý duplicate của khóa idempotency dự kiến, không nuốt mọi lỗi UNIQUE thành replay. Nếu giao dịch đầu rollback, giao dịch chờ có thể tiếp tục tạo; không tiêu tồn hai lần. Mất phản hồi sau commit: retry cùng key tìm đơn đã commit. Nếu kết quả COMMIT chưa rõ vì mất kết nối, phải tra key trước khi quyết định thử lại; không tự đổi key.

Deadlock/lock timeout: rollback toàn bộ; retry hữu hạn (đề xuất tối đa 3 lần, backoff có jitter), giữ key. Hết retry trả lỗi tạm thời theo hợp đồng đã chốt, không giả là 409 hết hàng. Bài test 50 request phải được chạy lại và phân loại lỗi hạ tầng, không xóa lỗi khỏi thống kê.

POS cash tối thiểu khóa key → products tăng dần. Online hiện có khóa cart → products → voucher; reject khóa order → products → voucher. Vinh phải kiểm tra SQL thực tế của JOIN/FOR UPDATE, thống nhất thứ tự khóa sản phẩm ở các luồng. Không đưa POS voucher khóa voucher trước products như nguồn cũ vì sẽ tạo nguy cơ khóa ngược với online. Không bỏ khóa hoặc transaction để “test chạy nhanh”.

## 5. Vì sao kỳ vọng 10 thành công trong 50 lượt

Fixture tồn kệ 10; 50 giao dịch độc lập, key khác nhau, mỗi giao dịch mua 1; không có nhập/hoàn tồn trong lúc test. Khóa hàng nối tiếp phần kiểm tra/cập nhật tồn. UPDATE có điều kiện và CHECK không cho tồn âm. Do đó số giao dịch bán thành công không vượt 10. Chỉ kết luận **đúng 10** khi không có lỗi độc lập như auth, DB, timeout hoặc dữ liệu sai; 40 ca còn lại phải được xác nhận hết hàng, không phải lỗi 500.

Test replay là bài riêng: 50 request cùng actor/key/payload chỉ tạo một đơn, không được áp kỳ vọng 10 đơn vào bài này. Tổng hợp bảng gồm request_id, key đã che nếu cần, HTTP, error_code, order_id, thời gian; kiểm DB trước/sau, số order_id duy nhất và payment.

## 6. Điểm review mã giả với code sau bàn giao

| Bước | File/hàm thực tế | Kết quả |
| --- | --- | --- |
| Quyền, validation và ánh xạ dữ liệu | Chờ Vinh bàn giao | Chưa review |
| Gộp dòng, tính tiền server | Chờ Vinh bàn giao | Chưa review |
| UNIQUE key/hash và replay | Chờ Vinh bàn giao | Chưa review |
| Khóa hàng/cập nhật tồn | Chờ Vinh bàn giao | Chưa review |
| Ghi đơn/chi tiết/payment, commit | Chờ Vinh bàn giao | Chưa review |
| Rollback, retry và release | Chờ Vinh bàn giao | Chưa review |
| Migration/SQL vi phạm/test 50 request | Chờ Vinh/Kiên bàn giao | Chưa review |

Đây là cấu trúc đầu vào cho mục 3.6 của Kiên, không phải bằng chứng thuật toán đã chạy. Khi khung được xác nhận khác đề xuất này, Linh cập nhật thiết kế trước khi giao code, không sửa tên T trên tài liệu để hợp thức hóa thuật toán khác.
