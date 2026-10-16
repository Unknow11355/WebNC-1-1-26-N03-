# Checklist lỗi cần sửa và phần cần hoàn thiện trước bàn giao

Ngày lập: 16/10/2026. Tổng hợp từ lần rà soát main `bf37e0c` và nhánh Kiên `11622d8`, không phải kết quả kiểm thử lại phiên bản mới. Xem thêm [phân công Buổi 10](checklistbuoi10.md).

**Cách đọc:** P1 = ưu tiên sửa trước nghiệm thu; P2 = hoàn thiện tiếp. “Đã chạy” là đã quan sát lỗi ở phiên bản rà soát; “Đọc code” là phát hiện qua mã nguồn, cần tái hiện; “Thiếu/tích hợp” không đồng nghĩa tính năng chưa được ai viết; “Cần kiểm chứng” chưa được kết luận là lỗi.

Mỗi ô ☐ chỉ đổi thành ☑ sau khi có commit sửa và bằng chứng đạt. Vinh phụ trách backend/dữ liệu; Kiên phụ trách giao diện, phần code của Kiên và kiểm thử; Linh kiểm tra sản phẩm cuối. Nếu API và UI cùng thay đổi, hai bạn trao đổi trực tiếp.

## A. Lỗi kỹ thuật và tích hợp cần ưu tiên

| Xong | Mã | Ưu tiên | Hiện trạng / cơ sở | Việc cần sửa | Phụ trách | Điều kiện đóng mục |
| --- | --- | --- | --- | --- | --- | --- |
| ☐ | L01 | P1 | Đọc code nhánh Kiên: payment/review dùng `req.user`, middleware cung cấp `req.auth` | Thống nhất cách lấy userId/role, không nhận danh tính do client tự gửi | Kiên | Người đúng quyền tạo thanh toán/đánh giá được; chưa đăng nhập bị chặn; gọi chéo bị chặn; không lỗi 500 |
| ☐ | L02 | P1 | Đọc code nhánh Kiên: cấu hình thanh toán có secret dự phòng hardcode | Bỏ secret khỏi code, dùng biến môi trường; thiếu cấu hình phải báo rõ. Nếu khóa từng công khai là khóa thật, thay khóa | Kiên | Quét không còn secret thật; cấu hình sandbox chạy; thiếu cấu hình không dùng khóa mặc định |
| ☐ | L03 | P1 | Đọc code nhánh Kiên: mã giao dịch tạo ra chưa được lưu/đối chiếu đầy đủ; browser return cũng gọi xử lý ghi thanh toán | Lưu giao dịch và xác minh mã, số tiền, chữ ký, trạng thái bằng thông báo server-to-server hợp lệ; return chỉ hiển thị/tra cứu | Kiên, Vinh hỗ trợ | Return giả, sai tiền, sai chữ ký, mã không tồn tại không đổi đơn thành đã thanh toán |
| ☐ | L04 | P1 | Đọc code nhánh Kiên: cập nhật thanh toán chưa nguyên tử/chống lặp đầy đủ, tự chuyển đơn completed, thiếu `paid_at` và đồng bộ nghiệp vụ | Dùng transaction và cơ chế chống xử lý lặp; giữ đúng vòng đời đơn, ngày thanh toán, tồn/điểm/cache theo đặc tả | Vinh + Kiên | Callback lặp/đồng thời chỉ ghi nhận một lần; đơn không hợp lệ bị chặn; báo cáo thấy giao dịch; không nhân đôi điểm/trừ tồn |
| ☐ | L05 | P1 | Đã chạy trên main: trang reports/upload/audit trả 404; nhánh Kiên có phần bổ sung nhưng chưa tích hợp | Tích hợp route phục vụ trang và tài nguyên liên quan | Kiên | Mở trực tiếp và từ menu đều được; JS/CSS tải thành công; quyền truy cập đúng |
| ☐ | L06 | P1 | Đọc code cả main và nhánh Kiên: báo cáo frontend còn số liệu mock | Nối API thật, xử lý bộ lọc, trạng thái tải/lỗi và xuất dữ liệu | Kiên; Vinh cung cấp API | Tạo giao dịch thử làm số liệu thay đổi đúng; bộ lọc và tệp xuất khớp DB, không dùng số cố định |
| ☐ | L07 | P1 | Đọc code nhánh Kiên: giao diện nhật ký gọi `/audit`, backend dùng `/audit-logs` | Sửa URL và ánh xạ response, kiểm tra quyền | Kiên | Admin đọc được nhật ký; vai trò không được phép bị chặn; không còn lỗi sai route |
| ☐ | L08 | P1 | Đọc code: upload trả URL nhưng chưa thấy đường phục vụ ảnh tương ứng; giao diện Kiên mới báo URL, chưa gắn sản phẩm | Hoàn thiện phục vụ ảnh an toàn và lưu liên kết ảnh vào sản phẩm | Kiên; Vinh hỗ trợ lưu dữ liệu | Upload ảnh hợp lệ → lưu sản phẩm → tải lại vẫn thấy ảnh; URL đọc được; không truy cập được tệp ngoài thư mục cho phép |
| ☐ | L09 | P1 | Đọc code: reset token mặc định không trả ra, chưa có kênh giao token cho người dùng | Bổ sung kênh nhận link/mã thử nghiệm phù hợp và nối giao diện; không công khai token trên production | Kiên | Người dùng nhận link/mã, đổi mật khẩu được; token hết hạn/dùng lại bị từ chối; không lộ thông tin nhạy cảm |
| ☐ | L10 | P1 | Đọc code: chưa thấy giới hạn đăng nhập sai; giới hạn reset không thay thế giới hạn login | Bổ sung giới hạn theo yêu cầu đã chốt và kiểm thử ngưỡng/thời gian mở lại | Kiên | Có kết quả số lần sai, lần bị giới hạn và thời gian mở lại; tài khoản/IP khác xử lý đúng chính sách |
| ☐ | L11 | P1 | Đọc code setup Codespaces: thiếu bước migration CN10 điểm thưởng | Đồng bộ thứ tự migration và hướng dẫn tạo DB mới; không reset DB đang dùng | Vinh | Dựng trên DB rỗng không thiếu bảng/cột; điểm thưởng hoạt động; chạy lại migration an toàn |
| ☐ | L12 | P2 | Đọc code main: handler/style inline có nguy cơ bị CSP hiện tại chặn; nhánh Kiên đã có phần tách | Tích hợp script/style tách riêng, kiểm tra trình duyệt; không thêm unsafe-inline để né lỗi | Kiên | Thao tác trên các trang liên quan chạy và không có vi phạm CSP do code ứng dụng |
| ☐ | L13 | P2 | Đã chạy trên main: `/sitemap.xml`, `/robots.txt` trả 404 | Bổ sung file/route đúng miền triển khai và phạm vi trang công khai | Kiên | Cả hai URL trả nội dung đúng; sitemap không chứa trang riêng tư; không dùng robots thay phân quyền |

## B. Phần chức năng còn thiếu hoặc chưa tích hợp đủ

Các mục này phải đối chiếu đặc tả Buổi 2 trước khi mở rộng; không tự coi mọi chức năng của source cũ là bắt buộc của bản mới.

| Xong | Mã | Ưu tiên | Hiện trạng theo lần rà soát | Việc cần hoàn thiện | Phụ trách | Điều kiện đóng mục |
| --- | --- | --- | --- | --- | --- | --- |
| ☐ | C01 | P1 | CN12 thanh toán, CN13 đánh giá có code nhánh Kiên, chưa có trên main được rà soát | Tích hợp sau khi sửa L01–L04 và kiểm tra C06; tránh ghi đè thay đổi mới của Vinh | Kiên | Phiên bản tích hợp có đủ API/UI, migration, test; ghi commit cụ thể |
| ☐ | C02 | P2 | CN07 có số tổng hợp backend, thiếu phần báo cáo nhân viên đầy đủ | Đối chiếu yêu cầu chi tiết/lịch sử, bổ sung API cần thiết và nối UI thật | Vinh API, Kiên UI | Nội dung và bộ lọc khớp phạm vi cam kết, số liệu đối chiếu được |
| ☐ | C03 | P2 | CN10 có nghiệp vụ/API điểm nhưng chưa có UI tương ứng | Hiển thị số dư/lịch sử và thao tác sử dụng điểm theo đặc tả | Kiên UI, Vinh nghiệp vụ | Một luồng kiếm/dùng/hoàn điểm được kiểm chứng theo quy tắc, số dư UI khớp DB |
| ☐ | C04 | P2 | CN11 đã có quản trị và áp voucher online; chưa đủ phần nhận/lưu voucher hoặc POS nếu thuộc phạm vi | Chốt phần cam kết còn thiếu và hoàn thiện cả API/UI | Vinh nghiệp vụ, Kiên UI | Mã hợp lệ áp đúng; hết hạn/sai điều kiện bị từ chối; kiểm thử online/POS nếu đã cam kết |
| ☐ | C05 | P2 | Thông báo có API, main còn giao diện giữ chỗ; nhánh Kiên có bổ sung | Tích hợp danh sách, số chưa đọc và thao tác đọc theo phạm vi | Kiên | Phát sinh sự kiện → đúng người nhận thấy thông báo; không đọc chéo; badge cập nhật |
| ☐ | C06 | P1 | Cần kiểm chứng: đánh giá có kiểm tra trước INSERT nhưng chưa chứng minh chống trùng khi đồng thời | Kiểm tra ràng buộc DB và điều kiện đơn đủ tiêu chuẩn; sửa nếu ca đồng thời không đạt | Kiên; Vinh hỗ trợ ràng buộc | Hai yêu cầu đồng thời không tạo đánh giá trùng; người chưa đủ điều kiện bị chặn |
| ☐ | C07 | P1 | Cần kiểm chứng: đọc metadata ảnh chưa đủ chứng minh kiểm tra toàn bộ nội dung | Kiểm thử ảnh giả, hỏng/cắt cụt, sai định dạng, quá kích thước; khắc phục nếu lọt | Kiên | File sai bị từ chối an toàn; file hợp lệ vẫn dùng được; lưu request/response |
| ☐ | C08 | P2 | Cần kiểm chứng: mã vạch có camera nhưng chưa thử phần cứng; lịch hiện có dạng ngày/tháng | Thử quét trên thiết bị thật; đối chiếu lịch với đặc tả. Chỉ thêm nhiều khung giờ nếu đã cam kết | Kiên kiểm thử, Vinh hỗ trợ nếu lỗi nghiệp vụ | Có kết quả thiết bị/quyền camera; lịch không trùng/sai quy tắc đã chốt; ghi rõ giới hạn |

## C. Kiểm tra đóng checklist

- [ ] Vinh và Kiên cập nhật từng mục với commit sửa, cách chạy lại, kết quả và link bằng chứng; không chỉ ghi “đã sửa”.
- [ ] Kiên chạy hồi quy các luồng ba vai trò, bộ 25 ca và BM1–BM12 trên phiên bản tích hợp cuối; phân biệt ca PASS, FAIL và chưa chạy.
- [ ] Vinh xác nhận migration, schema/seed, backup–restore và dựng sạch không bị ảnh hưởng.
- [ ] Linh kiểm tra kết quả cuối, ưu tiên L01–L11, C01, C06–C07; chỉ xác nhận đóng mục khi đủ bằng chứng.

Mẫu ghi cho mỗi mục:

| Mã | Commit sửa | Môi trường / ngày chạy | Kết quả thực tế | Link bằng chứng | Người kiểm tra |
| --- | --- | --- | --- | --- | --- |
| … | … | … | Chưa chạy / Đạt / Chưa đạt | … | … |

**Tổng: 21 mục theo dõi, không phải 21 lỗi đã được tái hiện.** Gồm 13 mục kỹ thuật/tích hợp và 8 mục hoàn thiện/kiểm chứng. Các phần thanh toán được tách thành nhiều mục để nghiệm thu riêng, không phải nhiều chức năng mới.
