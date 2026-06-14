import mongoose from "mongoose";
import Audit from "../models/Audit.js";

export const mockAudits = [];
const isDbConnected = () => mongoose.connection.readyState === 1;

export const auditLog = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && data.success) {
        // Run audit logging asynchronously
        (async () => {
          try {
            let documentId = req.body.documentId || req.body.fileId || req.params.documentId;
            if (!documentId) {
              if (data.document && data.document._id) documentId = data.document._id;
              else if (data.documentId) documentId = data.documentId;
              else if (data.signature && data.signature.fileId) documentId = data.signature.fileId;
              else if (data.invitation && data.invitation.documentId) documentId = data.invitation.documentId;
            }

            if (documentId) {
              const userId = req.user ? req.user._id : null;
              const signerEmail = req.body.email || (data.invitation && data.invitation.signerEmail) || (req.body.signerEmail) || null;
              const ipAddress = req.ip || req.connection?.remoteAddress || "unknown";
              const userAgent = req.get("User-Agent") || "unknown";

              if (isDbConnected()) {
                await Audit.create({
                  documentId,
                  userId,
                  signerEmail,
                  action,
                  ipAddress,
                  userAgent,
                });
              } else {
                mockAudits.push({
                  _id: new mongoose.Types.ObjectId().toString(),
                  documentId,
                  userId,
                  signerEmail,
                  action,
                  ipAddress,
                  userAgent,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            }
          } catch (err) {
            console.error("Audit Logging Error:", err);
          }
        })();
      }
      return originalJson.call(this, data);
    };
    next();
  };
};
