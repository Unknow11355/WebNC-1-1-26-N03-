import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// Linh yêu cầu lưu ngoài thư mục thực thi, ta để ở root project
const uploadDir = path.join(process.cwd(), '..', 'uploads', 'products');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    // Tạo tên file ngẫu nhiên bằng UUID/Hash theo đúng yêu cầu
    const randomName = crypto.randomUUID();
    cb(null, `${Date.now()}-${randomName}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MiB
  fileFilter: (req, file, cb) => {
    const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp']); // Bỏ gif/heic theo yêu cầu
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (!allowedExts.has(ext)) {
      return cb(new Error('Chỉ hỗ trợ upload ảnh hợp lệ (.jpg, .png, .webp)'));
    }
    cb(null, true);
  },
});