import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { QuestionBankItem } from "../models/QuestionBank";
import { User } from "../models/User";

const router = Router();

function requireAdmin(req: Request, res: Response, next: () => void) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const token = authorization.slice(7).trim();
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    res.status(401).json({ success: false, message: "Invalid authentication." });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      res.status(401).json({ success: false, message: "Invalid token." });
      return;
    }

    void User.findById(decoded.sub).then((user) => {
      if (!user || user.role !== "admin") {
        res.status(403).json({ success: false, message: "Admin access required." });
        return;
      }

      next();
    }).catch((error) => {
      console.error("Admin auth check failed:", error);
      res.status(500).json({ success: false, message: "Unable to validate admin access." });
    });
  } catch {
    res.status(401).json({ success: false, message: "Your session is invalid or expired." });
  }
}

const adminQuestionSchema = z.object({
  category: z.enum(["technical", "behavioral", "mixed", "hr", "situational", "coding"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  questionText: z.string().trim().min(10).max(2000),
  skills: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  expectedConcepts: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  roleContext: z.string().trim().max(200).optional(),
});

const adminQuestionQuerySchema = z.object({
  category: z.enum(["technical", "behavioral", "mixed", "hr", "situational", "coding", "all"]).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "all"]).optional(),
  search: z.string().trim().max(120).optional(),
});

router.get("/questions", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = adminQuestionQuerySchema.safeParse(req.query);
    const filter: Record<string, unknown> = {};

    if (parsed.success) {
      const { category, difficulty, search } = parsed.data;

      if (category && category !== "all") {
        filter.category = category;
      }

      if (difficulty && difficulty !== "all") {
        filter.difficulty = difficulty;
      }

      if (search && search.length > 0) {
        const normalized = search.trim();
        filter.$or = [
          { questionText: { $regex: normalized, $options: "i" } },
          { skills: { $regex: normalized, $options: "i" } },
          { expectedConcepts: { $regex: normalized, $options: "i" } },
          { roleContext: { $regex: normalized, $options: "i" } },
        ];
      }
    }

    const questions = await QuestionBankItem.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error("Admin question-bank fetch error:", error);
    res.status(500).json({ success: false, message: "Unable to load the question bank." });
  }
});

router.get("/questions/stats", requireAdmin, async (_req, res) => {
  try {
    const categoryCounts = await QuestionBankItem.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const difficultyCounts = await QuestionBankItem.aggregate([
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const totalQuestions = await QuestionBankItem.countDocuments();

    res.status(200).json({
      success: true,
      stats: {
        totalQuestions,
        byCategory: Object.fromEntries(
          categoryCounts.map((entry) => [String(entry._id), Number(entry.count)])
        ),
        byDifficulty: Object.fromEntries(
          difficultyCounts.map((entry) => [String(entry._id), Number(entry.count)])
        ),
      },
    });
  } catch (error) {
    console.error("Admin question-bank stats error:", error);
    res.status(500).json({ success: false, message: "Unable to load question-bank statistics." });
  }
});

router.get("/questions/export", requireAdmin, async (_req, res) => {
  try {
    const questions = await QuestionBankItem.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      questions,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin question-bank export error:", error);
    res.status(500).json({ success: false, message: "Unable to export the question bank." });
  }
});

router.post("/questions", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = adminQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid question, category, and difficulty.",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const item = await QuestionBankItem.create(parsed.data);

    res.status(201).json({
      success: true,
      message: "Question added to the bank.",
      question: item,
    });
  } catch (error) {
    console.error("Admin question creation error:", error);
    res.status(500).json({ success: false, message: "Unable to save the question." });
  }
});

router.patch("/questions/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id || !(/^[a-f\d]{24}$/i.test(id))) {
      res.status(400).json({ success: false, message: "Invalid question ID." });
      return;
    }

    const parsed = adminQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Please provide valid updated question data.",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const updated = await QuestionBankItem.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: "Question not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Question updated.",
      question: updated,
    });
  } catch (error) {
    console.error("Admin question update error:", error);
    res.status(500).json({ success: false, message: "Unable to update the question." });
  }
});

router.delete("/questions/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id || !(/^[a-f\d]{24}$/i.test(id))) {
      res.status(400).json({ success: false, message: "Invalid question ID." });
      return;
    }

    const deleted = await QuestionBankItem.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ success: false, message: "Question not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Question removed from the bank.",
      questionId: id,
    });
  } catch (error) {
    console.error("Admin question delete error:", error);
    res.status(500).json({ success: false, message: "Unable to remove the question." });
  }
});

export default router;
