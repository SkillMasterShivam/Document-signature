import mongoose from "mongoose";
import Audit from "../models/Audit.js";
import Document from "../models/Document.js";
import { mockAudits } from "../middlewares/auditMiddleware.js";
import { mockDocuments } from "./docController.js";

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get audit logs for a document
// @route   GET /api/audit/:documentId
// @access  Private
export const getAuditLogs = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user._id.toString();

    if (isDbConnected()) {
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
    } else {
      // Mock mode
      const document = mockDocuments.find(d => d._id === documentId);
      if (!document) {
        return res.status(404).json({ success: false, message: "Document not found (Mock)" });
      }
      if (document.uploadedBy.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized access to audit logs (Mock)" });
      }

      const logs = mockAudits
        .filter(log => log.documentId === documentId)
        .sort((a, b) => b.createdAt - a.createdAt);

      return res.status(200).json({ success: true, auditLogs: logs });
    }
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};
