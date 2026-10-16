# Checklist Buổi 10 — hoàn thiện và bàn giao

## 1. Căn cứ và phân công

Căn cứ: Sổ tay thực hành 10 buổi, Buổi 10 (trang 51–54); Hướng dẫn kỹ thuật mục 8.4–8.6 (trang 44–46); Thông báo yêu cầu đồ án, Phụ lục 08 (trang 26). Các mục sửa chức năng bên dưới là việc tồn của dự án, không phải yêu cầu mới do thầy bổ sung ở Buổi 10.

| Người | Vai trò | Sản phẩm chịu trách nhiệm |
| --- | --- | --- |
| Linh | V1 — nhóm trưởng, kiến trúc | Rà soát bản bàn giao cuối, biên tập nội dung tổng thể, thống nhất thuật ngữ, đối chiếu yêu cầu/CLO, kết luận nghiệm thu và ký bảng kiểm thực tế |
| Vinh | V2 + V3 — dữ liệu và nghiệp vụ | Chốt backend/dữ liệu, backup–restore, từ điển dữ liệu, hướng dẫn dựng sạch, mục 3.6 và Chương 4 |
| Kiên | V4 + V5 — kiểm thử, triển khai, tài liệu | Tích hợp bản thử nghiệm, giao diện, kiểm thử, Chương 5–6, ghép báo cáo, video, gói nộp và nộp bài sau nghiệm thu |

- Hai bạn tự bắt đầu, phối hợp trực tiếp; không phải chờ Linh duyệt kế hoạch. Linh kiểm tra sản phẩm cuối, không nhận thay toàn bộ phần triển khai của hai bạn.
- Tạo nhánh từ `main` mới nhất: `Vinh/v2-v3/buoi10`, `Kien/v4-v5/buoi10`. Dùng commit có nghĩa, ví dụ `hoanthienbackupbuoi10`, `kiemthuvadonggoibuoi10`.
- Mở PR về main kèm bằng chứng. Không tự gộp main, force-push hay ghi đè phần người khác. Kiên có thể tích hợp nhánh Vinh trên nhánh thử nghiệm riêng.
- Chỉ tick khi đã kiểm tra thực tế. Chưa chạy ghi **Chưa kiểm chứng**; bị lỗi ghi **Chưa đạt/Blocked** và lý do. Không lấy tổng số unit test thay cho bộ 25 ca nghiệm thu.
- Ghi commit phiên bản bàn giao trong mọi kết quả. Các sửa Buổi 9 và báo cáo Word đang local trên máy Linh không mặc nhiên đã có trên Git; xác nhận bản đã được đưa vào nhánh trước khi sử dụng.

## 2. Thứ tự thực hiện

1. Vinh và Kiên xử lý các việc tồn ảnh hưởng nghiệm thu, cập nhật danh sách lỗi.
2. Vinh bàn giao backend/schema/seed/hướng dẫn; Kiên tích hợp và triển khai bản thử nghiệm cùng phiên bản.
3. Kiên chạy hồi quy và kiểm tra online; Vinh backup–restore và tổ chức dựng sạch. Sửa lỗi rồi chạy lại phần bị ảnh hưởng.
4. Hai bạn hoàn thiện nội dung; Kiên ghép DOCX/PDF, quay video, đóng gói và gửi đủ bằng chứng cho Linh.
5. Linh kiểm tra cuối. Nếu chưa đạt, trả danh sách cụ thể; người phụ trách sửa và gửi lại. Chỉ ký/nộp bản đúng thực tế.

Việc sửa tính năng tồn phải làm trước phiên bàn giao, không dồn vào 3 giờ Buổi 10. Khung trên lớp của thầy: 0:00–0:20 kiểm tra hiệu năng/25 ca; 0:20–1:20 hoàn thiện báo cáo; 1:20–2:10 video và backup; 2:10–3:00 đóng gói, dựng sạch, ký và nộp. Theo sổ tay, nộp trước cuối buổi; tối đa 24 giờ nếu có lý do chính đáng.

## 3. Vinh — checklist V2 + V3

### A. Chốt nghiệp vụ và dữ liệu trước bàn giao

- [ ] Đối chiếu các migration trên main với môi trường triển khai, đặc biệt migration CN10 điểm thưởng và chỉ mục Buổi 9; bổ sung đường chạy còn thiếu trong hướng dẫn/setup. Không reset database đang dùng.
- [ ] Kiểm tra API báo cáo doanh thu, sản phẩm, nhân viên có dữ liệu thật; cung cấp URL, tham số, quyền và ví dụ response cho Kiên nối giao diện. Báo cáo nhân viên phải thể hiện đúng phạm vi đã cam kết, không chỉ có số tổng hợp nếu yêu cầu cần chi tiết.
- [ ] Chốt luồng điểm thưởng/voucher hiện có và các phần còn thiếu so với đặc tả: sử dụng online/POS, điều kiện áp dụng và hoàn/trừ điểm. Phân biệt phần chưa triển khai với phần ngoài phạm vi; không tự giảm phạm vi đã chốt.
- [ ] Phối hợp Kiên xử lý thanh toán qua nghiệp vụ dùng chung: giao dịch nguyên tử, chống xử lý lặp, trạng thái hợp lệ, `paid_at`, đồng bộ tồn/điểm/cache theo đặc tả. Không để callback chỉ cập nhật một vài cột rồi bỏ qua nghiệp vụ.
- [ ] Chạy kiểm thử nghiệp vụ bị ảnh hưởng; ghi lỗi còn tồn, mức ảnh hưởng và cách tái hiện. Kiên phụ trách xác nhận hồi quy độc lập.

### B. Backup, restore và dựng sạch

- [ ] Chuẩn bị `schema.sql`, `seed.sql`, thứ tự migration, dữ liệu mẫu đủ trình diễn và từ điển dữ liệu khớp schema thực tế.
- [ ] Kết xuất đầy đủ database từ **môi trường online**; ghi thời gian, phiên bản DB, commit ứng dụng và checksum tệp. Chỉ dùng dữ liệu thử nghiệm, không công khai dữ liệu cá nhân/bí mật.
- [ ] Khôi phục vào **database rỗng riêng**. Không ghi đè database đang hoạt động. Lưu lệnh đã che thông tin nhạy cảm, exit code, số bảng và số dòng trước/sau, kiểm tra khóa ngoại và truy vấn nghiệp vụ đại diện.
- [ ] Chụp **Ảnh 33** minh chứng backup/restore; ảnh phải cho thấy kết quả, không chỉ là câu lệnh chưa chạy.
- [ ] Viết README từ máy sạch: phiên bản Node/DB, cài dependency từ lockfile, cấu hình `.env.example`, tạo DB/migration/seed, chạy backend/frontend, URL và cách kiểm tra. Phân biệt cách chạy local và Codespaces nếu hỗ trợ cả hai.
- [ ] Tổ chức phép thử từ **tệp ZIP cuối**: một thành viên chưa từng dựng hệ thống chỉ đọc README, dựng trên môi trường sạch trong **30 phút**. Ghi người chạy, môi trường, giờ bắt đầu/kết thúc, lỗi và kết quả. Nếu cả nhóm đã từng dựng, hỏi thầy cách thay thế, không tự nhận là thỏa điều kiện.
- [ ] Kiểm tra đăng nhập đủ ba vai trò sau restore và dựng sạch; thực hiện một luồng nghiệp vụ trọn vẹn. Nếu sửa gói/README sau thất bại, thử lại và ghi phiên bản mới.

### C. Nội dung và bàn giao

- [ ] Hoàn thiện mục **3.6 và Chương 4** theo đề cương chính thức; trình bày thuật toán đặc thù, đồng thời/giao dịch, triển khai và khó khăn thực tế, không dán nguyên mã nguồn dài.
- [ ] Bàn giao từ điển dữ liệu, schema/seed/dump, README, biên bản restore, biên bản dựng sạch và Ảnh 33 cho Kiên ghép gói.
- [ ] Cập nhật chỉ số V2: số bảng đủ ràng buộc/chỉ mục, trung vị truy vấn nóng; V3: số API chạy được, số quy tắc nghiệp vụ đã kiểm chứng. Mỗi số có nguồn/bằng chứng.

## 4. Kiên — checklist V4 + V5

### A. Tích hợp và khép các lỗi còn tồn

Các điểm này từ rà soát ngày 16/10/2026 trên main `bf37e0c` và nhánh Kiên `11622d8`; phải kiểm tra lại ở phiên bản mới, không mặc định vẫn lỗi hoặc đã sửa.

- [ ] Đưa các thay đổi frontend/CN12/CN13 từ nhánh cũ vào nhánh tích hợp có main mới nhất; giữ các thay đổi dữ liệu/điểm thưởng của Vinh, xử lý xung đột có kiểm chứng.
- [ ] Sửa chỗ payment/review dùng `req.user` không khớp middleware đang cung cấp `req.auth`; kiểm thử đúng tài khoản và gọi chéo đối tượng.
- [ ] Hoàn thiện thanh toán sandbox cùng Vinh: không dùng khóa bí mật hardcode; lưu/đối chiếu mã giao dịch, số tiền, chữ ký và trạng thái; không coi browser redirect là bằng chứng thanh toán; thử callback lặp/đồng thời và đơn không còn hợp lệ. Không tự chuyển trạng thái đơn thành hoàn tất sai quy trình.
- [ ] Kiểm thử đánh giá chỉ với giao dịch đủ điều kiện và chống đánh giá trùng, kể cả gửi đồng thời.
- [ ] Bỏ dữ liệu mock trên trang báo cáo, nối API thật cho doanh thu/sản phẩm/nhân viên và xuất dữ liệu tương ứng; phối hợp Vinh nếu thiếu API.
- [ ] Kiểm tra route trang báo cáo/upload/audit truy cập được; API nhật ký dùng đúng `/audit-logs`; hoàn thiện thông báo và giao diện điểm/voucher theo phạm vi cam kết.
- [ ] Hoàn thiện upload: URL ảnh truy cập được an toàn, gắn được vào sản phẩm và kiểm tra loại/kích thước/nội dung file; không chỉ hiện alert URL.
- [ ] Kiểm tra luồng quên mật khẩu có kênh nhận mã/link thử nghiệm hợp lệ; không bật lộ token công khai trên production. Kiểm tra giới hạn đăng nhập sai, không nhầm với giới hạn quên mật khẩu.
- [ ] Kiểm tra sitemap/robots, CSP và trang công khai sau triển khai; không nới CSP chỉ để che lỗi giao diện.

### B. Kiểm thử và hoàn thiện báo cáo

- [ ] Chạy bộ **ít nhất 25 ca** trên bản tích hợp cuối, tham chiếu phân bố Buổi 9: 9 nghiệp vụ + 6 ngoại lệ/biên + 7 bảo mật/phân quyền + 3 báo cáo/xuất dữ liệu. Lưu **XLSX** gồm bước, dữ liệu, mong đợi, thực tế, kết luận và bằng chứng.
- [ ] Chạy lại lint/unit/integration và các luồng giao diện ba vai trò; kiểm tra online, không chỉ localhost. Tách rõ kết quả tự động với ca thao tác tay.
- [ ] Hoàn thiện bảng **BM1–BM12**: rủi ro, biện pháp, vị trí code, ca kiểm thử và bằng chứng. Không coi một ca SQL injection thành bằng chứng cho toàn bộ bảo mật.
- [ ] Ghép số liệu hiệu năng Buổi 9, khả năng truy cập/SEO và các lỗi còn tồn; không thay bằng số minh họa hoặc kết quả khác commit mà không ghi rõ.
- [ ] Hoàn thiện **Chương 5, Chương 6 và phụ lục kiểm thử**, ghép phần Vinh và hồ sơ các buổi trước thành báo cáo **30–80 trang** theo đề cương.
- [ ] Lập ma trận **4 CLO** theo mục 6.5 của tài liệu: dẫn chính xác số mục/hình/bảng chứng minh; đối chiếu bảng yêu cầu với chức năng thực tế.
- [ ] Dùng Heading, Caption, mục lục và danh mục hình/bảng tự động; thống nhất giãn dòng, khoảng cách đoạn, lề và bảng. Cập nhật toàn bộ fields trước xuất PDF; kiểm tra link mục lục/bookmark đúng trang.
- [ ] Gửi Linh bản DOCX và PDF đầy đủ để rà soát nội dung cuối, kèm danh sách những điểm chưa đạt, không chỉ gửi chương rời.

### C. Demo, đóng gói và nộp

- [ ] Quay video **8–15 phút**, tối thiểu **1280×720**, có thuyết minh trên **hệ thống online**. Nếu phần nào bắt buộc chạy local, giải thích lý do trong video.
- [ ] Kịch bản tham khảo 13 phút theo mục 8.5: 0:00–0:45 giới thiệu/đóng góp; 0:45–1:30 URL và HTTPS; 1:30–2:30 kiến trúc/ERD; 2:30–8:00 các vai trò và luồng trọn vẹn; 8:00–9:30 thuật toán/đồng thời; 9:30–11:00 bảo mật; 11:00–12:00 hiệu năng/khả năng truy cập; 12:00–13:00 báo cáo/xuất dữ liệu và hạn chế.
- [ ] Đối chiếu đủ **Ảnh 03, 04, 14, 33** với đúng chú thích trong danh mục ảnh của thầy. Vinh cung cấp 33; Kiên tập hợp/kiểm tra 03, 04, 14. Không tự đổi số ảnh để lấp bằng chứng thiếu.
- [ ] Đóng gói theo bảng Phụ lục 08 bên dưới; dùng mã lớp/nhóm/đề tài thực tế, không dùng nguyên tên ví dụ `L01_Nhom03_DT05` nếu không đúng hồ sơ nhóm.
- [ ] Gói không chứa `node_modules`, `vendor`, `target`, `.git`, `.env` thật, token hoặc khóa riêng. Chuẩn bị gói bằng bản sao/staging riêng, không xóa thư mục làm việc của nhóm. Giữ lockfile và `.env.example`.
- [ ] Giải nén gói ra nơi khác, kiểm đủ tệp; phối hợp phép thử dựng sạch của Vinh. Nếu thay đổi code sau quay video/kiểm thử, đánh giá và chạy/quay lại phần bị ảnh hưởng.
- [ ] Kiểm tra tất cả tài khoản demo trên online và thời hạn hoạt động của hosting; duy trì hệ thống để thầy kiểm tra, không tắt ngay sau nộp.
- [ ] Sau Linh nghiệm thu và các thành viên ký thật: nộp Canvas, lưu xác nhận nộp và đường dẫn bản cuối. Không coi push Git là đã nộp Canvas.
- [ ] Cập nhật chỉ số V4: số BM có bằng chứng, số ca chạy/tỷ lệ đạt; V5: số lần triển khai thành công, số trang báo cáo hoàn thành.

## 5. Linh — kiểm tra sản phẩm cuối (V1)

- [ ] Nhận link PR/commit, URL online, tài khoản demo, gói ZIP, DOCX/PDF, video, bảng kiểm thử và biên bản dựng sạch/restore từ hai bạn.
- [ ] Đối chiếu phạm vi và các yêu cầu còn thiếu trong lần rà soát; kiểm tra trực tiếp ba vai trò và những lỗi quan trọng đã báo, không chỉ xem ảnh PASS.
- [ ] Đọc/biên tập bản báo cáo tổng thể, thống nhất thuật ngữ và kết luận; kiểm tra 30–80 trang, 4 CLO dẫn chiếu cụ thể, mục lục điều hướng và số liệu có bằng chứng.
- [ ] Xem video đủ thời lượng, có tiếng, online đúng bản bàn giao; kiểm tra kết quả restore và dựng sạch ≤30 phút.
- [ ] Đối chiếu 19 thành phần Phụ lục 08 (17 bắt buộc, 2 khuyến nghị). Xác nhận đúng bản code được duyệt trước khi gộp main; không gộp khi còn lỗi nghiêm trọng chưa xử lý.
- [ ] Ghi kết luận **Đạt/Chưa đạt**, các mục cần sửa và người xử lý. Không ký thay thành viên; ký phần của mình sau khi kiểm tra thực tế.
- [ ] Cập nhật chỉ số V1: số PR/yêu cầu đã rà soát và tỷ lệ hạng mục kế hoạch hoàn thành, kèm cách đếm.

## 6. Danh mục gói nộp — Phụ lục 08

| STT | Thành phần / định dạng | Chủ trì | Thư mục gói | Trạng thái |
| --- | --- | --- | --- | --- |
| 01 | Báo cáo Word `.docx` | Kiên ghép, Linh rà | `01_BAOCAO/` | Chưa kiểm tra |
| 02 | Báo cáo PDF có mục lục điều hướng | Kiên | `01_BAOCAO/` | Chưa kiểm tra |
| 03 | Bảng điều kiện hoàn thành đã ký, PDF (PL04) | Linh kiểm tra, thành viên ký | `00_HOSO/` | Chưa kiểm tra |
| 04 | Phân công và tự đánh giá, PDF/XLSX (PL11) | Cả nhóm, Kiên tập hợp | `00_HOSO/` | Chưa kiểm tra |
| 05 | Khai báo phạm vi sử dụng AI, PDF | Cả nhóm khai thật, Kiên tập hợp | `00_HOSO/` | Chưa kiểm tra |
| 06 | Toàn bộ mã nguồn | Vinh + Kiên | `02_MANGUON/` | Chưa kiểm tra |
| 07 | `schema.sql` | Vinh | `03_CSDL/` | Chưa kiểm tra |
| 08 | `seed.sql` | Vinh | `03_CSDL/` | Chưa kiểm tra |
| 09 | Dump đầy đủ từ database online, SQL | Vinh | `03_CSDL/` | Chưa kiểm tra |
| 10 | `.env.example` | Vinh + Kiên | `02_MANGUON/` | Chưa kiểm tra |
| 11 | README cài đặt/chạy | Vinh | `02_MANGUON/` | Chưa kiểm tra |
| 12 | OpenAPI JSON/YAML khớp code | Vinh, Kiên kiểm tra | `04_TAILIEU/` | Chưa kiểm tra |
| 13 | Hướng dẫn sử dụng theo vai trò, PDF | Kiên | `04_TAILIEU/` | Chưa kiểm tra |
| 14 | Tài khoản kiểm thử, PDF/XLSX | Kiên | `04_TAILIEU/` | Chưa kiểm tra |
| 15 | Bộ ca và kết quả kiểm thử, XLSX | Kiên | `05_KIEMTHU/` | Chưa kiểm tra |
| 16 | Video 8–15 phút, MP4 hoặc liên kết | Kiên | `06_DEMO/` | Chưa kiểm tra |
| 17 | URL online và repository, TXT | Kiên | `00_HOSO/` | Chưa kiểm tra |
| 18 | `docker-compose.yml` — khuyến nghị | Vinh + Kiên nếu có | `02_MANGUON/` | Chưa kiểm tra |
| 19 | Hình vẽ thiết kế định dạng gốc — khuyến nghị | Kiên tập hợp | `07_THIETKE/` | Chưa kiểm tra |

Tài khoản demo chỉ dùng dữ liệu thử và quyền phù hợp; bảng tài khoản bàn giao cho thầy qua kênh nộp, không công khai mật khẩu quản trị online trên Git. Bản dump và hồ sơ có thông tin nhạy cảm cũng không mặc định đưa vào repository công khai.

## 7. Quy cách bàn giao nội bộ

- Vinh đặt tài liệu không nhạy cảm tại `docs/buoi10/vinh/`: README, biên bản backup/restore, dựng sạch, từ điển dữ liệu, nội dung chương và minh chứng.
- Kiên đặt tại `docs/buoi10/kien/`: danh mục kiểm thử, liên kết bằng chứng, kịch bản video, bảng đối chiếu 19 thành phần và danh sách lỗi cuối. Các tệp lớn/bí mật gửi theo kênh bàn giao riêng, ghi vị trí và quyền truy cập trong thông báo cho Linh.
- Mỗi PR ghi: phần đã làm; commit được kiểm thử; lệnh/môi trường; kết quả thật; lỗi còn tồn; link/tệp sản phẩm; người thực hiện. Không tick hộ người khác.
- Phiếu kết luận cuối ghi: phiên bản bàn giao, ngày kiểm tra, người kiểm tra, Đạt/Chưa đạt, danh sách tồn và chữ ký thực tế.
