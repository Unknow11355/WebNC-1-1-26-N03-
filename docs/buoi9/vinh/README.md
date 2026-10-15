# Buổi 9 — Vinh V2/V3: dữ liệu, đo hiệu năng, tối ưu backend

## Phạm vi đã làm

1. Benchmark DB riêng `mini_supermarket_buoi9_vinh`, không reset DB nhóm.
2. Sinh tối thiểu 5.000 products + dữ liệu quan hệ hợp lệ: 5.000 orders, order_items, payments và audit_logs.
3. Đo đúng 5 API nghiệp vụ, 50 mẫu/API trước và 50 mẫu/API sau.
4. Tối ưu truy vấn report bằng `EXISTS` thay cho derived-table aggregate không dùng cột tổng payment.
5. Thêm các index phục vụ đúng truy vấn đã đo; không tự tạo index trùng các index Buổi 7.
6. Cache nóng cho API nặng nhất `/reports/products`, TTL 30s mặc định, key tách theo role + user + khoảng ngày.
7. Invalidate cache khi order thanh toán thành công hoặc POS tạo sale thành công.
8. Có unit test kiểm tra cache hit/miss, cô lập giữa user và invalidate.
9. Script tự tạo JSON/CSV raw measurements và bảng `hieu-nang.md` sau khi có đủ before/after.

## Tạo branch

Sau khi `main` đã có PR CN10:

```powershell
git switch main
git pull --ff-only origin main
git switch -c Vinh/v2-v3/buoi9
```

Ghi commit xuất phát bằng:

```powershell
git rev-parse HEAD
node --version
mysql --version
```

## Áp dụng code Buổi 9

Patch trong file:

```text
docs/buoi9/vinh/buoi9_vinh.patch
```

Chạy từ root repo:

```powershell
git apply docs/buoi9/vinh/buoi9_vinh.patch
```

Sau đó:

```powershell
cd backend
npm install
npm test
```

## 1) Tạo DB benchmark riêng

Không chạy trên `mini_supermarket` mặc định nếu chưa chủ động chọn rõ target.

```powershell
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3307"
$env:DB_USER="root"
$env:DB_PASSWORD="mat_khau_local"
$env:DB_NAME="mini_supermarket"

npm run buoi9:seed
```

Script mặc định tạo:

```text
mini_supermarket_buoi9_vinh
```

và sinh:
- 5.000 products
- 5.000 orders đã paid
- 10.000 order_items
- 5.000 payments
- 5.000 audit_logs

Không tự động xóa dữ liệu. Muốn dựng lại fixture:

```powershell
node scripts/buoi9/generate-buoi9-data.mjs --cleanup
node scripts/buoi9/generate-buoi9-data.mjs --apply
```

`--cleanup` chỉ xóa các record có marker `B9-PERF-...`, `B9_PERF_...`; không reset DB.

## 2) Chạy backend trên DB benchmark

Mở terminal 1:

```powershell
cd backend
$env:DB_NAME="mini_supermarket_buoi9_vinh"
$env:B9_REPORT_CACHE="0"
npm run start
```

Kiểm tra health:

```text
GET http://localhost:3000/api/v1/health
```

## 3) Đo BEFORE

Mở terminal 2. Không ghi mật khẩu/token vào file Git:

```powershell
cd backend
$env:B9_BASE_URL="http://localhost:3000/api/v1"
$env:B9_DB_NAME="mini_supermarket_buoi9_vinh"
$env:B9_ADMIN_EMAIL="admin@mini.local"
$env:B9_ADMIN_PASSWORD="Admin@123"

npm run buoi9:measure -- --phase=before
```

Kết quả:

```text
docs/buoi9/vinh/data/measure-before.json
docs/buoi9/vinh/data/measure-before.csv
```

Đã dùng 5 API:

```text
GET /products
GET /orders
GET /reports/revenue
GET /reports/products
GET /audit-logs
```

Điều kiện:
- 50 mẫu/API.
- warm-up 5 request/API.
- tuần tự, concurrency = 1.
- localhost.
- cùng fixture/query giữa before và after.
- request lỗi không được tính là mẫu thành công.

## 4) Ảnh 27 — EXPLAIN BEFORE

Mở:

```text
database/21_buoi9_vinh_explain.sql
```

Chạy phần EXPLAIN trước khi chạy migration index, lưu output thật vào:

```text
docs/buoi9/vinh/minh-chung/27-explain-before.txt
```

Chụp màn hình bảng EXPLAIN thành:

```text
docs/buoi9/vinh/minh-chung/27-explain-before.png
```

Không bịa `full scan`; ghi đúng `type`, `key`, `rows` mà MySQL trả về.

## 5) Migration index

Trên DB benchmark:

```powershell
mysql -h 127.0.0.1 -P 3307 -u root -p mini_supermarket_buoi9_vinh < database/20_buoi9_vinh_indexes.sql
```

Các index thêm:

```text
payments(status, order_id, amount)
order_items(order_id, product_id, quantity, price)
orders(status, created_at, order_id)
```

Mục đích:
- R1/R3: EXISTS trên `payments.status + order_id`.
- R2: join report theo `order_id`.
- `/orders?status=completed`: lọc status + phân trang theo created_at/order_id.

## 6) Ảnh 28 — EXPLAIN AFTER

Chạy lại đúng các EXPLAIN của:

```text
database/21_buoi9_vinh_explain.sql
```

trên cùng fixture/query và lưu:

```text
docs/buoi9/vinh/minh-chung/28-explain-after.txt
docs/buoi9/vinh/minh-chung/28-explain-after.png
```

Báo cáo phải mô tả đúng key/rows/type thực tế.

## 7) Đo AFTER

Sau migration index, **giữ cache tắt** để so sánh BEFORE/AFTER công bằng:

```powershell
$env:DB_NAME="mini_supermarket_buoi9_vinh"
$env:B9_REPORT_CACHE="0"
npm run start
```

Terminal đo:

```powershell
$env:B9_BASE_URL="http://localhost:3000/api/v1"
$env:B9_DB_NAME="mini_supermarket_buoi9_vinh"
$env:B9_ADMIN_EMAIL="admin@mini.local"
$env:B9_ADMIN_PASSWORD="Admin@123"
npm run buoi9:measure -- --phase=after
```

Kết quả:

```text
docs/buoi9/vinh/data/measure-after.json
docs/buoi9/vinh/data/measure-after.csv
```

### Kiểm tra cache lạnh/nóng riêng

Dừng backend, bật cache:

```powershell
$env:B9_REPORT_CACHE="1"
$env:B9_REPORT_CACHE_TTL_MS="30000"
npm run start
```

Sau đó:

```powershell
npm run buoi9:measure -- --cache-check
```

Kết quả:

```text
docs/buoi9/vinh/data/cache-check.json
```

Request đầu tiên của `/reports/products` phải là `MISS`; các request sau trong cùng đợt phải là `HIT`. Cache test không được gộp vào 50 mẫu BEFORE/AFTER.

## 8) Bảng hiệu năng

Sau khi có cả before + after:

```powershell
npm run buoi9:report
```

Sinh:

```text
docs/buoi9/vinh/hieu-nang.md
```

Công thức:

```text
thay đổi % = (median_before - median_after) / median_before * 100
```

Median 50 mẫu:

```text
(sorted[24] + sorted[25]) / 2
```

## 9) N+1

Các API benchmark được rà theo repository hiện tại:
- `/products`: 1 SELECT danh sách + 1 COUNT.
- `/orders`: 1 SELECT danh sách + 1 COUNT.
- `/reports/revenue`: 2 SELECT tổng/series.
- `/reports/products`: 1 SELECT aggregate.
- `/audit-logs`: 1 SELECT danh sách + 1 COUNT.

Không có vòng lặp gọi repository theo từng row trong 5 API trên. Vì vậy hồ sơ phải ghi **“không phát hiện N+1 ở 5 API benchmark”**, thay vì bịa số truy vấn trước/sau.

## 10) Cache và invalidation

Cache chỉ áp dụng cho `/reports/products`.

Key gồm:

```text
role | userId | reportName | from | to
```

Như vậy không dùng chung kết quả giữa người dùng/vai trò khác nhau.

TTL mặc định:

```text
30 giây
```

Invalidate khi:
- `order.service.js` xác nhận thanh toán cash thành công.
- `pos.service.js` tạo sale cash thành công.

Nếu transaction rollback thì không gọi invalidate.

## 11) Hồ sơ mục 5.4

Dùng:

```text
docs/buoi9/vinh/muc-5-4.md
```

và sau khi đo xong điền số thật vào chỗ `TODO`.

## 12) Những bằng chứng không thể giả lập

Không được tự điền:
- median trước/sau
- `EXPLAIN.key`
- `EXPLAIN.rows`
- ảnh 27/28/29

Các phần này chỉ được đánh dấu hoàn thành sau khi chạy trên DB benchmark thực tế.

## 13) Lệnh kiểm cuối

```powershell
cd backend
npm run check
git diff --check
git status
```

Sau đó ghi commit trước/sau và mở PR:

```text
Vinh/v2-v3/buoi9 -> main
```
