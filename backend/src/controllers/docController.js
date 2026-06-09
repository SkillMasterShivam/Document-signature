import mongoose from 'mongoose';
import Document from '../models/Document.js';

// Fallback in-memory store for documents
export const mockDocuments = [];

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Upload a PDF document
// @route   POST /api/docs/upload
// @access  Private
export const uploadDocument = async (req, res) => {
  try {
    // Multer validation ensures it's a PDF and limits size.
    // If no file was uploaded, multer won't populate req.file.
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a valid PDF file',
      });
    }

    const { filename, originalname, path: filePath, size } = req.file;

    if (isDbConnected()) {
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
    } else {
      // Mock / In-memory fallback
      console.log('[Mock Mode] Saving document metadata for:', originalname);
      
      const mockDoc = {
        _id: new mongoose.Types.ObjectId().toString(),
        fileName: filename,
        originalName: originalname,
        filePath: filePath,
        fileSize: size,
        uploadedBy: req.user._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDocuments.push(mockDoc);

      return res.status(201).json({
        success: true,
        document: mockDoc,
      });
    }
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'File upload failed',
    });
  }
};

// @desc    Get all documents for the authenticated user
// @route   GET /api/docs
// @access  Private
export const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    if (isDbConnected()) {
      const documents = await Document.find({ uploadedBy: userId }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        documents,
      });
    } else {
      // Mock / In-memory fallback
      console.log('[Mock Mode] Fetching documents for user:', userId);
      
      const userDocs = mockDocuments
        .filter((doc) => doc.uploadedBy.toString() === userId)
        .sort((a, b) => b.createdAt - a.createdAt);

      return res.status(200).json({
        success: true,
        documents: userDocs,
      });
    }
  } catch (error) {
    console.error('Fetch Documents Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch documents',
    });
  }
};

