# Checklist trước khi code và phân công Buổi 5

Ngày lập: 30/09/2026. Đề tài: Hệ thống quản lý vận hành siêu thị.

Tài liệu này là phần chuẩn bị của Linh trước khi cả nhóm code Buổi 5. Nó chốt cách chia việc, mô tả luồng tham khảo, các điểm cần sửa có lý do và điều kiện nghiệm thu. Ô đã tích chỉ xác nhận việc khảo sát/tài liệu đã làm; không xác nhận code nghiệp vụ mới đã hoàn thành.

## 1. Phân công chính thức của nhóm

| Thành viên | Vai trò | Chịu trách nhiệm |
| --- | --- | --- |
| Linh | V1 — Nhóm trưởng và kiến trúc | Chốt yêu cầu, hợp đồng tích hợp, phạm vi; rà soát ba tầng; tích hợp và lập nhật ký rà soát |
| Vinh | V2 — Dữ liệu và V3 — Nghiệp vụ | Schema, seed, chỉ mục, repository, controller/service nghiệp vụ, transaction và sửa lỗi triển khai |
| Kiên | V4 — Bảo mật/kiểm thử và V5 — Triển khai/tài liệu | Kịch bản kiểm thử, bằng chứng bảo mật/rollback, môi trường online, triển khai và nháp báo cáo 4.1–4.3 |

Phân công này áp dụng Buổi 5, thay cho đề xuất trước đó để Kiên cùng làm V3. Vinh là người triển khai cả hai luồng; Kiên chuẩn bị test/online song song, phát hiện lỗi và chuyển lại Vinh sửa. Linh không giao thêm toàn bộ nghiệp vụ cho Kiên.

## 2. Căn cứ và nguyên tắc giữ nghiệp vụ

- Sổ tay thực hành 10 buổi CSE702051, Buổi 05 trang 31–34: hai luồng cốt lõi qua nhiều bước/vai trò; CRUD thực thể chính; transaction khi ghi nhiều bảng; ít nhất 8 ca kiểm thử đã chạy; chạy online; nháp báo cáo mục 4.1–4.3.
- Source tham khảo: `He_thong_quan_ly_van_hanh_sieu_thi`, đã đọc các route kho, sản phẩm, giỏ hàng, đơn hàng và hàm `releaseInventoryToShelf` trong `lib/services/db_service.dart`.
- Nền code mới: nhánh `Linh/v1/buoi4` trên GitHub, gồm phần tích hợp mới của Vinh/Kiên. Nhánh `main` tại lúc khảo sát chưa chứa đầy đủ phần tích hợp mới này.
- Giữ hành vi nghiệp vụ hợp lý của source tham khảo. Chỉ sửa hành vi không chạy được, gây sai dữ liệu hoặc quá bất hợp lý; ghi rõ bằng chứng và lý do vào nhật ký bên dưới.
- Việc tách SQL khỏi route, dùng `/api/v1`, middleware, AppError và JSON thống nhất là tổ chức lại theo giáo trình, không phải lý do tự ý đổi nghiệp vụ.
- Các kết luận về source dưới đây dựa trên đọc mã; chưa chạy lại toàn bộ ứng dụng cũ. Mục nào cần chạy xác nhận được ghi rõ, không coi là lỗi tái hiện đã kiểm chứng.

## 3. Checklist của Linh trước khi giao code

### Những việc đã chuẩn bị trong lần này

- [x] Cập nhật phân công V1 = Linh, V2/V3 = Vinh, V4/V5 = Kiên.
- [x] Kiểm tra nhánh nền đã tích hợp phần giỏ hàng và middleware mới của Buổi 4.
- [x] Đọc các hàm nghiệp vụ tương ứng trong source tham khảo, ghi lại nguồn đối chiếu.
- [x] Phân biệt tồn kho với tồn kệ và xác định thời điểm trừ tồn theo source.
- [x] Lập phạm vi hai luồng, danh mục giao tiếp và điểm cần sửa có lý do.
- [x] Lập phân công, thứ tự bàn giao, checklist dữ liệu/test/online và tiêu chí nghiệm thu.

### Những việc Linh cần cùng nhóm xác nhận trước khi viết nghiệp vụ mới

- [ ] Cả ba đọc tài liệu này, xác nhận cùng dùng nền `Linh/v1/buoi5`; không bắt đầu từ bản `main` cũ thiếu tích hợp.
- [ ] Chốt các quy tắc tại mục 4 và từng thay đổi tại mục 5; ghi ý kiến còn khác nhau vào nhật ký, không tự thay trong code.
- [ ] Chốt bảng API mục 6 và cập nhật OpenAPI cùng schema Buổi 3. Xác nhận tên trường, role và định dạng lỗi từ `CONTRIBUTING.md`.
- [ ] Vinh trình bày thao tác nào ghi bảng nào, thứ tự khóa và ranh giới transaction; Linh rà soát trước khi triển khai.
- [ ] Vinh nhận phần hoàn thiện xác thực còn thiếu để hai luồng chạy với tài khoản thật; Kiên nhận kiểm thử hồi quy trước khi nghiệm thu.
- [ ] Kiên chốt nơi chạy online, HTTPS, CSDL, biến môi trường và cách lưu bí mật; không đưa thông tin đăng nhập lên Git.
- [ ] Chốt thứ tự CRUD và danh sách thực thể chính; nếu một mục phải chuyển buổi sau, ghi rõ và đối chiếu thầy, không đánh dấu đủ CRUD khi còn thiếu.
- [ ] Giao hạn bàn giao cụ thể: hợp đồng/schema, luồng kho, luồng đơn, tích hợp, kiểm thử online. Nhóm điền thời gian thật, tài liệu không tự đặt hạn thay nhóm.
- [ ] Thống nhất mỗi người làm nhánh cá nhân, commit có tên dễ hiểu; Linh review trước khi tích hợp. Không sửa lịch sử commit của nhau.

Đầu ra trước code của Linh: checklist này, bảng API, bảng quy tắc/transaction và danh sách điểm cần sửa. Nhật ký rà soát tiếp tục cập nhật trong lúc nhóm triển khai; tài liệu chuẩn bị không thay cho việc review code hoàn chỉnh.

## 4. Hai luồng nghiệp vụ bám source tham khảo

### Luồng A — Chuẩn bị hàng, nhập kho và đưa lên kệ

Vai trò nối tiếp: Admin chuẩn bị danh mục/mặt hàng; Nhân viên nhập hàng và đưa hàng lên kệ; Khách hàng xem hàng đang bán.

1. Admin tạo hoặc cập nhật danh mục, mặt hàng kho và thông tin bán hàng.
2. Nhân viên chọn mặt hàng, nhập số lượng dương và giá nhập dương.
3. Hệ thống tăng `inventory_items.stock`, cập nhật `import_price` và ghi `inventory_logs` với action `import` trong cùng transaction.
4. Nhân viên chọn đưa một số lượng hàng từ kho lên kệ. Nếu sản phẩm cùng barcode đã có thì tăng tồn kệ; nếu chưa có thì tạo sản phẩm theo thông tin mặt hàng/danh mục.
5. Hệ thống giảm tồn kho, tăng/tạo tồn kệ và ghi action `export`. Toàn bộ bước chuyển kho → kệ phải chung một transaction backend.
6. Khách xem sản phẩm; số lượng có thể mua là `products.stock`, không phải tổng kho cộng kệ.

Giữ quy tắc nguồn: giá bán phải lớn hơn 0; khi có giá nhập thì giá bán không nhỏ hơn giá nhập; chưa có giá nhập thì phản hồi cảnh báo theo hành vi cũ. Sản phẩm được ngừng bán/xóa mềm thay vì phá lịch sử đơn hàng.

Hai loại tồn KHÁC NHAU: `inventory_items.stock` là tồn kho; `products.stock` là tồn kệ đang bán. Không gộp chúng thành một cột và không tăng cả hai khi nhập kho. Khi chuyển q đơn vị, kho giảm q, kệ tăng q. Dữ liệu seed phải nói rõ số lượng ở từng vị trí, không coi hai bản ghi cùng barcode là dữ liệu đồng bộ cần cộng trùng.

Nguồn: `backend_nodejs/src/routes/inventory.routes.js` (`/import`, `/export`, `/adjust`), `product.routes.js` (tạo/sửa/xóa mềm), `lib/services/db_service.dart` (`releaseInventoryToShelf`).

### Luồng B — Giỏ hàng, đặt đơn online, xử lý và nhận hàng

Vai trò nối tiếp: Khách hàng → Nhân viên/Admin → Khách hàng.

1. Khách thêm/sửa/xóa sản phẩm trong giỏ thuộc sở hữu của mình; thêm cùng sản phẩm thì cộng số lượng như source.
2. Checkout từ giỏ; chọn `pickup` hoặc `delivery`. Giao tận nhà bắt buộc địa chỉ.
3. Server khóa dữ liệu cần thiết, kiểm tra tồn kệ, lấy giá từ database và tính tiền. Không nhận tổng tiền/giá do client tự quyết định.
4. Nếu khách chọn voucher, giữ cách giảm `fixed`/`percent`, mức tối thiểu, trần giảm, hết hạn và giới hạn lượt dùng theo source; không áp voucher thì mức giảm bằng 0.
5. Tạo `orders`, `order_items`, `payments`; trừ `products.stock`; cập nhật lượt voucher nếu có; xóa các dòng giỏ đã đặt. Đây là một transaction.
6. Đơn mới có trạng thái `pending`. Nhân viên/Admin xác nhận: giao tận nhà → `shipping`; nhận tại cửa hàng → `completed` theo source. Với pickup, thao tác xác nhận cần được vận hành tại thời điểm thực sự bàn giao hàng, không chỉ lúc vừa nhìn thấy đơn.
7. Nếu đang `pending`, nhân viên có thể từ chối → `rejected`. Phải hoàn lại tồn kệ đã giữ/trừ, và hoàn lượt voucher đã tiêu thụ nếu có, đúng một lần.
8. Với đơn giao tận nhà đang `shipping`, chính khách sở hữu đơn xác nhận đã nhận → `completed`. Người khác hoặc trạng thái không hợp lệ bị từ chối.

Giữ thời điểm trừ tồn là CHECKOUT; không trừ thêm khi xác nhận/nhận hàng. `order_status` là trạng thái nghiệp vụ ưu tiên như source; nếu vẫn giữ `status`, cập nhật đồng thời từ một hàm chuyển trạng thái chung. `payment_status` là trạng thái tiền riêng, không tự đổi thành paid chỉ vì đơn hoàn tất.

Phương thức nguồn: `cash`, `ewallet`, `vnpay`. Buổi 5 chọn cash để nghiệm thu luồng không phụ thuộc nhà cung cấp; giữ voucher trong hợp đồng và dữ liệu thử vì source đã hỗ trợ. Các phương thức tích hợp chỉ bật khi có kết quả xác minh/sandbox thật; nếu chưa làm thì trả lỗi rõ, không giả thành thanh toán thành công. Đây là tiến độ triển khai, không phải xóa phương thức khỏi yêu cầu đề tài.

Nguồn: `backend_nodejs/src/routes/cart.routes.js`; `order.routes.js` (`applyCheckoutVoucher`, `/checkout`, `/:id/confirm`, `/:id/reject`, `/:id/received`). Các đơn đã thanh toán bị từ chối cần xử lý hoàn tiền; đến khi có luồng đó, phải chặn từ chối đơn paid bằng lỗi nghiệp vụ rõ ràng, không âm thầm mất tiền hoặc gắn nhãn đã hoàn tiền.

## 5. Điểm cần sửa có căn cứ, không đổi tùy ý

| Mã | Hiện tượng đọc được trong source | Hậu quả | Xử lý cần làm | Người code / kiểm tra |
| --- | --- | --- | --- | --- |
| FIX-01 | `releaseInventoryToShelf` tăng/tạo sản phẩm rồi gọi `/inventory/export` bằng request riêng | Request sau lỗi thì kệ đã tăng nhưng kho chưa giảm | Giữ nghiệp vụ chuyển kho → kệ, gom các thay đổi vào một transaction backend | Vinh / Kiên |
| FIX-02 | Checkout trừ tồn và tăng lượt voucher; route reject chỉ đổi trạng thái | Đơn bị từ chối vẫn mất tồn/lượt voucher | Khóa đơn pending, hoàn tồn và lượt dùng nếu có cùng transaction; gọi lại không hoàn hai lần | Vinh / Kiên |
| FIX-03 | Source cũ nhận `employee_id` từ body ở nhập/xuất kho | Người gọi có thể ghi lịch sử dưới danh tính khác | Lấy người thao tác từ `req.auth`, kiểm role ở backend | Vinh / Kiên |
| FIX-04 | Nhánh nền mới `/auth/login` cấp token với userId cố định, không kiểm mật khẩu | Không đăng nhập đúng nhiều tài khoản/vai trò | Hoàn thiện auth thật qua ba tầng; Kiên thử 401, 403, A/B và đăng xuất | Vinh / Kiên |
| FIX-05 | Source cũ chọn ewallet thì đặt paid và tạo `FAKE_QR_ORDER` | Khách tự chọn phương thức có thể được coi đã trả tiền | Chỉ paid sau xác minh thanh toán; chưa tích hợp thì từ chối rõ/sandbox tách biệt | Vinh / Kiên |
| FIX-06 | Một số điều kiện chỉ dùng `Number(value) <= 0`, không chặn NaN/thiếu giá trị | Dữ liệu không hợp lệ có thể lọt xuống SQL | Kiểm tra bắt buộc, số hữu hạn, số lượng nguyên và khoảng giá trị trước transaction | Vinh / Kiên |

Những điểm trên là phát hiện tĩnh, Kiên cần test tái hiện hoặc test chứng minh bản mới đã khắc phục. Các vấn đề khác phải ghi thêm: vị trí nguồn → tình huống lỗi → thay đổi tối thiểu → cách kiểm tra. Không nhân dịp code lại để thêm bước phê duyệt, đổi vai trò, đổi cách nhận hàng hoặc gộp tồn khi chưa có lý do.

## 6. Hợp đồng API cần chốt trước triển khai

Đây là đường dẫn đích dự kiến theo quy ước `/api/v1` đã chốt, giữ hành vi nguồn nhưng không sao chép các alias cũ. Bảng là bản thiết kế, không phải danh sách API đã tồn tại.

| Module / API tương đối | Vai trò | Dữ liệu / quy tắc | Người triển khai |
| --- | --- | --- | --- |
| `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` | Công khai hoặc đã đăng nhập tùy API | Auth thật, tài khoản/role từ database; không token mẫu | Vinh; Kiên kiểm thử bảo mật |
| CRUD `/categories`, `/products` | Đọc công khai; ghi Admin | snake_case; giá, barcode, danh mục; xóa mềm/bảo vệ FK | Vinh |
| CRUD `/inventory/items`, GET `/inventory/logs` | Ghi thông tin mặt hàng Admin; đọc vận hành Employee/Admin | Định danh và phân trang; không sửa stock tùy ý trong API thông tin | Vinh |
| POST `/inventory/imports` | Employee/Admin | `inventory_item_id`, `quantity`, `import_price`, `note`; danh tính từ token | Vinh |
| POST `/inventory/exports` | Employee/Admin | `inventory_item_id`, `quantity`, `category_id` khi cần tạo sản phẩm; kho → kệ nguyên tử | Vinh |
| POST `/inventory/adjustments` | Employee/Admin | `inventory_item_id`, `actual_quantity`, `note`; điều chỉnh và ghi log | Vinh |
| GET `/cart`, POST `/cart/items`, PATCH/DELETE `/cart/items/:itemId` | Customer, đúng chủ | `product_id`, `quantity`; không chọn chủ giỏ bằng body | Vinh |
| POST `/orders/checkout` | Customer | `delivery_method`, `payment_method`, `shipping_address`, `voucher_id` hoặc `voucher_code`, `note` | Vinh |
| GET `/me/orders`, GET `/orders/:orderId` | Chủ đơn; nhân viên/Admin theo ma trận | Danh sách/chi tiết không lộ đơn của khách khác | Vinh |
| GET `/orders` | Employee/Admin | Lọc trạng thái, phân trang | Vinh |
| POST `/orders/:orderId/confirm`, `/reject` | Employee/Admin | Kiểm trạng thái; reject nhận `reason` | Vinh |
| POST `/orders/:orderId/receive` | Customer là chủ đơn | Chỉ đơn delivery đang shipping | Vinh |
| CRUD `/vouchers`, POST `/vouchers/validate` | CRUD Admin; validate theo ma trận | Giữ quy tắc voucher nguồn, khóa lượt dùng khi checkout | Vinh |

Route giỏ `/carts` của Buổi 4 vẫn cần test hồi quy. Khi thêm `/cart/items`, không làm mất route cũ đang dùng; thống nhất rõ cái nào là giỏ hiện tại và cái nào là truy cập theo ID trước khi cập nhật OpenAPI.

Phân chia CRUD: các thực thể chính quản lý trực tiếp gồm danh mục, sản phẩm, mặt hàng kho, tài khoản và voucher. Giỏ/chi tiết giỏ có thao tác theo chủ. Đơn hàng có tạo/đọc/chuyển trạng thái thay vì xóa tùy ý; order_items/payments/inventory_logs là dữ liệu phát sinh qua nghiệp vụ, không cho client ghi/xóa tự do để đủ chữ CRUD. Linh cùng nhóm đối chiếu danh sách thực thể chính Buổi 2–3; nếu vẫn có ca làm hoặc thực thể khác trong phạm vi chính thì bổ sung owner/CRUD vào bảng trước khi tuyên bố đủ yêu cầu thầy.

## 7. Checklist Vinh — V2 và V3

- [ ] Đọc và phản hồi quy tắc mục 4–6, chốt chữ ký repository/service trước khi code.
- [ ] Hoàn thiện auth còn thiếu của nền Buổi 4; bỏ token userId cố định, lấy bí mật từ môi trường, không dùng secret demo khi triển khai.
- [ ] Chuẩn bị schema/migration và seed tái lập: Admin, Employee, Customer A/B; kho và kệ tách số lượng; hàng thiếu tồn; voucher hợp lệ/hết hạn/hết lượt; đơn các trạng thái.
- [ ] Bổ sung chỉ mục theo truy vấn thực tế; đo trung vị và lưu truy vấn/điều kiện đo, không đánh dấu tối ưu chỉ vì có tên index.
- [ ] Viết abstraction transaction dùng một connection: begin → các repository → commit; lỗi rollback, luôn release. Service điều phối, repository chứa SQL.
- [ ] Hoàn thiện CRUD theo danh sách nhóm chốt; kiểm tra phía server, tham số hóa và phân quyền.
- [ ] Làm luồng A nhập kho → chuyển lên kệ, gồm FIX-01, FIX-03 và FIX-06.
- [ ] Làm luồng B giỏ → checkout → confirm/reject → receive; giữ trạng thái, thời điểm trừ tồn và voucher nguồn, sửa FIX-02/FIX-05.
- [ ] Checkout dùng giá server và khóa dữ liệu; chặn tồn âm, giỏ rỗng, số lượng sai; rollback cả đơn/chi tiết/tiền/tồn/voucher/giỏ khi lỗi.
- [ ] Reject chỉ xử lý pending, hoàn đúng một lần; giữ nguyên đơn/tồn nếu thao tác lặp hoặc cạnh tranh không hợp lệ.
- [ ] Bổ sung thao tác thu tiền cash nếu dùng để chứng minh đã trả tiền; không gộp paid với completed. Chốt endpoint và quyền cùng Linh/Kiên.
- [ ] Cập nhật OpenAPI, ví dụ request, schema và hướng dẫn chạy; bàn giao từng luồng cho Kiên test thay vì chờ xong hết.
- [ ] Chạy `npm run check`, thử SQL thật trên database test và ghi lỗi còn lại.
- [ ] Bàn giao PR/commit, seed/migration, danh sách API và kết quả. Cập nhật chỉ số V2/V3 theo số đo thực tế.

## 8. Checklist Kiên — V4 và V5

### Làm song song ngay khi Vinh bắt đầu

- [ ] Chuẩn bị bảng test theo hai luồng và ca hồi quy Buổi 4; xác định dữ liệu ban đầu/kết quả mong đợi.
- [ ] Kiểm chứng lỗi auth mẫu và bàn giao Vinh sửa; sau khi sửa, chạy nhiều vai trò, token sai/hết hạn, đăng xuất và truy cập chéo A/B.
- [ ] Chuẩn bị môi trường online Node.js + MySQL, HTTPS, biến môi trường và quyền truy cập cho nhóm; không ghi bí mật vào repo/tài liệu công khai.
- [ ] Chuẩn bị cách nạp schema/seed an toàn, lệnh khởi động, log và hướng dẫn triển khai lại. Chỉ reset database test đã xác định.
- [ ] Viết nháp báo cáo 4.1 môi trường/cấu trúc, 4.2 tổ chức ba tầng/cấu hình, 4.3 chức năng trọng yếu; cập nhật theo code thực tế khi Vinh bàn giao.

### Khi nhận từng luồng

- [ ] Chạy ít nhất 8 ca có kết quả thực tế, bao gồm ca biên/lỗi cho cả hai luồng; dùng bảng tối thiểu mục 9.
- [ ] Chủ động gây lỗi giữa transaction trong môi trường test; so sánh dữ liệu trước/sau để chứng minh rollback, không mở endpoint gây lỗi trên production.
- [ ] Test lại Buổi 4, xác nhận 401/403 và quyền sở hữu không bị hỏng khi thêm nghiệp vụ.
- [ ] Test đồng thời ở mức cần chứng minh không âm tồn/không hoàn tồn hai lần; ghi công cụ, dữ liệu, số request thật.
- [ ] Lập phiếu lỗi kèm bước tái hiện, kỳ vọng/thực tế và bằng chứng; giao Vinh sửa, Kiên kiểm tra lại.
- [ ] Triển khai bản tích hợp lên online; chạy lại cả hai luồng ở URL thật, không thay bằng ảnh localhost.
- [ ] Chụp URL, thời điểm, vai trò/ngữ cảnh và kết quả; che token/mật khẩu. Lưu tên ảnh cùng mã test.
- [ ] Hoàn thiện nháp 4.1–4.3 và hướng dẫn demo; ghi rõ tính năng chưa hỗ trợ, không mô tả ewallet giả là thanh toán thật.
- [ ] Cập nhật chỉ số V4/V5: ca test chạy/tỷ lệ đạt, rủi ro có bằng chứng, số lần triển khai thành công và phần báo cáo hoàn thành.

## 9. Bảng nghiệm thu tối thiểu để Kiên điền

| Mã | Kịch bản | Kết quả mong đợi | Thực tế / bằng chứng |
| --- | --- | --- | --- |
| B5-01 | Nhân viên nhập kho hợp lệ | Kho tăng, giá nhập cập nhật, đúng log/người thao tác | Chưa chạy |
| B5-02 | Số lượng/giá nhập thiếu, không phải số hoặc <= 0 | 400, dữ liệu không đổi | Chưa chạy |
| B5-03 | Chuyển kho → kệ thành công và vượt tồn | Thành công kho giảm/kệ tăng; vượt tồn bị chặn | Chưa chạy |
| B5-04 | Gây lỗi giữa chuyển kho → kệ | Rollback kho, kệ và nhật ký | Chưa chạy |
| B5-05 | Khách checkout cash với giỏ hợp lệ | Đơn pending, trừ tồn kệ, tạo chi tiết/payment pending, dọn giỏ | Chưa chạy |
| B5-06 | Giỏ rỗng, thiếu địa chỉ delivery, thiếu tồn | Bị từ chối; không có đơn hoặc tồn thay đổi dở dang | Chưa chạy |
| B5-07 | Voucher hợp lệ và voucher không hợp lệ | Giảm đúng; không tiêu lượt khi checkout thất bại | Chưa chạy |
| B5-08 | Gây lỗi giữa checkout nhiều bảng | Rollback toàn bộ đơn/chi tiết/payment/tồn/voucher/giỏ | Chưa chạy |
| B5-09 | Confirm delivery rồi chủ đơn receive | pending → shipping → completed, không trừ tồn lần hai | Chưa chạy |
| B5-10 | Nhận pickup tại quầy và confirm | pending → completed theo source; trạng thái tiền độc lập | Chưa chạy |
| B5-11 | Reject pending rồi gọi reject lần hai | Hoàn tồn/lượt voucher một lần; lần sau 409 | Chưa chạy |
| B5-12 | B xem/nhận đơn của A; khách gọi nhập kho | 403/404; không lộ/sửa dữ liệu trái quyền | Chưa chạy |
| B5-13 | Token thiếu/sai/hết hạn/đã đăng xuất | 401; hồi quy Buổi 4 đạt | Chưa chạy |
| B5-14 | Hai checkout tranh lượng tồn cuối | Không âm tồn, tổng lượng bán không vượt tồn | Chưa chạy |
| B5-15 | Chạy hai luồng trên online | URL HTTPS thật, đúng dữ liệu và vai trò, có bằng chứng | Chưa chạy |

Thầy yêu cầu tối thiểu 8 ca; bảng mở rộng này giúp phủ các nhánh quan trọng của source, không được ghi 15 ca đạt khi mới viết kịch bản. Lỗi payment paid/reject chưa có hoàn tiền phải được chặn có thông báo và ghi rõ hạn chế.

## 10. Thứ tự làm và mốc bàn giao

| Thứ tự | Linh | Vinh | Kiên | Điều kiện chuyển bước |
| --- | --- | --- | --- | --- |
| 1. Chốt trước code | Rà mục 3–6, giao việc | Xác nhận dữ liệu/transaction/API | Xác nhận test/online | Cùng hiểu tồn, trạng thái, phần sửa |
| 2. Chuẩn bị nền | Review auth và ba tầng | Auth thật, schema/seed, CRUD nền | Test auth hồi quy; chuẩn bị online/báo cáo | Đăng nhập đúng các vai trò |
| 3. Luồng A | Review transaction và hợp đồng | Code nhập kho/chuyển kệ | Test A, ghi lỗi/rollback | A qua kiểm thử dữ liệu thật |
| 4. Luồng B | Review tồn/trạng thái/voucher | Code giỏ/đơn/xử lý/nhận hàng | Test B và hồi quy A | B đúng luồng chính/lỗi |
| 5. Nghiệm thu | Nhật ký rà soát và tích hợp | Sửa lỗi, bàn giao migration | Deploy, test online, ảnh và báo cáo | Đủ tiêu chí dưới đây |

Mốc thời gian thực tế nhóm điền: chốt hợp đồng ______; bàn giao A ______; bàn giao B ______; test online ______; hạn nộp ______.

## 11. Nhật ký rà soát V1 và tiêu chí hoàn thành

| Mục rà soát | Trạng thái hiện tại | Bằng chứng / bước tiếp theo |
| --- | --- | --- |
| Vai trò và thứ tự công việc | Đã lập tài liệu | Linh/Vinh/Kiên xác nhận nhận việc |
| Đối chiếu luồng source | Đã khảo sát tĩnh | Nguồn và hành vi tại mục 4 |
| Điểm sửa tối thiểu | Đã ghi nhận, chưa sửa code | FIX-01 đến FIX-06, giao Vinh/Kiên |
| API, CRUD và transaction | Bản thiết kế cần nhóm chốt | Mục 6; review code sau bàn giao |
| Hai luồng chạy được | Chưa triển khai trong lần lập checklist này | Vinh bàn giao, Kiên kiểm thử |
| Online và báo cáo | Chưa nghiệm thu | Kiên phụ trách V5 |

- [ ] Hai luồng chạy đầu–cuối qua đúng vai trò trên online.
- [ ] CRUD các thực thể chính theo phạm vi đã chốt hoạt động và có validation server.
- [ ] Ghi nhiều bảng có transaction và bằng chứng rollback thật.
- [ ] Tối thiểu 8 test có kết quả thực tế; test hồi quy Buổi 4 được chạy lại.
- [ ] Mọi endpoint được rà ba tầng; không SQL trong route/controller, không nghiệp vụ tính tiền ở client.
- [ ] Có nháp mục 4.1–4.3, bằng chứng triển khai và lịch sử đóng góp của ba người.
- [ ] Linh cập nhật số yêu cầu hợp nhất đã rà soát và tỷ lệ hoàn thành kế hoạch dựa trên việc thực sự nghiệm thu.

Không chấm phần trăm hoàn thành toàn Buổi 5 chỉ từ số ô tài liệu đã tích. Khi review từng bản code, bổ sung ngày, người thực hiện, đường dẫn PR/file, vấn đề, người sửa và kết quả kiểm tra lại.
