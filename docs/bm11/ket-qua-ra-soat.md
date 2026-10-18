# Kết quả rà soát BM11

Thời điểm quét: 2026-10-18T16:17:47.839Z. HEAD được kiểm tra:
`a2bbae2552c1fffc11d440abe7760516f24091e3`.

## Phạm vi và kết quả

Repository đầy đủ lịch sử (không shallow). Sau fetch origin, đã xét 83 commit
truy cập được từ các refs cục bộ đã lấy về, 499 blob riêng biệt; quét 482 blob
văn bản và bỏ qua 17 blob nhị phân, không có blob quá 2 MiB. Công cụ dò theo mẫu
của nhóm phát hiện 18 vị trí ứng viên (không có nghĩa là 18 khóa thật khác nhau).
13 vị trí nằm trong blob có mặt tại HEAD. Không in giá trị bí mật ra báo cáo.

## Phân loại cần lưu ý

| Vị trí | Nhận định | Xử lý tiếp |
|---|---|---|
| backend/src/services/payment.service.js:11, commit mẫu ae1dd6d và 94d559e | Có giá trị khóa ký VNPay viết trực tiếp trong hai phiên bản lịch sử; không còn fallback này tại HEAD đã kiểm tra | Chủ tài khoản VNPay phải xác nhận thu hồi/đổi khóa đã lộ, kể cả sandbox. Chưa kiểm chứng hiệu lực khóa bằng dịch vụ ngoài |
| backend/test/test_concurrency.cjs:6, commit mẫu 48076bb | Có JWT dạng literal trong lịch sử; không còn blob này tại HEAD | Xác nhận phiên/token đã hết hạn hoặc bị thu hồi; không đưa JWT vào ảnh. Nếu có bằng chứng lộ khóa ký JWT, phải đổi khóa ký |
| Các tệp backend/test và tools/chapter5/runner.test.mjs | Chuỗi thử nghiệm/fixture cần phân biệt với bí mật vận hành | Không dùng lại làm khóa production; danh sách đầy đủ trong JSON đã che giá trị |
| backend/scripts/phone-demo.js:45 | Dòng sinh mật khẩu có thành phần ngẫu nhiên bị bộ dò đánh dấu | Không coi đây là một mật khẩu cố định đã lộ chỉ dựa vào cảnh báo |
| docs/buoi9/vinh/README.md:63 | Ví dụ cấu hình DB_PASSWORD trong tài liệu bị đánh dấu | Chỉ dùng giá trị minh họa, không thay bằng mật khẩu thật trong Git |

Các commit nêu trên là ví dụ chứa nội dung, không khẳng định commit đầu tiên
làm lộ giá trị. Không thử khóa/token trên dịch vụ thật.

## Cấu hình hiện tại

- backend/src/config/env.js lấy DB_PASSWORD, JWT_SECRET và VNP_HASH_SECRET từ
  biến môi trường. backend/.env.example để trống khóa VNPay, mật khẩu DB và dùng
  placeholder cho JWT_SECRET.
- .gitignore bỏ qua .env và .env.* trừ .env.example.
- tools/chapter5/.gitignore bỏ qua config.local.json và results/.
- git check-ignore xác nhận backend/.env và tools/chapter5/config.local.json
  được bỏ qua; git ls-files không liệt kê hai tệp này tại HEAD.

## Kết luận để ghi Phụ lục 04

Đã thực hiện rà lịch sử Git trong phạm vi nêu trên; chưa hoàn tất xử lý BM11.
Phát hiện khóa VNPay và JWT từng nằm trong lịch sử; cần bằng chứng thu hồi/đổi
khóa và xác nhận tình trạng token. Hiện chưa có xác nhận từ chủ tài khoản dịch vụ.
Không ghi “không có bí mật trong toàn bộ repository”.

17 blob nhị phân chưa được dò nội dung; cần rà riêng tài liệu/ảnh trước nộp.
Không tự rewrite lịch sử hoặc force-push. Bộ báo cáo là ảnh chụp trạng thái của
HEAD nêu trên, không tự xác nhận các commit thêm sau thời điểm quét.
