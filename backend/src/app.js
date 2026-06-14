import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import docRoutes from "./routes/docRoutes.js";
import signatureRoutes from "./routes/signatureRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve uploaded files statically so frontend can access PDFs
const uploadDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadDir));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/docs", docRoutes);
app.use("/api/signatures", signatureRoutes);
app.use("/api/audit", auditRoutes);

export default app;

