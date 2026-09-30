INSERT IGNORE INTO roles(role_name)
VALUES
('customer'),
('employee'),
('admin');

INSERT IGNORE INTO users(full_name, email, phone, password, password_hash, address, role_id, status)
VALUES
('Admin', 'a@gmail.com', '0900000001', '$2b$10$kB30S.076z6zgyr1G8hmguFXQ4S0csQQNBRIo7BIpN2W8aXejiHaG', '$2b$10$kB30S.076z6zgyr1G8hmguFXQ4S0csQQNBRIo7BIpN2W8aXejiHaG', 'Tai khoan quan tri', (SELECT role_id FROM roles WHERE role_name = 'admin'), 'active'),
('Nhan vien', 'b@gmail.com', '0900000002', '$2b$10$kB30S.076z6zgyr1G8hmguFXQ4S0csQQNBRIo7BIpN2W8aXejiHaG', '$2b$10$kB30S.076z6zgyr1G8hmguFXQ4S0csQQNBRIo7BIpN2W8aXejiHaG', 'Tai khoan nhan vien', (SELECT role_id FROM roles WHERE role_name = 'employee'), 'active'),
('Khach hang', 'c@gmail.com', '0900000003', '$2b$10$kB30S.076z6zgyr1G8hmguFXQ4S0csQQNBRIo7BIpN2W8aXejiHaG', '$2b$10$kB30S.076z6zgyr1G8hmguFXQ4S0csQQNBRIo7BIpN2W8aXejiHaG', 'Tai khoan khach hang', (SELECT role_id FROM roles WHERE role_name = 'customer'), 'active');
INSERT IGNORE INTO categories(category_name)
VALUES
('Đồ uống'),
('Trái cây'),
('Gia vị xốt Dh Foods');

INSERT IGNORE INTO products (
  product_name,
  barcode,
  description,
  image_url,
  price,
  unit,
  stock,
  min_stock,
  category_id,
  status
)
VALUES
-- Nhóm 1: Trái cây
('Chuối', 'PROD001', 'Chuối tươi ngon', 'assets/images/chuoi.png', 25000, 'Kg', 100, 10, (SELECT category_id FROM categories WHERE category_name = 'Trái cây'), 'active'),
('Dâu tây', 'PROD002', 'Dâu tây Đà Lạt', 'assets/images/dautay.jpg', 120000, 'Hộp', 50, 5, (SELECT category_id FROM categories WHERE category_name = 'Trái cây'), 'active'),
('Táo', 'PROD003', 'Táo nhập khẩu', 'assets/images/tao.png', 60000, 'Kg', 80, 10, (SELECT category_id FROM categories WHERE category_name = 'Trái cây'), 'active'),
('Dứa (Thơm)', 'PROD004', 'Dứa mật ngọt', 'assets/images/dua.jpg', 15000, 'Quả', 40, 5, (SELECT category_id FROM categories WHERE category_name = 'Trái cây'), 'active'),
('Dưa hấu', 'PROD005', 'Dưa hấu Long An', 'assets/images/duahau.jpg', 20000, 'Kg', 150, 15, (SELECT category_id FROM categories WHERE category_name = 'Trái cây'), 'active'),
-- Nhóm 2: Gia vị xốt Dh Foods
('Xốt Thái sả tắc', 'PROD006', 'Xốt Dh Foods vị Thái', 'assets/images/xotthaixatac.jpg', 35000, 'Chai', 60, 5, (SELECT category_id FROM categories WHERE category_name = 'Gia vị xốt Dh Foods'), 'active'),
('Xốt BBQ', 'PROD007', 'Xốt ướp BBQ Dh Foods', 'assets/images/XotBBQ.png', 45000, 'Chai', 40, 5, (SELECT category_id FROM categories WHERE category_name = 'Gia vị xốt Dh Foods'), 'active'),
('Muối ớt chanh Nha Trang', 'PROD008', 'Muối chấm hải sản', 'assets/images/muoiotchanh.png', 18000, 'Chai', 100, 10, (SELECT category_id FROM categories WHERE category_name = 'Gia vị xốt Dh Foods'), 'active'),
('Xốt kim quất', 'PROD009', 'Xốt kim quất Dh Foods', 'assets/images/xotkimquat.jpg', 35000, 'Chai', 50, 5, (SELECT category_id FROM categories WHERE category_name = 'Gia vị xốt Dh Foods'), 'active'),
('Xốt trứng muối', 'PROD010', 'Xốt trứng muối béo ngậy', 'assets/images/sottrungmuoi.png', 55000, 'Chai', 30, 5, (SELECT category_id FROM categories WHERE category_name = 'Gia vị xốt Dh Foods'), 'active'),
-- Nhóm 3: Đồ uống
('Trà TH true TEA', 'PROD011', 'Trà xanh/Ô long TH', 'assets/images/trathtruetea.jpg', 10000, 'Chai', 200, 20, (SELECT category_id FROM categories WHERE category_name = 'Đồ uống'), 'active'),
('Trà đào và hạt chia Fuze Tea', 'PROD012', 'Trà đào hạt chia', 'assets/images/tradaohatchia.jpg', 12000, 'Chai', 120, 20, (SELECT category_id FROM categories WHERE category_name = 'Đồ uống'), 'active'),
('Trà xanh C2 hương chanh', 'PROD013', 'Trà xanh C2', 'assets/images/C2.jpg', 8000, 'Chai', 300, 50, (SELECT category_id FROM categories WHERE category_name = 'Đồ uống'), 'active'),
('Trà đá TRADA hương hoa nhài', 'PROD014', 'Trà đá lon TRADA', 'assets/images/trahoanhai.png', 10000, 'Lon', 100, 15, (SELECT category_id FROM categories WHERE category_name = 'Đồ uống'), 'active'),
('Trà xanh Lipton vị chanh mật ong', 'PROD015', 'Lipton chai tiện lợi', 'assets/images/trachanhmatong.jpg', 12000, 'Chai', 150, 20, (SELECT category_id FROM categories WHERE category_name = 'Đồ uống'), 'active');

INSERT IGNORE INTO inventory_items (barcode, item_name, image_url, price, import_price, unit, stock, status)
VALUES
('PROD001', 'Chuối', 'assets/images/chuoi.png', 25000, 15000, 'Kg', 100, 'available'),
('PROD002', 'Dâu tây', 'assets/images/dautay.jpg', 120000, 80000, 'Hộp', 50, 'available'),
('PROD003', 'Táo', 'assets/images/tao.png', 60000, 40000, 'Kg', 80, 'available'),
('PROD004', 'Dứa (Thơm)', 'assets/images/dua.jpg', 15000, 8000, 'Quả', 40, 'available'),
('PROD005', 'Dưa hấu', 'assets/images/duahau.jpg', 20000, 12000, 'Kg', 150, 'available'),
('PROD006', 'Xốt Thái sả tắc', 'assets/images/xotthaixatac.jpg', 35000, 25000, 'Chai', 60, 'available'),
('PROD007', 'Xốt BBQ', 'assets/images/XotBBQ.png', 45000, 32000, 'Chai', 40, 'available'),
('PROD008', 'Muối ớt chanh Nha Trang', 'assets/images/muoiotchanh.png', 18000, 12000, 'Chai', 100, 'available'),
('PROD009', 'Xốt kim quất', 'assets/images/xotkimquat.jpg', 35000, 25000, 'Chai', 50, 'available'),
('PROD010', 'Xốt trứng muối', 'assets/images/sottrungmuoi.png', 55000, 40000, 'Chai', 30, 'available'),
('PROD011', 'Trà TH true TEA', 'assets/images/trathtruetea.jpg', 10000, 7000, 'Chai', 200, 'available'),
('PROD012', 'Trà đào và hạt chia Fuze Tea', 'assets/images/tradaohatchia.jpg', 12000, 8500, 'Chai', 120, 'available'),
('PROD013', 'Trà xanh C2 hương chanh', 'assets/images/C2.jpg', 8000, 5500, 'Chai', 300, 'available'),
('PROD014', 'Trà đá TRADA hương hoa nhài', 'assets/images/trahoanhai.png', 10000, 6500, 'Lon', 100, 'available'),
('PROD015', 'Trà xanh Lipton vị chanh mật ong', 'assets/images/trachanhmatong.jpg', 12000, 8000, 'Chai', 150, 'available');
UPDATE inventory_items ii
JOIN products p ON p.barcode = ii.barcode
SET ii.category_id = p.category_id
WHERE ii.category_id IS NULL;
