# Phân công hoàn thiện 13 nhóm chức năng

Ngày lập: 04/10/2026. Thành viên: Linh, Vinh, Kiên.

Nền triển khai: nhánh `Linh/giaodien/chucnanghienco`, commit `giaodienwebchucnanghienco`, đã có frontend và backend Buổi 6. Đây là kế hoạch, không phải bằng chứng hoàn thành. Cần fetch và kiểm tra các thay đổi mới của nhóm trước khi bắt đầu code. Không làm lại giao diện/API đã có.

## 1. Cách chia công bằng

- Linh vẫn V1; Vinh V2/V3; Kiên V4/V5. Theo yêu cầu chia đều công việc, **Linh nhận thêm code module**, không chỉ review/checklist.
- Người chủ trì chịu trách nhiệm bàn giao module chạy đầu-cuối: dữ liệu/API, giao diện, test và tài liệu. Có hỗ trợ theo vai trò nhưng không đẩy toàn bộ frontend/test sang Kiên hoặc toàn bộ SQL sang Vinh.
- Điểm dưới đây là ước lượng tương đối về công sức và rủi ro, không phải giờ công, điểm môn học hay tỷ lệ đóng góp đã đạt. Điều chỉnh sau khi từng bạn đọc source và phản hồi.
- Source cũ là căn cứ nghiệp vụ; chỉ thay quy tắc không chạy được/không hợp lý hoặc không an toàn, phải ghi lý do. Thanh toán thật production không thuộc phạm vi này.

| Thành viên | Số nhóm | Điểm module ước lượng | Công việc chung | Tổng định hướng |
| --- | --- | --- | --- | --- |
| Linh | 5 | 17 | Điều phối, hợp đồng, review/tích hợp: khoảng 3 | Khoảng 20 |
| Vinh | 4 | 19 | Review migration, SQL báo cáo nhân viên cho Buổi 7: khoảng 2 | Khoảng 21 |
| Kiên | 4 | 18 | Kiểm thử chéo trọng yếu, khung biểu đồ/export và triển khai: khoảng 3 | Khoảng 21 |

Không chia mỗi người 4 chức năng rồi coi bằng nhau: điểm/thanh toán có nhiều giao dịch và rủi ro hơn chỉnh hồ sơ. Công việc chung có thể tăng; nếu vượt dự kiến, cả nhóm chia lại UI/test, không mặc định Kiên làm thêm không giới hạn.

## 2. Phân công đúng 13 nhóm đã đối chiếu

| Mã | Nhóm chức năng | Chủ trì | Điểm | Đầu ra tối thiểu và tiêu chí nghiệm thu |
| --- | --- | --- | --- | --- |
| CN01 | Quên mật khẩu/OTP/reset | Kiên | 4 | Luồng yêu cầu khôi phục → xác minh → đặt lại mật khẩu; token/OTP hết hạn, một lần, rate limit; không lộ tài khoản; hash mật khẩu, thu hồi phiên theo chính sách. Có UI và test đúng/sai/hết hạn/dùng lại. Demo kênh nhận mã an toàn, không công khai token trong API production |
| CN02 | Cập nhật hồ sơ cá nhân | Linh | 2 | Bổ sung sửa họ tên/điện thoại/địa chỉ trên hồ sơ đã có; API lấy user từ phiên, không nhận role/status để tự nâng quyền; khách A không sửa B. Không làm lại admin quản lý tài khoản |
| CN03 | Quy trình mã vạch | Linh | 3 | Tra cứu/check trùng/sinh mã theo source; tích hợp vào sản phẩm/POS, hỗ trợ nhập hoặc máy quét dạng bàn phím. Nếu cần camera như source: HTTPS, xin quyền, xử lý từ chối và fallback nhập mã; không báo hoàn thành camera khi mới có nhập mã |
| CN04 | Upload ảnh sản phẩm | Kiên | 4 | JPEG/PNG/WebP đúng chữ ký và decode; tối đa 5 MiB, đổi tên, lưu ngoài vùng thực thi; quyền upload/truy xuất, UI gắn ảnh sản phẩm, file sai bị từ chối, lưu Ảnh 23 theo Buổi 7 |
| CN05 | Báo cáo doanh thu | Vinh | 4 | SQL tổng hợp thời gian và API admin; giao diện bộ lọc, biểu đồ, CSV/Excel cùng số liệu. Dùng R1 trong hợp đồng Buổi 7; đối chiếu fixture thủ công, không nhân tiền do JOIN. Phần lợi nhuận chỉ làm khi có giá vốn lịch sử đáng tin, nếu chưa có phải ghi chưa hỗ trợ |
| CN06 | Báo cáo hiệu quả sản phẩm | Vinh | 4 | Lượng bán/doanh số theo sản phẩm, khoảng thời gian, top sản phẩm; SQL/API/UI/biểu đồ/file xuất. Phân biệt tiền dòng trước giảm giá với doanh thu thuần của đơn, không đếm đơn hủy/chưa trả tiền sai quy tắc |
| CN07 | Tổng hợp hoạt động nhân viên | Linh | 3 | Trang chi tiết nhân viên có số đơn/doanh thu/lịch sử xử lý và thông tin ca khi có; Vinh viết truy vấn R3 trong nhiệm vụ V2 Buổi 7, Linh phụ trách tích hợp API/UI/test module; không bỏ mất đơn chưa gán nhân viên. Có biểu đồ/xuất tệp nếu dùng làm báo cáo thứ ba |
| CN08 | Lập lịch nhân viên | Linh | 4 | Admin phân lịch ngày/tháng, nhân viên xem lịch của mình; kiểm tra khoảng giờ, trùng lịch và quyền theo quy tắc source. Phân biệt lịch dự kiến với ca thực tế; test qua tháng/ngày và truy cập chéo |
| CN09 | Thực hiện ca làm | Linh | 5 | Bắt đầu/kết thúc/lịch sử ca; chống mở ca trùng/kết thúc sai; gắn giao dịch với ca đúng. Giữ quy tắc source và POS hiện tại: không tự bắt buộc phải có ca mới được bán nếu chưa được chốt. Kiểm tra ranh giới thời gian/ngày |
| CN10 | Thành viên và điểm | Vinh | 6 | Tra khách, tích/đổi điểm, lịch sử; nối online/POS theo phạm vi source. Điểm và đơn/payment cùng transaction phù hợp; không cộng/trừ hai lần khi retry/callback; đơn chưa trả tiền không được cộng điểm; kiểm tra điểm không âm |
| CN11 | Voucher phía khách và POS | Vinh | 5 | Danh sách mã khả dụng, nhận/lưu mã, dùng tại quầy; tái sử dụng quản trị/validate/checkout online đã có. Chặn hết hạn/hết lượt/chưa đủ điều kiện, cạnh tranh lượt dùng và trả lượt đúng khi hủy theo nghiệp vụ; thống nhất thứ tự voucher rồi điểm |
| CN12 | Thanh toán không tiền mặt | Kiên | 6 | Chọn một luồng sandbox phù hợp (ưu tiên VNPAY sandbox nếu đủ cấu hình), nối UI/API/callback. Kiểm chữ ký, số tiền, mã đơn, trạng thái; callback lặp không thu/cộng điểm lại; redirect trình duyệt không tự đánh dấu paid. Không triển khai ngân hàng production/khẳng định chuyển khoản thật đã được xác minh |
| CN13 | Đánh giá sản phẩm | Kiên | 4 | UI danh sách/gửi đánh giá và API; khách đã mua/nhận theo quy tắc thống nhất, số sao hợp lệ, nội dung xử lý an toàn; chống đánh giá trùng theo ràng buộc đã chốt; khách A không sửa đánh giá B |

Tổng CN của Linh thực tế: 2+3+3+4+5 = **17**; Vinh: 4+4+6+5 = **19**; Kiên: 4+4+6+4 = **18**.

## 3. Làm trước, làm sau

### Đợt A — Chốt hợp đồng và hoàn thành phần ưu tiên Buổi 7

1. Linh tạo danh mục API/màn hình và chia file trước; giữ HTML/CSS/JavaScript frontend hiện tại, không tự đổi framework.
2. Vinh chốt công thức R1/R2/R3, fixture và ba SQL theo hợp đồng Buổi 7. Kiên bàn giao thành phần biểu đồ/xuất tệp dùng chung; từng chủ module tự nối báo cáo của mình.
3. Làm song song: Linh CN02 + CN07; Vinh CN05 + CN06 và SQL CN07; Kiên CN04 + khung chart/export.
4. Nghiệm thu ba báo cáo và upload bằng API thật, UI thật, dữ liệu mẫu tính tay. Không chờ ca làm hoàn tất mới làm báo cáo nhân viên: phần tổng hợp theo nhân viên có thể làm trước, thông tin ca bổ sung sau.

### Đợt B — Vận hành, tài khoản và ưu đãi

- Linh: CN03 → CN08 → CN09 (chốt hợp đồng ca/lịch trước, không gắn bắt buộc không có trong source).
- Vinh: CN11 → CN10; chốt trước thứ tự giảm giá, số tiền làm căn cứ cộng điểm và rollback/idempotency.
- Kiên: CN01 → CN13. Phần đổi mật khẩu khi đang đăng nhập dùng chung nền bảo mật CN01 nhưng là yêu cầu bổ sung K1, không giả thành đã có trong danh sách 13 cũ.

### Đợt C — Thanh toán và nghiệm thu tích hợp

- Kiên có thể chuẩn bị sandbox CN12 sớm; chỉ hợp nhất luồng paid/callback khi đã thống nhất hợp đồng điểm/voucher với Vinh.
- Vinh sở hữu hàm nghiệp vụ hoàn tất thanh toán/cộng điểm dùng chung; Kiên gọi hàm đó từ callback, không tạo hai cách cộng điểm khác nhau.
- Linh review tích hợp và hồi quy kho → kệ, online, POS, ca; Vinh/Kiên chạy kiểm thử chéo theo phân công dưới.
- Ngày bàn giao API ___; UI ___; kiểm thử ___; online ___: nhóm điền sau khi chốt thời gian thực tế, không tự coi hoàn thành tất cả trong 3 giờ Buổi 7.

## 4. Checklist bàn giao cho từng người

### Linh

- [ ] Chốt phạm vi/API/chủ sở hữu file dùng chung; xác nhận checklist mới với cả nhóm.
- [ ] CN02 hồ sơ; CN03 mã vạch; CN07 báo cáo nhân viên.
- [ ] CN08 lịch; CN09 ca; tích hợp đúng vào giao diện hiện có.
- [ ] Review Vinh về transaction/tồn/điểm/voucher và Kiên về quyền/callback/upload.
- [ ] Tổng hợp PR, bằng chứng và trạng thái thiếu; không tự xác nhận module mình mà không có người kiểm chéo.

### Vinh

- [ ] CN05 doanh thu; CN06 sản phẩm; SQL CN07 nhân viên.
- [ ] CN11 voucher khách/POS; CN10 điểm; thống nhất hàm paid với Kiên.
- [ ] Viết API/UI/test module mình, không chỉ giao SQL rồi coi hoàn thành.
- [ ] Review migration các module Linh/Kiên, chỉ ra dữ liệu cũ cần chuyển đổi; không reset DB nhóm.
- [ ] Kiểm chéo CN08/CN09 của Linh; xác nhận không trùng ca và liên kết đơn/ca đúng.

### Kiên

- [ ] CN04 upload; thành phần biểu đồ/export dùng lại cho 3 báo cáo.
- [ ] CN01 khôi phục; CN13 đánh giá; CN12 thanh toán sandbox.
- [ ] Viết API/UI/test module mình; bảo vệ secrets và bằng chứng.
- [ ] Kiểm chéo CN02/CN03 và CN10/CN11: quyền sở hữu, dữ liệu đầu vào, retry/cạnh tranh.
- [ ] Điều phối chạy bộ test chung và phát hành; từng chủ module sửa lỗi của mình, không giao Kiên sửa tất cả.

Review bổ sung: Linh kiểm CN01/CN04/CN12/CN13 của Kiên và CN05/CN06 của Vinh; Vinh kiểm số liệu CN07. Mọi người tự chạy unit/integration trước khi nhờ kiểm chéo.

## 5. Tránh giẫm code nhau

- Mỗi module đi trên nhánh riêng từ nền đã tích hợp, không push thẳng main hoặc nhánh người khác. Tên nhánh gợi ý: `Linh/chucnang/<ten>`, `Vinh/chucnang/<ten>`, `Kien/chucnang/<ten>`; chưa tạo các nhánh này bằng tài liệu.
- Backend thêm controller/service/repository theo module; không SQL trong controller/frontend. Migration có số duy nhất do Vinh điều phối, không cùng tạo một số hoặc sửa schema lịch sử thay migration.
- Frontend hiện `app.js` là file chung: Linh tách điểm mở rộng/thống nhất import theo module trước khi ba người sửa nhiều. Mỗi người làm module riêng; thay router/menu/`core.js`/CSS chung phải báo Linh để tích hợp tuần tự.
- `order.service.js`, `pos.service.js` là vùng tranh chấp: Vinh chịu phần voucher/điểm, Kiên callback thanh toán, Linh liên kết ca. Chốt chữ ký hàm và thứ tự transaction trước, merge từng PR có test; không tự chép đè cả file.
- Commit đặt tên có nghĩa, ví dụ `capnhathosocanhan`, `baocaodoanhthu`, `uploadanhtoan`; không dùng chuỗi ngẫu nhiên làm tên công việc.

## 6. Điều kiện chung để tích hoàn thành

- [ ] Quy tắc source được ghi và phần khác có lý do.
- [ ] API có quyền server, validation, lỗi chuẩn và OpenAPI cập nhật.
- [ ] Migration/fixture chạy được trên DB test, không phá dữ liệu hiện có.
- [ ] Giao diện dùng API thật, có loading/rỗng/lỗi, chạy desktop/mobile và bàn phím.
- [ ] Có test thành công, dữ liệu sai, thiếu/sai quyền; luồng tiền/tồn/điểm có rollback, retry và cạnh tranh khi phù hợp.
- [ ] Có người kiểm chéo, bằng chứng thực tế, hướng dẫn dùng; không chỉ screenshot giao diện mock.
- [ ] Hồi quy các chức năng cũ đạt, cập nhật trạng thái triển khai local/online riêng.

## 7. Việc môn học ngoài con số 13 — không được bỏ quên

13 nhóm trên là so với source cũ, không phải toàn bộ việc còn lại để nộp môn học. [Checklist Buổi 7](checklistbuoi7.md) vẫn cần: tìm kiếm nâng cao/sort (Vinh), audit server (Vinh)/UI (Linh hỗ trợ)/test (Kiên), thông báo có người nhận (Vinh API, Linh UI), đổi mật khẩu (Kiên), rà trang công khai/khả năng truy cập (Linh thực hiện, Kiên kiểm tra). Đây là phân công hỗ trợ mới cho các khoảng trống, không ghi nhận đã hoàn thành.

Frontend vừa có làm thay đổi hiện trạng K10 so với bảng rà nền Buổi 6: đã có trang sản phẩm công khai, nhưng chưa vì thế mà đạt WCAG/SEO/online đầy đủ. Không dùng bảng hiện trạng cũ để kết luận vẫn chưa có frontend.

Nếu có công việc Buổi 7 đang được hai bạn thực hiện theo phân công cũ, giữ phần đã làm và bàn giao rõ trước khi chuyển chủ trì. Không hủy hay viết lại đóng góp có sẵn. Tổng khối lượng phụ phải theo dõi riêng để điều chỉnh cân bằng sau mỗi đợt.
