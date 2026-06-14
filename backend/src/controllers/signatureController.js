import Signature from "../models/Signature.js";
import Document from "../models/Document.js";
import Invitation from "../models/Invitation.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import catchAsync from "../utils/catchAsync.js";

// @desc    Save signature position
// @route   POST /api/signatures
// @access  Private
export const saveSignatureCoordinates = catchAsync(async (req, res) => {
  const { fileId, x, y, page, id } = req.body;

  if (!fileId || x === undefined || y === undefined || page === undefined) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: fileId, x, y, page",
    });
  }

  const userId = req.user._id.toString();

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
    status: "Pending",
  });

  return res.status(201).json({
    success: true,
    signature: newSignature,
  });
});

// @desc    Get all signatures for a document
// @route   GET /api/signatures/:documentId
// @access  Private
export const getDocumentSignatures = catchAsync(async (req, res) => {
  const { documentId } = req.params;

  const signatures = await Signature.find({ fileId: documentId });

  return res.status(200).json({
    success: true,
    signatures,
  });
});

// @desc    Finalize and render signatures onto PDF
// @route   POST /api/signatures/finalize
// @access  Private
export const finalizeDocument = catchAsync(async (req, res) => {
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: "Missing document fileId",
    });
  }

  const userId = req.user._id.toString();
  const userName = req.user.name || "Signed";

  const document = await Document.findById(fileId);
  if (!document) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }
  const signatures = await Signature.find({ fileId, signer: userId });

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
});

// @desc    Send email invitation to signer
// @route   POST /api/signatures/send
// @access  Private
export const sendInvitation = catchAsync(async (req, res) => {
  const { documentId, email } = req.body;
  if (!documentId || !email) {
    return res.status(400).json({ success: false, message: "Missing documentId or email" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7); // 7 days expiry

  const document = await Document.findById(documentId);
  if (!document) return res.status(404).json({ success: false, message: "Document not found" });
  
  const existing = await Invitation.findOne({ documentId, signerEmail: email, status: "pending" });
  if (existing) {
    return res.status(400).json({ success: false, message: "Invitation already sent to this email" });
  }

  const newInvitation = await Invitation.create({
    documentId,
    signerEmail: email,
    token,
    expirationDate,
    status: "pending"
  });

  const signingUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/sign/${token}`;
  
  // Mock sending email
  console.log("=========================================");
  console.log(`[EMAIL SENT] To: ${email}`);
  console.log(`Subject: Signature Request - ${document.originalName}`);
  console.log(`Body: You have been invited to sign a document.`);
  console.log(`Please click the link below to sign:\n${signingUrl}`);
  console.log(`This link will expire on: ${expirationDate.toLocaleString()}`);
  console.log("=========================================");

  return res.status(200).json({
    success: true,
    message: "Invitation sent successfully",
    invitation: newInvitation
  });
});

// @desc    Get document for public signing via token
// @route   GET /api/signatures/public/:token
// @access  Public
export const getPublicDocument = catchAsync(async (req, res) => {
  const { token } = req.params;
  
  const invitation = await Invitation.findOne({ token });
  if (!invitation) return res.status(404).json({ success: false, message: "Invalid token" });
  
  if (invitation.expirationDate < new Date()) {
    invitation.status = "expired";
    await invitation.save();
    return res.status(400).json({ success: false, message: "Token has expired" });
  }
  
  const document = await Document.findById(invitation.documentId);
  if (!document) return res.status(404).json({ success: false, message: "Document not found" });

  return res.status(200).json({
    success: true,
    document,
    invitation
  });
});

// @desc    Complete public signing
// @route   POST /api/signatures/public/:token/sign
// @access  Public
export const publicSignDocument = catchAsync(async (req, res) => {
  const { token } = req.params;
  
  const invitation = await Invitation.findOne({ token, status: "pending" });
  if (!invitation || invitation.expirationDate < new Date()) {
    return res.status(400).json({ success: false, message: "Invalid or expired token" });
  }
  
  invitation.status = "signed";
  await invitation.save();

  // Usually we would map the signature logic here using pdf-lib, but for this demo 
  // we simply acknowledge the signature logic passed successfully for the audit log.
  return res.status(200).json({
    success: true,
    message: "Signed successfully",
    invitation
  });
});

// @desc    Update signature status (Accept/Reject)
// @route   PATCH /api/signatures/:id/status
// @access  Private
export const updateSignatureStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const userId = req.user._id.toString();

  if (!status || !["Signed", "Rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (status === "Rejected" && !reason) {
    return res.status(400).json({ success: false, message: "Missing rejection reason when rejected" });
  }

  const signature = await Signature.findById(id);
  if (!signature) {
    return res.status(404).json({ success: false, message: "Signature not found" });
  }

  if (signature.signer.toString() !== userId) {
    return res.status(403).json({ success: false, message: "Unauthorized user" });
  }

  if (signature.status !== "Pending") {
    return res.status(400).json({ success: false, message: "Already finalized signatures cannot be updated" });
  }

  signature.status = status;
  if (status === "Signed") signature.signedAt = new Date();
  if (status === "Rejected") signature.rejectionReason = reason;

  await signature.save();

  return res.status(200).json({ success: true, signature });
});
