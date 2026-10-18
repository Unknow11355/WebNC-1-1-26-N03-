# BM11 sau làm sạch lịch sử

Đã dùng git-filter-repo 2.47.0 thay thế chính xác hai giá trị nhạy cảm đã nhận
diện (khóa VNPay và JWT cũ), không in giá trị ra báo cáo. Thực hiện trên bản
bare clone mới lấy đủ 18 nhánh từ GitHub; không có tag tại thời điểm xử lý.

- 4 blob thay đổi; kiểm tra lại 503 blob truy cập được: không còn hai giá trị mục tiêu.
- Cập nhật đồng thời 18 nhánh bằng atomic push và force-with-lease với SHA cũ
  cụ thể. Kiểm tra lại refs từ GitHub: khớp toàn bộ 18 nhánh.
- Nội dung tree của main ngay trước/sau rewrite giống nhau:
  `315d4b4dd7ddf1db4d7625711d13dd3a1630c05a`.
- Main sau rewrite, trước bản ghi này: `744d442`.
- Không thu hồi/đổi khóa trên VNPay. Chủ tài khoản vẫn phải thực hiện bước này.

Các báo cáo scan-redacted.json và ket-qua-ra-soat.md là bằng chứng trước xử lý,
giữ nguyên thời điểm và SHA cũ; không dùng chúng làm kết quả quét HEAD mới.

## Cảnh báo phối hợp

Không merge/push các nhánh từ clone/Codespaces cũ: có thể đưa lịch sử có khóa
trở lại. Lưu riêng phần việc chưa commit, clone repository vào thư mục mới,
chuyển các thay đổi cần giữ bằng patch đã rà soát, không merge lịch sử cũ.
Không xóa thư mục làm việc cũ khi chưa bảo toàn các thay đổi chưa commit.

Clone/fork cũ và refs/cache của pull request do GitHub quản lý có thể còn giữ
commit cũ. Việc cập nhật nhánh không chứng minh xóa mọi bản sao. Nếu cần xóa
tham chiếu PR/cache, chủ repository cần làm việc với GitHub Support theo hướng
dẫn https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository.

Trạng thái BM11: đã làm sạch hai giá trị khỏi lịch sử các nhánh công khai được
kiểm tra; còn xác nhận thu hồi khóa/token và xử lý các bản sao ngoài phạm vi.
