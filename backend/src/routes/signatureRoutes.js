import express from "express";
import { saveSignatureCoordinates, getDocumentSignatures } from "../controllers/signatureController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, saveSignatureCoordinates);
router.get("/:documentId", authMiddleware, getDocumentSignatures);

export default router;
