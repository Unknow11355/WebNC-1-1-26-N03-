# Bộ kiểm thử Chương 5 và hướng dẫn minh chứng

## Phạm vi và an toàn

Đây là script Node.js gọi **API thật**, không cần cài thêm package. Nó tự đăng nhập, lấy token, kiểm tra phản hồi và xuất HTML/JSON. Không phải Postman Collection/Newman; vẫn đáp ứng cách kiểm thử API bằng code. Không tuyên bố thay thế toàn bộ 25 ca đúng phân bố của thầy, mọi ô Không trong ma trận quyền hoặc đủ BM1–BM12.

Chỉ dùng hệ thống của nhóm và dữ liệu thử. Không tự sửa ứng dụng để làm xanh test. PASS chỉ cho điều kiện ghi trong ca; FAIL là sai kết quả hoặc lỗi kết nối; BLOCKED là thiếu điều kiện. Thiếu token không được tính là vượt qua kiểm tra phân quyền. HTTP 404 không được coi là PASS cho IDOR trong bộ này (kỳ vọng 403 theo tài liệu thầy).

Script không tạo đơn, không trừ tồn, không đổi mật khẩu, không xóa dữ liệu nghiệp vụ. Đăng nhập/đăng xuất tạo và thu hồi phiên riêng của lượt chạy. Có thể tạo giỏ rỗng nếu bật allowCreateCart; giỏ đó được giữ lại. Upload và thử sai mật khẩu phải bật riêng. Rate test có thể khóa tài khoản thử; dùng tài khoản riêng, không dùng tài khoản đang làm việc. Script không tự truy vấn DB để xác nhận log hoặc dọn file upload còn sót.

## 1. Chạy nhanh

Yêu cầu Node.js >=22, backend đang chạy; frontend cũng chạy nếu kiểm tra header.

Từ **gốc repository chứa thư mục tools**, Windows PowerShell:

```powershell
Copy-Item tools/chapter5/config.example.json tools/chapter5/config.local.json
```

Codespaces/Linux:

```bash
cp tools/chapter5/config.example.json tools/chapter5/config.local.json
```

Mở `config.local.json`, nhập email/password thật của bốn tài khoản thử:
- admin, employee, customerA, customerB; A và B phải là hai khách khác nhau.
- Điền `revision` bằng kết quả `git rev-parse HEAD` của **ứng dụng đang chạy**, không nhầm commit của nơi lưu script.
- Điền môi trường, ngày from/to (không quá 366 ngày).
- A phải có một đơn thử để test IDOR đơn. A có giỏ hoặc bật `allowCreateCart: true`.
- Không đưa config.local.json lên Git. File này và thư mục results đã được ignore.

Chạy:

```bash
node tools/chapter5/run.mjs
```

Đầu ra: `tools/chapter5/results/<thoi-diem>/report.html` và `report.json`. Terminal in đường dẫn cụ thể. Mã thoát 1 nghĩa là có FAIL/BLOCKED, không đồng nghĩa script bị hỏng. Mã 2 là lỗi cấu hình/khởi chạy.

Mở HTML trong trình duyệt, tìm các ca. Lưu nguyên JSON và HTML trước sửa; sửa lỗi ở ứng dụng rồi chạy lại tạo thư mục mới. Không chỉnh sửa kết quả cũ.

## 2. Chạy trên URL Codespaces

Điền:

```text
baseUrl = https://<URL-cổng-5173-thực-tế>/api/v1
webUrl  = https://<URL-cổng-5173-thực-tế>/
```

Không đưa token GitHub vào config. Nếu URL Private chuyển hướng sang GitHub, script sẽ ghi lỗi 302/không phải JSON; đó không phải ứng dụng vượt qua kiểm thử. Có thể chạy nội bộ trong Codespace bằng localhost để chẩn đoán nhưng phải ghi đúng là nội bộ, không thay ảnh chứng minh URL công khai. Rà soát dữ liệu/tài khoản demo trước khi công khai. Không công khai cổng DB.

## 3. Những tùy chọn có tác động

- `allowUpload: true`: gửi một file văn bản giả PNG và một file >5 MiB. Kiểm tra thủ công thư mục uploads sau thử; file bị từ chối phải được dọn. Không tự thử mã thực thi.
- `allowRateTest: true`: cấu hình `rateAccount.email` là tài khoản thử có thật, `wrongPassword` chắc chắn khác mật khẩu thật; yêu cầu tài khoản không đang bị khóa/giới hạn. Test kỳ vọng 5 lần đầu 401, lần 6 trả 429. Phải chụp log liên quan riêng; 429 đơn thuần chưa đủ Ảnh 25.
- `benchmark: true`: gọi tuần tự 5 warm-up + 50 mẫu mỗi API. Chỉ lưu median khi đủ 50 phản hồi thành công. Kết quả không chứng minh tốc độ dưới tải đồng thời.

## 4. Đo trước–sau tối ưu (Ảnh 27–29)

1. Dùng DB benchmark riêng; chuẩn bị >=5.000 bản ghi bảng chính và dữ liệu quan hệ. Không reset DB nhóm.
2. Ghi CPU/RAM, Node/DB, số bản ghi, mạng, token/role, from/to và cấu hình cache trong conditions.
3. Dùng phiên bản trước tối ưu thực sự; `measurementLabel: before`, chạy benchmark.
4. Lưu EXPLAIN của truy vấn và ảnh 27.
5. Áp dụng tối ưu có kiểm soát trên DB thử; giữ dữ liệu và điều kiện tương đương. Không gỡ chỉ mục trên DB đang dùng chỉ để tạo baseline.
6. Lưu EXPLAIN sau tối ưu, ảnh 28. Có index không đồng nghĩa optimizer dùng index; ghi đúng kết quả.
7. Chạy lại `measurementLabel: after`. Lấy medianMs và samples từ hai report.json lập bảng 5 API. (before-after)/before*100. Không đổi nhãn hai lượt cùng code thành trước/sau.
8. Cache nóng được làm ấm trong 5 warm-up; ghi rõ điều này. Nếu cần đo cache lạnh, tách thí nghiệm riêng. Ảnh 29 phải kèm điều kiện đo.

## 5. Những phần phải kiểm tra thêm bằng tay/trình duyệt

### Ảnh 16 — SQL
Giữ ảnh đã chụp; báo cáo script bổ sung các đường dẫn được chạy. Liệt kê tất cả trường tìm kiếm/ID của ứng dụng, bổ sung những endpoint chưa phủ. Không lấy vài endpoint đại diện để kết luận toàn hệ thống an toàn.

### Ảnh 17 — XSS lưu trữ
Trên dữ liệu thử, chọn trường văn bản có thể lưu và mở lại (ghi chú/đánh giá theo chức năng thực tế). Dùng marker vô hại như `<img src=x onerror="document.body.dataset.chapter5xss='executed'">`. Lưu rồi tải lại trang. Mong đợi chuỗi hiện như văn bản; Console kiểm tra `document.body.dataset.chapter5xss` không là `executed`. Chụp trường sau khi mở lại và kết quả kiểm tra. Không lấy HTTP 200 của API làm bằng chứng XSS an toàn. Dọn marker của mình sau thử; không xóa dữ liệu của người khác.

### Ảnh 18 — CSRF
Thầy yêu cầu gửi biểu mẫu từ trang ngoài và bị từ chối 403. Cần trang có **origin khác**, một endpoint thật làm thay đổi trạng thái, dữ liệu thử và kiểm tra trạng thái trước/sau. Với ứng dụng Bearer không dùng cookie, kết quả có thể là 401; ghi thật, chưa tự đổi thành đạt đúng mẫu 403. Một request Postman không token không tái hiện đầy đủ CSRF trong trình duyệt. Chốt endpoint với người phụ trách trước khi thử, không gửi tới thao tác xóa/thu tiền thật.

### Ảnh 19–20 — IDOR và ma trận quyền
Chụp chi tiết IDOR trong HTML (A 200, B 403 cùng ID); chụp bảng các ROLE tests. Bộ hiện tại chỉ có mẫu đọc kho/báo cáo/audit/users; phải đối chiếu **từng ô Không** của ma trận, bổ sung cả API ghi bằng dữ liệu thử. Một báo cáo 30 ca không tự chứng minh phủ đủ ma trận.

### Ảnh 21 — Băm mật khẩu
Mở DB thử bằng công cụ quản trị, chỉ chọn user_id và password_hash của tài khoản mẫu. Chụp thấy giá trị bcrypt; che phần lớn hash và dữ liệu cá nhân, không xuất bảng users đầy đủ. Ghép với đoạn bcrypt cost 12 trong mã. Không đưa mật khẩu thật vào ảnh.

### Ảnh 22 — Phiên
Mẫu thầy là thuộc tính cookie. Dự án hiện dùng JWT/sessionStorage + user_sessions, không bịa cookie HttpOnly. Chụp cơ chế thực tế (che token), báo cáo SESSION 200→200→401 và bản ghi revoked_at của phiên thử nếu có quyền. Xin xác nhận giảng viên về minh chứng tương đương cho JWT; không tự tuyên bố mẫu cookie đã hoàn thành.

### Ảnh 23 — Upload
Chụp kết quả file giả/file quá lớn. Kiểm tra file bị từ chối không còn trên đĩa. Kiểm tra truy cập trực tiếp tệp không được phép theo chính sách; ảnh sản phẩm công khai hợp lệ không nhất thiết phải bị chặn. Upload 415 không chứng minh toàn bộ cơ chế lưu/phục vụ file an toàn.

### Ảnh 24–26 — Lỗi, tần suất, header
- 24: chụp ca ERROR và phản hồi 400/500 có kiểm soát, không lộ stack/SQL; không cố làm hỏng DB đang dùng.
- 25: chụp RATE-LOGIN và audit/log có thời điểm tương ứng; reset-password rate limit không thay đăng nhập rate limit.
- 26: chạy `curl -I https://<ten-mien-thuc-te>/` (PowerShell dùng curl.exe). Chụp đầy đủ **5 header được tài liệu thầy quy định**; test HEADERS hiện chỉ assert 3 header đã biết, không thay việc đối chiếu đủ 5. Không xem lỗi redirect sang trang GitHub là header của ứng dụng.

### Rà soát mã và bí mật
Lập bảng BM1–BM12 liên kết tới tệp/hàm và mã ca, ghi rõ phần chưa có. Rà soát lịch sử Git, không chỉ file hiện tại; không chụp/đưa secrets phát hiện được vào báo cáo. Nếu có bí mật thật, thu hồi/thay khóa trước, xử lý lịch sử theo quy trình nhóm.

### Ảnh 30 — SEO/WCAG
Chạy Lighthouse trên URL thực tế và lưu báo cáo gốc, chụp điểm kèm URL/thời gian/role. Nếu dùng axe, ghi phiên bản và lỗi. Kiểm tra thủ công Tab/Shift+Tab/Enter/Space/Escape cho toàn luồng đăng nhập + một luồng nghiệp vụ, focus rõ, không mắc kẹt modal. Kiểm tra zoom 200%, màn hẹp, nhãn, alt, lỗi biểu mẫu và tương phản. Truy cập trực tiếp sitemap.xml/robots.txt; chưa có thì ghi thiếu. Điểm Lighthouse 100 không phải chứng nhận WCAG AA. Đối chiếu từng hàng Phụ lục 09.

### Ảnh 32 — Báo cáo API tự động
Chụp đầu report.html có URL/commit/thời điểm và bảng kết quả. Giữ các FAIL/BLOCKED, không che để làm đẹp kết quả. Đây là báo cáo Chương 5; vẫn cần bộ tối thiểu 25 ca phân bố nghiệp vụ/ngoại lệ/bảo mật/báo cáo đúng yêu cầu Chương 6.

## 6. Viết vào báo cáo

Mỗi ca ghi: mã, mục tiêu, tiền đề, dữ liệu thử, bước thực hiện, mong đợi, thực tế, kết luận, đường dẫn bằng chứng. Trước–sau chỉ dùng khi có lỗi thực sự đã sửa và chạy lại cùng ca. Các ảnh phải đủ ngữ cảnh URL/thời điểm/vai trò, token/password được che. Bảng BM không tự đánh dấu đạt từ sự tồn tại của test.

## 7. Kiểm tra bản thân script

```bash
node --check tools/chapter5/run.mjs
node --test tools/chapter5/runner.test.mjs
```

Các helper test này chỉ kiểm tra script (che dữ liệu, escape HTML, median), **không phải 10 unit test Service của ứng dụng** và không phải kết quả bảo mật hệ thống.
