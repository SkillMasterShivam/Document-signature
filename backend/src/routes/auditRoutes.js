import express from "express";
import { getAuditLogs } from "../controllers/auditController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:documentId", authMiddleware, getAuditLogs);

export default router;
