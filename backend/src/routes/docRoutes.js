import express from 'express';
import { uploadDocument, getUserDocuments } from '../controllers/docController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import { auditLog } from '../middlewares/auditMiddleware.js';

const router = express.Router();

// Wrap multer upload to gracefully handle errors from fileFilter
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');
  uploadSingle(req, res, function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

router.post('/upload', authMiddleware, handleUpload, auditLog('Document uploaded'), uploadDocument);
router.get('/', authMiddleware, getUserDocuments);

export default router;

