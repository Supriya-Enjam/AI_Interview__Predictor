
import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";

import { LearningProgress } from "../models/LearningProgress";

const router = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Authenticate requests using the existing JWT token.
function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
    return;
  }

  const token = authorization.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      success: false,
      message: "Server authentication configuration is missing.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !mongoose.isValidObjectId(decoded.sub)
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}

const progressSchema = z.object({
  completedTopics: z
    .array(z.string().trim().min(1).max(200))
    .max(100),
});

// GET: Retrieve the logged-in user's learning progress.
router.get(
  "/",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const progress = await LearningProgress.findOne({
        userId: req.userId,
      }).lean();

      res.status(200).json({
        success: true,
        completedTopics: progress?.completedTopics ?? [],
      });
    } catch (error) {
      console.error("Failed to retrieve learning progress:", error);
      res.status(500).json({
        success: false,
        message: "Unable to retrieve learning progress.",
      });
    }
  }
);

// PUT: Save the logged-in user's completed topics.
router.put(
  "/",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parsed = progressSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Invalid learning progress data.",
          details: parsed.error.issues,
        });
        return;
      }

      const completedTopics = [...new Set(parsed.data.completedTopics)];

      const progress = await LearningProgress.findOneAndUpdate(
        { userId: req.userId },
        {
          $set: { completedTopics },
          $setOnInsert: { userId: req.userId },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

      res.status(200).json({
        success: true,
        message: "Learning progress saved successfully.",
        completedTopics: progress?.completedTopics ?? completedTopics,
      });
    } catch (error) {
      console.error("Failed to save learning progress:", error);
      res.status(500).json({
        success: false,
        message: "Unable to save learning progress.",
      });
    }
  }
);

export default router;
