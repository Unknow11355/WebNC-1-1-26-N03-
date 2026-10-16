# Checklist Buổi 9 — Vinh và Kiên tự triển khai, Linh kiểm tra sản phẩm cuối

## 1. Cách làm việc đã chốt

- **Vinh: V2 + V3** — dữ liệu, đo hiệu năng và tối ưu backend.
- **Kiên: V4 + V5** — kiểm thử, khả năng truy cập, SEO, triển khai bản kiểm thử và tài liệu.
- **Linh: V1** — nhận bàn giao, kiểm tra sản phẩm cuối, rà yêu cầu hợp nhất và nghiệm thu. Không có bước bắt buộc chờ Linh duyệt kế hoạch, chọn API hay chọn ca trước khi làm.
- Hai bạn lấy `main` mới nhất, tự triển khai trên nhánh riêng và phối hợp trực tiếp khi cần tích hợp. Tên nhánh đề xuất: `Vinh/v2-v3/buoi9`, `Kien/v4-v5/buoi9`.
- Không tự gộp vào main hoặc force-push. Mở pull request về main, đính kèm kết quả và hướng dẫn để Linh kiểm tra cuối. Không đưa token, .env, mật khẩu thật hay backup dữ liệu thật lên Git.
- Giữ nghiệp vụ đã có; không tự đổi hợp đồng API để phục vụ bài đo. Nếu buộc phải thay đổi, ghi rõ lý do, ảnh hưởng và hướng dẫn chuyển đổi trong bàn giao.
- Mọi mục dưới đây ban đầu **chưa hoàn thành**. Chỉ tick khi có sản phẩm/bằng chứng thật. Không lấy số liệu mẫu làm kết quả thực tế.

## 2. Vinh — V2 và V3

### Bước A Chuẩn bị và đo trước tối ưu

- [ ] Tạo nhánh từ main mới nhất, ghi commit xuất phát và phiên bản Node/MySQL vào báo cáo đo.
- [ ] Kiểm tra backend khởi động và API hoạt động. Không giả định các sửa local trên máy Linh đã có trong Git; nếu vướng dependency/route báo cáo thì xử lý lỗi tiên quyết và ghi commit riêng trước baseline.
- [ ] Tạo database đo riêng; viết script sinh ít nhất **5.000 bản ghi bảng chính**, có dữ liệu liên quan hợp lệ và phân bố đủ để truy vấn có ý nghĩa.
- [ ] Script sinh dữ liệu có hướng dẫn, không mặc định xóa/reset database nhóm.
- [ ] Tự chọn tối thiểu **5 API thực tế**: ưu tiên danh sách sản phẩm có tìm kiếm/lọc, danh sách đơn, báo cáo doanh thu, báo cáo sản phẩm, nhật ký hệ thống. Nếu thay API, nêu lý do và giữ đủ 5 API.
- [ ] Lưu method, URL, query, vai trò gọi và số dòng dữ liệu. Đảm bảo kết quả HTTP đúng trước khi đo; không lấy tốc độ trả lỗi 401/500 làm hiệu năng.
- [ ] Viết script đo **50 lần/API**, lưu dữ liệu thô và trung vị trước tối ưu. Ghi warm-up, mức đồng thời, điều kiện mạng và cách tính trung vị (50 mẫu: trung bình hai giá trị giữa sau sắp xếp).
- [ ] Chụp **Ảnh 27**: EXPLAIN trước tối ưu trên truy vấn cần xử lý; lưu câu SQL và tham số mẫu không nhạy cảm.

### Bước B Tối ưu và đo lại

- [ ] Tạo migration chỉ mục phù hợp theo truy vấn đã đo; tránh tạo chỉ mục trùng. Giữ nguyên ràng buộc nghiệp vụ.
- [ ] Chụp **Ảnh 28**: EXPLAIN sau tối ưu cùng truy vấn/dữ liệu; giải thích thay đổi kiểu truy cập, key và rows. Không bịa full scan nếu baseline đã dùng index.
- [ ] Rà và khắc phục truy vấn lặp/N+1; ghi vị trí code và số truy vấn trước/sau nếu có.
- [ ] Áp dụng cache cho API nặng nhất, ghi key, TTL và cách làm mất hiệu lực khi dữ liệu thay đổi. Không dùng chung cache làm lộ dữ liệu giữa người dùng/vai trò.
- [ ] Kiểm thử cập nhật dữ liệu rồi đọc lại để chứng minh cache không trả dữ liệu cũ sai nghiệp vụ.
- [ ] Đo lại **50 lần/API** với cùng điều kiện và payload. Tách rõ cache lạnh/nóng; không so sánh hai bộ dữ liệu khác nhau.
- [ ] Lập bảng: API, số bản ghi, số lần đo, trung vị trước/sau, tỷ lệ thay đổi và giải thích. Chụp **Ảnh 29** cho bảng/kết quả đo.
- [ ] Chạy kiểm thử liên quan sau tối ưu; giữ nguyên kết quả nghiệp vụ và phân quyền.
- [ ] Viết bản nháp **mục 5.4** và danh mục API đã tối ưu.

### Vinh phải bàn giao

- [ ] Code + script sinh dữ liệu + migration chỉ mục + script đo chạy lại được.
- [ ] `docs/buoi9/vinh/README.md`: lệnh chạy, môi trường, commit trước/sau, API, dữ liệu, cache và giới hạn.
- [ ] `docs/buoi9/vinh/hieu-nang.md` cùng dữ liệu đo thô (JSON/CSV), tối thiểu 5 API × 50 mẫu × 2 lần đo.
- [ ] Ảnh 27, 28, 29 trong `docs/buoi9/vinh/minh-chung/`.
- [ ] `docs/buoi9/vinh/muc-5-4.md` và danh sách lỗi đã sửa/còn tồn tại.
- [ ] Pull request có commit riêng của Vinh; gửi đường dẫn cho Linh khi hoàn tất. Cập nhật số bảng có ràng buộc/chỉ mục đầy đủ, trung vị truy vấn nóng, số API nghiệp vụ hoàn thành và số quy tắc đã kiểm chứng.

## 3. Kiên — V4 và V5

### Bước A Bộ ca và kiểm tra giao diện

- [ ] Tạo nhánh từ main mới nhất, tự rà bộ ca tích lũy Buổi 4–8.
- [ ] Chốt **25 ca không trùng nhau** theo phân bố cụ thể: **9 nghiệp vụ chính + 6 ngoại lệ/dữ liệu biên + 7 phân quyền/bảo mật + 3 báo cáo/xuất dữ liệu = 25**. Đây là lựa chọn của nhóm nằm trong khoảng thầy cho phép, không phải tỷ lệ duy nhất thầy quy định.
- [ ] Mỗi ca có mã, nhóm, chức năng, vai trò, tiền điều kiện, dữ liệu, bước làm, mong đợi, thực tế, kết luận và minh chứng.
- [ ] Không dùng 164 biến thể SQL Injection của BM1 để thay bộ 25 ca tổng hợp. Ca chưa có tính năng/thiếu môi trường ghi Blocked/Chưa đạt, không ghi PASS.
- [ ] Rà alt ảnh, label biểu mẫu, thứ bậc heading, tương phản và focus nhìn thấy được.
- [ ] Thực hiện toàn bộ đăng nhập và một luồng nghiệp vụ chính chỉ bằng bàn phím; kiểm tra Tab, Shift+Tab, Enter, Escape và đóng/mở hộp thoại. Lưu các bước và bằng chứng.
- [ ] Hoàn thiện metadata trang công khai, `sitemap.xml`, `robots.txt`. Không liệt kê trang riêng tư vào sitemap; robots.txt không thay thế phân quyền.
- [ ] Giữ CSP hiện tại; không thêm unsafe-inline chỉ để hết lỗi. Không xóa các ID main/nav/identity/notice/dialog/dialog-title/dialog-content/close-dialog mà frontend phụ thuộc.
- [ ] Chạy kiểm tra tự động (ví dụ Lighthouse) và lập bảng WCAG 2.1 AA có tiêu chí, kết quả, bằng chứng, cách sửa. Không coi điểm Lighthouse là chứng nhận đạt mọi tiêu chí WCAG.
- [ ] Chụp **Ảnh 30** bảng điểm; ghi URL, thời gian, desktop/mobile và cấu hình chạy.

### Bước B Tích hợp bản thử nghiệm và chạy cuối

- [ ] Chủ động lấy bản hoàn thành từ nhánh Vinh vào nhánh tích hợp thử nghiệm của Kiên bằng merge thông thường; không cần chờ Linh duyệt kế hoạch và không tự gộp main.
- [ ] Ghi commit của cả hai phần trong báo cáo; phối hợp trực tiếp với Vinh nếu xung đột backend/API, không ghi đè phần của nhau.
- [ ] Triển khai bản kết hợp lên môi trường trực tuyến được phép của nhóm. Nếu chưa có quyền truy cập/môi trường, ghi blocker cụ thể; không lấy localhost làm minh chứng trực tuyến.
- [ ] Chạy **toàn bộ 25 ca trên môi trường trực tuyến**; dùng tài khoản/dữ liệu thử nghiệm, không gây hại dữ liệu thật.
- [ ] Xuất bộ Postman và môi trường mẫu không chứa token/mật khẩu thật; cung cấp một lệnh chạy tự động, ghi rõ prerequisite.
- [ ] Chụp **Ảnh 32** kết quả API tự động: số ca/assertion, số lỗi, thời gian và môi trường. Phân biệt số request với số ca.
- [ ] Truy cập trực tiếp sitemap.xml và robots.txt trên tên miền và lưu kết quả.
- [ ] Ghi lỗi vào bảng, tự sửa lỗi frontend/kiểm thử; chuyển lỗi backend cho Vinh xử lý. Chạy lại ca lỗi và ca hồi quy liên quan sau mỗi sửa.
- [ ] Không thực hiện payload phá dữ liệu trên deployment dùng chung; các ca nguy hiểm phải có môi trường thử nghiệm tách riêng và ghi rõ phạm vi.
- [ ] Viết **mục 5.5 và bản nháp Chương 6**, ghi hạn chế/lỗi còn tồn tại; không điền kết quả mong đợi vào cột thực tế khi chưa chạy.

### Kiên phải bàn giao

- [ ] `docs/buoi9/kien/README.md`: URL, commit đã deploy, cách chạy test và thông tin môi trường không nhạy cảm.
- [ ] `docs/buoi9/kien/25-ca-kiem-thu.md` đủ 25 ca với kết quả thực tế.
- [ ] Collection, environment mẫu và báo cáo tự động đã loại bí mật trong `docs/buoi9/kien/`.
- [ ] `docs/buoi9/kien/wcag.md`, ảnh 30 và 32 trong `docs/buoi9/kien/minh-chung/`, bằng chứng bàn phím/sitemap/robots.
- [ ] `docs/buoi9/kien/muc-5-5.md`, `chuong-6.md` và danh sách lỗi còn lại.
- [ ] Pull request có lịch sử đóng góp riêng, ghi phần tích hợp từ Vinh để Linh không gộp trùng. Cập nhật số BM có minh chứng, số ca và tỷ lệ đạt, số lần triển khai thành công, số trang báo cáo hoàn thành.

## 4. Linh chỉ kiểm tra sản phẩm cuối

- [ ] Nhận đủ PR và hồ sơ bàn giao, không yêu cầu duyệt kế hoạch trước.
- [ ] Kiểm tra nguồn số liệu, dữ liệu thô, ảnh và commit tương ứng; không chấp nhận chỉ có lời khẳng định đã làm.
- [ ] Kiểm tra đủ 5 API, 5.000 bản ghi, 50 lần đo và số liệu trước/sau cùng điều kiện; có chỉ mục, xử lý truy vấn lặp và cache.
- [ ] Kiểm tra 25 ca đúng phân bố 9/6/7/3, kết quả trên môi trường trực tuyến, ảnh 27–30 và 32, bảng WCAG.
- [ ] Mở trang chính, đăng nhập, hộp thoại chi tiết và một luồng chính sau tích hợp; kiểm tra Console không lỗi khởi tạo.
- [ ] Rà PR, yêu cầu sửa những mục thiếu; chỉ nghiệm thu khi có kết quả kiểm thử lại. Lập danh mục lỗi đã khắc phục và các lỗi chưa đóng.
- [ ] Kiểm tra bản nháp mục 5.4, 5.5 và Chương 6; tổng hợp hồ sơ nộp, cập nhật số PR đã rà và tỷ lệ kế hoạch hoàn thành.

## 5. Mẫu ghi lỗi và bàn giao

| Mã lỗi | Mô tả và bước tái hiện | Người xử lý | Commit sửa | Kết quả kiểm thử lại | Minh chứng | Trạng thái |
|---|---|---|---|---|---|---|
| B09-001 | Điền khi phát hiện lỗi thực tế | Vinh hoặc Kiên | Chưa có | Chưa chạy | Chưa có | Chưa đánh giá |

Mỗi PR phải trả lời: đã làm gì; cách chạy lại; đo/test trên commit và môi trường nào; các file minh chứng ở đâu; còn lỗi gì. Không tick hoàn thành toàn bộ nếu có blocker hoặc minh chứng thiếu.

## 6. Căn cứ yêu cầu

- Sổ tay thực hành 10 buổi CSE702051, Buổi 09, trang 47–50: hiệu năng, khả năng truy cập, kiểm thử; sản phẩm và vai trò.
- Tài liệu kỹ thuật hướng dẫn hoàn thiện dự án, mục 7.4, trang 40: 8–10 ca nghiệp vụ chính, 5–6 ngoại lệ/biên, 6–8 phân quyền/bảo mật, 3–4 báo cáo/xuất dữ liệu. Checklist chọn 9/6/7/3 để tổng bằng 25.
- Tên thư mục, tên nhánh và cách phối hợp trong checklist là quy ước triển khai của nhóm. Checklist không xác nhận công việc đã được thực hiện.
