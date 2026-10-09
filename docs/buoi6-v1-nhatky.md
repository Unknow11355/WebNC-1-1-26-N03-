# Nhật ký rà soát V1 Buổi 6

Ngày lập 02/10/2026. Người phụ trách: Linh. Nhánh `Linh/v1/buoi6`. Chỉ tài liệu V1 và phân công; chưa code thay Vinh hoặc chạy test Buổi 6 thay Kiên.

## Công việc đã thực hiện

| Mã | Nội dung rà soát | Kết quả và bàn giao |
| --- | --- | --- |
| V1-01 | Yêu cầu sổ tay trang 35–38 | Ghi vào checklist: 3 luồng, thuật toán, DB constraints, 50 request/Ảnh 31, mục 3.6 và online |
| V1-02 | Nền tích hợp Buổi 5 | Tạo nhánh từ bản Linhcheckvasualai; không thay main hoặc ghi đè nhánh Vinh |
| V1-03 | Source bán tại quầy | Đã đọc POST / trong order.routes.js nguồn; giữ offline và phân biệt tồn kho/kệ |
| V1-04 | Rủi ro dữ liệu | Ghi lý do sửa: client giá/danh tính; sản phẩm trùng dòng; yêu cầu lặp; thiếu CHECK |
| V1-05 | Thiết kế trước code | Đã soạn hợp đồng, mã giả transaction và replay; chờ xác nhận khung T1–T6 |
| V1-06 | Phân công và nghiệm thu | Checklist riêng Vinh V2/V3, Kiên V4/V5; 14 kịch bản dự kiến chưa chạy |

## Quyết định cần nhóm xác nhận

- [ ] Khung thuật toán: ghi mã T, tên khung và vị trí trong tài liệu định hướng. Hiện chưa xác minh, không tự suy đoán.
- [ ] Chấp thuận luồng thứ ba POS cash và phạm vi tối thiểu; ghi kế hoạch voucher/điểm/ca theo hồ sơ Buổi 2.
- [ ] Chốt API/HTTP codes/idempotency và thứ tự khóa liên luồng; cập nhật OpenAPI.
- [ ] Xác nhận nơi triển khai và dữ liệu test online, mốc bàn giao thực tế.

## Nhật ký review code tiếp theo

| Ngày | PR/commit có tên | Hạng mục | Phát hiện | Người xử lý | Kiểm tra lại |
| --- | --- | --- | --- | --- | --- |
| Chưa có | Chờ Vinh bàn giao | Code so với mã giả | Chưa rà | Vinh/Linh | Chưa thực hiện |
| Chưa có | Chờ Kiên bàn giao | Bảng 50 request và online | Chưa rà | Kiên/Linh | Chưa thực hiện |

Không tạo nhận xét “đạt” cho PR chưa có hoặc test chưa chạy.

## Chỉ số V1

- Số yêu cầu hợp nhất (PR) đã rà soát trong Buổi 6: **0** tại lần lập tài liệu này. Sáu mục khảo sát phía trên không phải sáu PR.
- Kế hoạch V1 gồm 8 hạng mục: (1) khảo sát nền/source, (2) lập thiết kế/mã giả, (3) giao checklist, (4) xác nhận khung/phạm vi, (5) review migration, (6) review code so với mã giả, (7) chứng kiến/review kết quả test và online, (8) hoàn thiện hồ sơ/chỉ số nghiệm thu.
- Hoàn thành chuẩn bị (1)–(3): **3/8 = 37,5% kế hoạch V1**, không phải tỷ lệ hoàn thành toàn Buổi 6. Thiết kế ở (2) là bản đề xuất; phê duyệt cuối thuộc (4).
- Cập nhật chỉ số khi có bằng chứng mới; mỗi thành viên có lịch sử đóng góp riêng.

Liên kết: [Checklist và phân công](checklistbuoi6.md) · [Thiết kế và mã giả](buoi6-v1-thietke-magia.md).
