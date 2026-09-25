import { AppError } from '../errors/app-error.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let known = error instanceof AppError;
  if (error.type === 'entity.parse.failed') {
    error = new AppError(400, 'VALIDATION_ERROR', 'Nội dung JSON không hợp lệ');
    known = true;
  } else if (error.type === 'entity.too.large') {
    error = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Nội dung yêu cầu quá lớn');
    known = true;
  }
  if (!known) console.error(`[${req.traceId}]`, error);
  res.status(known ? error.status : 500).json({
    success: false,
    error: {
      code: known ? error.code : 'INTERNAL_ERROR',
      message: known ? error.message : 'Hệ thống đang gặp sự cố, vui lòng thử lại',
      details: known ? error.details : [],
      traceId: req.traceId,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });
}
