import Audit from "../models/Audit.js";
import Document from "../models/Document.js";
import catchAsync from "../utils/catchAsync.js";

// @desc    Get audit logs for a document
// @route   GET /api/audit/:documentId
// @access  Private
export const getAuditLogs = catchAsync(async (req, res) => {
  const { documentId } = req.params;
  const userId = req.user._id.toString();

  const document = await Document.findById(documentId);
  if (!document) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }
  
  if (document.uploadedBy.toString() !== userId) {
    return res.status(403).json({ success: false, message: "Unauthorized access to audit logs" });
  }

  const auditLogs = await Audit.find({ documentId })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, auditLogs });
});
