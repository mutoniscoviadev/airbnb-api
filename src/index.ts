import "dotenv/config";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import compression from "compression";
import morgan from "morgan";
import v1Router from "./routes/v1/index";
import uploadRouter from "./routes/upload.routes";
import { connectDB } from "./config/prisma";
import { errorHandler } from "./middlewares/errorHandler";
import { setupSwagger } from "./config/swagger";
import { generalLimiter, strictLimiter } from "./middlewares/rateLimiter";
import { deprecateV1 } from "./middlewares/deprecation.middleware";

const app = express();
const PORT = Number(process.env["PORT"]) || 3000;

// CORS — allow all origins including Swagger UI
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: false,
}));

app.use(compression());

app.use(
  process.env["NODE_ENV"] === "production"
    ? morgan("combined")
    : morgan("dev")
);

app.use(express.json());

app.use(generalLimiter);
app.post("*", strictLimiter);

// Health check — MUST be before setupSwagger and all other routes
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// Swagger comes AFTER health
setupSwagger(app);

// Debug logger — remove after testing
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`>>> ${req.method} ${req.url}`);
  next();
});

app.use("/api/v1", deprecateV1, v1Router);
app.use("/", uploadRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler — must be last
app.use(errorHandler);

const main = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger docs at http://localhost:${PORT}/api-docs`);
    console.log(`❤️  Health check at http://localhost:${PORT}/health`);
  });
};

main();