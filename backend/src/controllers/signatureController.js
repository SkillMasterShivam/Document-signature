import mongoose from "mongoose";
import Signature from "../models/Signature.js";
import Document from "../models/Document.js";
import { mockDocuments } from "./docController.js";

export const mockSignatures = [];

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Save signature position
// @route   POST /api/signatures
// @access  Private
export const saveSignatureCoordinates = async (req, res) => {
  try {
    const { fileId, x, y, page, id } = req.body;

    if (!fileId || x === undefined || y === undefined || page === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: fileId, x, y, page",
      });
    }

    const userId = req.user._id.toString();

    if (isDbConnected()) {
      // Validate document exists
      const document = await Document.findById(fileId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      if (id) {
        // Update existing
        const existingSignature = await Signature.findById(id);
        if (existingSignature && existingSignature.signer.toString() === userId) {
          existingSignature.x = x;
          existingSignature.y = y;
          existingSignature.page = page;
          await existingSignature.save();
          return res.status(200).json({
            success: true,
            signature: existingSignature,
          });
        }
      }

      const newSignature = await Signature.create({
        fileId,
        signer: userId,
        x,
        y,
        page,
        status: "pending",
      });

      return res.status(201).json({
        success: true,
        signature: newSignature,
      });
    } else {
      // Mock / In-memory fallback
      console.log("[Mock Mode] Saving signature coordinates for document:", fileId);

      const documentExists = mockDocuments.find((doc) => doc._id === fileId);
      if (!documentExists) {
        return res.status(404).json({
          success: false,
          message: "Document not found (Mock)",
        });
      }

      if (id) {
        const existingSigIndex = mockSignatures.findIndex((sig) => sig._id === id && sig.signer === userId);
        if (existingSigIndex !== -1) {
          mockSignatures[existingSigIndex].x = x;
          mockSignatures[existingSigIndex].y = y;
          mockSignatures[existingSigIndex].page = page;
          mockSignatures[existingSigIndex].updatedAt = new Date();
          return res.status(200).json({
            success: true,
            signature: mockSignatures[existingSigIndex],
          });
        }
      }

      const mockSig = {
        _id: new mongoose.Types.ObjectId().toString(),
        fileId,
        signer: userId,
        x,
        y,
        page,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSignatures.push(mockSig);

      return res.status(201).json({
        success: true,
        signature: mockSig,
      });
    }
  } catch (error) {
    console.error("Save Signature Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save signature coordinates",
    });
  }
};

// @desc    Get all signatures for a document
// @route   GET /api/signatures/:documentId
// @access  Private
export const getDocumentSignatures = async (req, res) => {
  try {
    const { documentId } = req.params;

    if (isDbConnected()) {
      const signatures = await Signature.find({ fileId: documentId });

      return res.status(200).json({
        success: true,
        signatures,
      });
    } else {
      // Mock / In-memory fallback
      console.log("[Mock Mode] Fetching signatures for document:", documentId);

      const docSignatures = mockSignatures.filter((sig) => sig.fileId === documentId);

      return res.status(200).json({
        success: true,
        signatures: docSignatures,
      });
    }
  } catch (error) {
    console.error("Fetch Signatures Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch signatures",
    });
  }
};
