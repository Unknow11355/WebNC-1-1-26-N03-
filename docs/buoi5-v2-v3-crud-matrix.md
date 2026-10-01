# Ma trận API V2/V3 — Buổi 5

Base URL: `/api/v1`

| API | Method | Role | Mục đích |
| --- | --- | --- | --- |
| `/auth/register` | POST | public | đăng ký customer |
| `/auth/login` | POST | public | đăng nhập thật |
| `/auth/logout` | POST | auth | revoke session |
| `/auth/me` | GET | auth | tài khoản hiện tại |
| `/users` | GET | admin | danh sách tài khoản |
| `/users/:userId` | GET/PATCH/DELETE | admin | CRUD tài khoản |
| `/users` | POST | admin | tạo tài khoản |
| `/categories` | GET | public | danh sách danh mục |
| `/categories` | POST | admin | tạo danh mục |
| `/categories/:categoryId` | GET | public | chi tiết danh mục |
| `/categories/:categoryId` | PATCH/DELETE | admin | sửa/xóa danh mục |
| `/products` | GET/POST | public/admin | đọc/tạo sản phẩm |
| `/products/:productId` | GET/PATCH/DELETE | public/admin | chi tiết/sửa/xóa mềm |
| `/inventory/items` | GET/POST | employee/admin, admin ghi | CRUD mặt hàng kho |
| `/inventory/items/:inventoryItemId` | GET/PATCH/DELETE | employee/admin, admin ghi | quản lý item |
| `/inventory/logs` | GET | employee/admin | xem lịch sử |
| `/inventory/imports` | POST | employee/admin | nhập kho + log |
| `/inventory/exports` | POST | employee/admin | kho → kệ + log |
| `/inventory/adjustments` | POST | employee/admin | điều chỉnh + log |
| `/carts` | GET/POST | customer | giỏ của chính mình |
| `/carts/:cartId/items` | POST | customer owner | thêm vào giỏ |
| `/carts/:cartId/items/:cartItemId` | PATCH/DELETE | customer owner | sửa/xóa dòng |
| `/orders/checkout` | POST | customer | tạo đơn trong transaction |
| `/orders/mine` | GET | customer | đơn của mình |
| `/orders` | GET | employee/admin | xử lý danh sách đơn |
| `/orders/:orderId` | GET | owner/employee/admin | chi tiết |
| `/orders/:orderId/confirm` | POST | employee/admin | confirm |
| `/orders/:orderId/reject` | POST | employee/admin | reject + restore |
| `/orders/:orderId/receive` | POST | customer owner | nhận delivery |
| `/orders/:orderId/pay-cash` | POST | employee/admin | xác nhận tiền mặt |
| `/vouchers` | GET/POST | admin | CRUD voucher |
| `/vouchers/:voucherId` | GET/PATCH/DELETE | admin | chi tiết/sửa/xóa mềm |
| `/vouchers/validate` | POST | customer | kiểm tra voucher theo order amount |
