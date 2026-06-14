import express from "express";
import { saveSignatureCoordinates, getDocumentSignatures, finalizeDocument, sendInvitation, getPublicDocument, publicSignDocument, updateSignatureStatus } from "../controllers/signatureController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { auditLog } from "../middlewares/auditMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, auditLog('Signature placed'), saveSignatureCoordinates);
router.patch("/:id/status", authMiddleware, auditLog('Signature status updated'), updateSignatureStatus);
router.post("/finalize", authMiddleware, auditLog('Signature finalized'), finalizeDocument);
router.post("/send", authMiddleware, auditLog('Invitation sent'), sendInvitation);
router.get("/public/:token", getPublicDocument);
router.post("/public/:token/sign", auditLog('Public signing completed'), publicSignDocument);
router.get("/:documentId", authMiddleware, getDocumentSignatures);

export default router;
