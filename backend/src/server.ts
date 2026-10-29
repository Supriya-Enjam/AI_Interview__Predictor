
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { connectDB } from "./config/db";

import authRoutes from "./routes/authRoutes";
import interviewRoutes from "./routes/interviewRoutes";
import adminRoutes from "./routes/adminRoutes";

import resumeRoutes from "./routes/resumeRoutes";
import learningProgressRoutes from "./routes/learningProgressRoutes";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/admin", adminRoutes);  
app.use("/api/resumes", resumeRoutes);
app.use("/api/learning-progress", learningProgressRoutes);
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Interview Performance Predictor API is running",
  });
});

async function startServer(): Promise<void> {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

void startServer();
