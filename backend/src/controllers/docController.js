import Document from '../models/Document.js';
import catchAsync from "../utils/catchAsync.js";

// @desc    Upload a PDF document
// @route   POST /api/docs/upload
// @access  Private
export const uploadDocument = catchAsync(async (req, res) => {
  // Multer validation ensures it's a PDF and limits size.
  // If no file was uploaded, multer won't populate req.file.
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a valid PDF file',
    });
  }

  const { filename, originalname, path: filePath, size } = req.file;

  const newDocument = await Document.create({
    fileName: filename,
    originalName: originalname,
    filePath: filePath,
    fileSize: size,
    uploadedBy: req.user._id,
  });

  return res.status(201).json({
    success: true,
    document: newDocument,
  });
});

// @desc    Get all documents for the authenticated user
// @route   GET /api/docs
// @access  Private
export const getUserDocuments = catchAsync(async (req, res) => {
  const userId = req.user._id.toString();

  // Implement pagination for future proofing and performance
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const documents = await Document.find({ uploadedBy: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Document.countDocuments({ uploadedBy: userId });

  return res.status(200).json({
    success: true,
    count: documents.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    documents,
  });
});
