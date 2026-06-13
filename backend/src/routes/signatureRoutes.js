import express from "express";
import { saveSignatureCoordinates, getDocumentSignatures, finalizeDocument } from "../controllers/signatureController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, saveSignatureCoordinates);
router.post("/finalize", authMiddleware, finalizeDocument);
router.get("/:documentId", authMiddleware, getDocumentSignatures);

export default router;
