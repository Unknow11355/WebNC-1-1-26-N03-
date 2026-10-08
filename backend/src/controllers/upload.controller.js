import sharp from 'sharp';
import fs from 'fs/promises';

export const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
    }

    const filePath = req.file.path;

    // KIỂM TRA CHỮ KÝ VÀ DECODE ẢNH THỰC SỰ BẰNG SHARP
    try {
      const metadata = await sharp(filePath).metadata();
      // Linh yêu cầu giới hạn pixel để chống bom nén
      if (metadata.width > 5000 || metadata.height > 5000) {
         throw new Error('Kích thước ảnh quá lớn (vượt quá 5000px)');
      }
    } catch (error) {
      // Nếu sharp không đọc được -> Đây là file giả mạo (script đổi đuôi)!
      // Xóa file rác đi và trả về lỗi 415
      await fs.unlink(filePath).catch(() => {});
      return res.status(415).json({
        success: false,
        message: 'File không đúng định dạng ảnh hoặc bị hỏng (Phát hiện giả mạo)'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.status(201).json({
      success: true,
      message: 'Upload ảnh thành công',
      data: {
        image_url: `${baseUrl}/uploads/products/${req.file.filename}`,
      },
    });
  } catch (error) {
    next(error);
  }
};