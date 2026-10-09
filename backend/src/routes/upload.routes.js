import express from 'express';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { uploadProductImage } from '../controllers/upload.controller.js';

const router = express.Router();

// Route upload, áp dụng multer middleware trước, sau đó mới tới controller
router.post('/product-image', uploadMiddleware.single('file'), uploadProductImage);

export default router;