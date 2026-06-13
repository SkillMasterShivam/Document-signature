import mongoose from "mongoose";
import Signature from "../models/Signature.js";
import Document from "../models/Document.js";
import { mockDocuments } from "./docController.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

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

// @desc    Finalize and render signatures onto PDF
// @route   POST /api/signatures/finalize
// @access  Private
export const finalizeDocument = async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: "Missing document fileId",
      });
    }

    const userId = req.user._id.toString();
    const userName = req.user.name || "Signed";

    let document;
    let signatures = [];

    if (isDbConnected()) {
      document = await Document.findById(fileId);
      if (!document) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
      signatures = await Signature.find({ fileId, signer: userId });
    } else {
      document = mockDocuments.find(d => d._id === fileId);
      if (!document) {
        return res.status(404).json({ success: false, message: "Document not found (Mock)" });
      }
      signatures = mockSignatures.filter(s => s.fileId === fileId && s.signer === userId);
    }

    if (!signatures || signatures.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No signatures found for this document",
      });
    }

    // 1. Load original PDF
    const pdfBytes = await fs.readFile(document.filePath);
    
    // 4. Open PDF using PDF-Lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // 5. Render signature onto PDF page
    const pages = pdfDoc.getPages();
    for (const sig of signatures) {
      const pageIndex = sig.page - 1;
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        
        // Calculate coordinate from percentage to points.
        // Frontend uses Top-Left origin, pdf-lib uses Bottom-Left origin.
        const pdfX = (sig.x / 100) * width;
        const pdfY = height - ((sig.y / 100) * height);
        
        // Draw text representing the signature
        page.drawText(userName, {
          x: pdfX,
          y: pdfY,
          size: 16,
          font: helveticaFont,
          color: rgb(0, 0, 0.8),
        });
      }
    }

    // 6. Create new signed PDF
    const signedPdfBytes = await pdfDoc.save();

    // 7. Save signed PDF to disk
    const signedDir = path.join(process.cwd(), "uploads", "signed");
    await fs.mkdir(signedDir, { recursive: true });
    
    const signedFileName = `signed-${Date.now()}-${document.fileName}`;
    const signedFilePath = path.join(signedDir, signedFileName);
    
    await fs.writeFile(signedFilePath, signedPdfBytes);

    // 8. Return path or URL
    const signedPdfUrl = `/uploads/signed/${signedFileName}`;

    return res.status(200).json({
      success: true,
      signedPdfPath: signedPdfUrl,
      documentId: document._id || document.id,
    });

  } catch (error) {
    console.error("Finalize Signature Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process and finalize PDF",
    });
  }
};

