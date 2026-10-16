# Mục 5.4 — Đo hiệu năng và tối ưu backend (Vinh V2/V3)

> Chỉ điền các số `TODO` sau khi chạy benchmark thực tế. Không dùng số mẫu.

## 5.4.1. Môi trường

- Branch: `Vinh/v2-v3/buoi9`
- Commit xuất phát: `TODO`
- Commit sau tối ưu: `TODO`
- Node: `TODO`
- MySQL: `TODO`
- Database benchmark: `mini_supermarket_buoi9_vinh`
- Dữ liệu: 5.000 products; 5.000 orders; 10.000 order_items; 5.000 payments; 5.000 audit_logs
- Warm-up: 5 request/API
- Sample: 50 request/API
- Concurrency: 1
- Network: localhost
- Median 50 mẫu: `(sorted[24] + sorted[25]) / 2`

## 5.4.2. API được đo

| API | Vai trò | Query |
|---|---|---|
| GET /products | admin | category + price + in_stock + sort + pagination |
| GET /orders | admin | status=completed + pagination |
| GET /reports/revenue | admin | from/to |
| GET /reports/products | admin | from/to |
| GET /audit-logs | admin | action=LOGIN_SUCCESS + pagination |

## 5.4.3. Tối ưu

### Truy vấn report doanh thu/nhân viên

Before sử dụng derived table `payments ... GROUP BY order_id` nhưng không dùng cột `paid_amount`. Sau tối ưu dùng `EXISTS` để kiểm tra có payment `paid`.

### Chỉ mục

Migration:

```text
database/20_buoi9_vinh_indexes.sql
```

- `payments(status, order_id, amount)`
- `order_items(order_id, product_id, quantity, price)`
- `orders(status, created_at, order_id)`

Không tạo lại các index đã có từ Buổi 7.

### Cache

API cache: `GET /reports/products`

- TTL: 30 giây.
- Key: role + userId + report + from + to.
- Invalidate sau khi đơn được thanh toán thành công hoặc POS sale thành công.
- Không chia sẻ cache giữa user/vai trò.

## 5.4.4. N+1

Năm API benchmark không phát hiện vòng lặp repository theo từng dòng. Số truy vấn logic trong mỗi API được ghi ở README và giữ nguyên hợp đồng API.

## 5.4.5. Kết quả

| API | Median trước (ms) | Median sau (ms) | Thay đổi (%) |
|---|---:|---:|---:|
| products | TODO | TODO | TODO |
| orders | TODO | TODO | TODO |
| reports-revenue | TODO | TODO | TODO |
| reports-products | TODO | TODO | TODO |
| audit-logs | TODO | TODO | TODO |

## 5.4.6. Kiểm thử hồi quy

- [ ] `npm run check`
- [ ] Phân quyền admin/employee/customer không thay đổi.
- [ ] Báo cáo vẫn trả đúng dữ liệu cùng fixture.
- [ ] `/reports/products` warm-up có MISS rồi HIT.
- [ ] Sau thao tác thanh toán/POS, request kế tiếp không trả kết quả cache cũ.
