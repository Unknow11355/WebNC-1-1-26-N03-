# BM11 — Rà soát bí mật trong mã nguồn và lịch sử Git

## Cách chạy và lấy minh chứng

Tại thư mục gốc repository:

```bash
git fetch origin
node tools/bm11/scan-history.mjs
```

Chụp câu lệnh cùng phần tổng kết (thời gian, HEAD, số commit, số đối tượng,
số phát hiện). Lưu `Anh_BM11_Ra_Soat_Lich_Su_Git.png`. Báo cáo
`docs/bm11/scan-redacted.json` chỉ chứa vị trí và loại phát hiện, không chứa
giá trị khóa. Không chụp `.env`, token hoặc khóa thật.

Script không gọi dịch vụ ngoài để thử hiệu lực khóa. Phát hiện là ứng viên
cần phân loại; các chuỗi trong test/demo không tự động là bí mật production.
Đây là bộ dò theo mẫu, không phải Gitleaks/TruffleHog và không chứng minh
repository hoàn toàn không còn bí mật.

## Phạm vi

Quét các commit truy cập được từ refs đã có trên máy sau fetch (bao gồm
remote branches), xét mỗi blob văn bản một lần, giới hạn 2 MiB. Báo cáo ghi
rõ số blob nhị phân/quá lớn bị bỏ qua. Các nhánh remote đã xóa mà chưa từng
fetch, commit không còn ref trỏ tới, tệp không được Git theo dõi và bí mật
mã hóa/đóng gói không nằm trong phạm vi. DOCX/PDF/ảnh cần rà thủ công riêng.
`representativeCommit` là commit mẫu chứa blob, không phải lần xuất hiện đầu.
`presentInHead` nói blob có mặt trong HEAD, không đánh giá giá trị khóa còn hiệu lực.

## Xử lý khi khóa từng bị lộ

1. Chủ tài khoản dịch vụ thu hồi/đổi khóa trên nhà cung cấp (kể cả sandbox).
2. Cập nhật khóa mới trong biến môi trường/secret store, không đưa vào Git.
3. Kiểm tra hoạt động và ghi bằng chứng đã đổi khóa, chỉ ghi ngày và người xác nhận.
4. Nếu cần làm sạch lịch sử, thống nhất với nhóm trước khi rewrite/force-push;
   phải tính đến clone, fork, nhánh và bản sao cũ. Không tự xóa lịch sử chung.
5. Chạy lại kiểm tra. Không ghi BM11 hoàn tất khi chưa xử lý khóa lịch sử.

`.gitignore` không xóa nội dung đã từng commit. Xóa khóa khỏi HEAD không thay
thế việc thu hồi khóa. Không đưa giá trị khóa vào bảng kiểm Phụ lục 04.
