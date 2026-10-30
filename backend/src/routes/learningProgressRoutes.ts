
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";

import { LearningProgress } from "../models/LearningProgress";
import {
  getProgress,
  addTask,
  updateTask,
  deleteTask,
} from "../services/learningProgressService";

const router = Router();

// =====================================================
// AUTHENTICATION
// =====================================================

interface AuthenticatedRequest extends Request {
  userId?: string;
}

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

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

// Completed topics validation
const progressSchema = z.object({
  completedTopics: z
    .array(z.string().trim().min(1).max(200))
    .max(100),
}).strict();

// Create task validation
const taskSchema = z.object({
  title: z.string().trim().min(2).max(120),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  priority: z
    .enum(["low", "medium", "high"])
    .default("medium"),

  status: z
    .enum(["pending", "completed"])
    .default("pending"),

  estimatedDuration: z
    .number()
    .min(1)
    .optional(),

  progress: z
    .number()
    .min(0)
    .max(100)
    .default(0),
}).strict();

// Update task validation
const taskUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  priority: z
    .enum(["low", "medium", "high"])
    .optional(),

  status: z
    .enum(["pending", "completed"])
    .optional(),

  estimatedDuration: z
    .number()
    .min(1)
    .optional(),

  progress: z
    .number()
    .min(0)
    .max(100)
    .optional(),
})
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided.",
    }
  );

// =====================================================
// GET COMPLETED TOPICS
// GET /api/learning-progress
// =====================================================

router.get(
  "/",
  authenticateRequest,
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

// =====================================================
// SAVE COMPLETED TOPICS
// PUT /api/learning-progress
// =====================================================

router.put(
  "/",
  authenticateRequest,
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

      const completedTopics = [
        ...new Set(parsed.data.completedTopics),
      ];

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
        completedTopics:
          progress?.completedTopics ?? completedTopics,
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

// =====================================================
// GET ALL TASKS
// GET /api/learning-progress/tasks
// =====================================================

router.get(
  "/tasks",
  authenticateRequest,
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const progress = await getProgress(req.userId!);

      res.status(200).json({
        success: true,
        tasks: progress?.tasks ?? [],
      });
    } catch (error) {
      console.error("Failed to retrieve tasks:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve tasks.",
      });
    }
  }
);

// =====================================================
// CREATE TASK
// POST /api/learning-progress/tasks
// =====================================================

router.post(
  "/tasks",
  authenticateRequest,
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const parsed = taskSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task data.",
        details: parsed.error.issues,
      });
      return;
    }

    try {
      const task = await addTask(
        req.userId!,
        parsed.data
      );

      res.status(201).json({
        success: true,
        message: "Task created successfully.",
        task,
      });
    } catch (error) {
      console.error("Failed to create task:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create task.",
      });
    }
  }
);

// =====================================================
// UPDATE TASK
// PATCH /api/learning-progress/tasks/:taskId
// =====================================================

router.patch(
  "/tasks/:taskId",
  authenticateRequest,
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const taskId = String(req.params.taskId);

    if (!mongoose.isValidObjectId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
      return;
    }

    const parsed = taskUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task update data.",
        details: parsed.error.issues,
      });
      return;
    }

    try {
      const updated = await updateTask(
        req.userId!,
        taskId,
        parsed.data
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: "Task not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Task updated successfully.",
        task: updated,
      });
    } catch (error) {
      console.error("Failed to update task:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update task.",
      });
    }
  }
);

// =====================================================
// DELETE TASK
// DELETE /api/learning-progress/tasks/:taskId
// =====================================================

router.delete(
  "/tasks/:taskId",
  authenticateRequest,
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const taskId = String(req.params.taskId);

    if (!mongoose.isValidObjectId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
      return;
    }

    try {
      const deleted = await deleteTask(
        req.userId!,
        taskId
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Task not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Task deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete task:", error);

      res.status(500).json({
        success: false,
        message: "Unable to delete task.",
      });
    }
  }
);

export default router;
