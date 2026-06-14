import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import docRoutes from "./routes/docRoutes.js";
import signatureRoutes from "./routes/signatureRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";

const app = express();

// Security Middlewares
app.use(helmet());
// Allow images and scripts from specific domains if needed, for PDFs we might need to adjust CSP later
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", limiter);

// CORS configuration for production readiness
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" })); // Limit payload size to prevent DOS
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// Serve uploaded files statically so frontend can access PDFs
const uploadDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadDir));

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/docs", docRoutes);
app.use("/api/signatures", signatureRoutes);
app.use("/api/audit", auditRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

export default app;