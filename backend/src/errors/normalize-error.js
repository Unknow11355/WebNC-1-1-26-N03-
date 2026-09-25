import { AppError } from './app-error.js';

export function normalizeError(error) {
  if (error instanceof AppError && error.status < 500) return error;
  if (error?.type === 'entity.parse.failed') {
    return new AppError(400, 'VALIDATION_ERROR', 'Nội dung JSON không hợp lệ');
  }
  if (error?.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Nội dung yêu cầu vượt quá giới hạn 1 MB');
  }
  if (['charset.unsupported', 'encoding.unsupported'].includes(error?.type)) {
    return new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Kiểu mã hóa nội dung không được hỗ trợ');
  }
  if (error?.code === 'ER_DUP_ENTRY') {
    return new AppError(409, 'CONFLICT', 'Dữ liệu đã tồn tại');
  }
  if (['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(error?.code)) {
    return new AppError(409, 'CONFLICT', 'Dữ liệu liên quan không cho phép thực hiện thao tác');
  }
  return new AppError(500, 'INTERNAL_ERROR', 'Hệ thống đang gặp sự cố, vui lòng thử lại');
}
