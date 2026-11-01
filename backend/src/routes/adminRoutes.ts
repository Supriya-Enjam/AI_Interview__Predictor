import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { Interview } from "../models/Interview";
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

// =========================================================
// ADMIN CANDIDATE MANAGEMENT
// =========================================================

router.get("/candidates", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || "").trim();

    const filter: Record<string, unknown> = {
      role: "candidate",
    };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { targetRole: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const totalCandidates = await User.countDocuments(filter);

    const candidates = await User.find(filter)
      .select("name email targetRole createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const candidateIds = candidates.map((candidate) => candidate._id);

    const interviewStats = await Interview.aggregate([
      {
        $match: {
          candidateId: { $in: candidateIds },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$candidateId",
          totalInterviews: { $sum: 1 },
          completedInterviews: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          latestInterview: {
            $first: {
              targetRole: "$targetRole",
              category: "$category",
              difficulty: "$difficulty",
              status: "$status",
              createdAt: "$createdAt",
              completedAt: "$completedAt",
              percentage: "$evaluation.percentage",
            },
          },
        },
      },
    ]);

    const statsByCandidate = new Map(
      interviewStats.map((item) => [String(item._id), item])
    );

    const candidateResults = candidates.map((candidate) => {
      const stats = statsByCandidate.get(String(candidate._id));

      return {
        id: String(candidate._id),
        name: candidate.name,
        email: candidate.email,
        targetRole: candidate.targetRole || "Not specified",
        registeredAt: candidate.createdAt,
        totalInterviews: stats?.totalInterviews ?? 0,
        completedInterviews: stats?.completedInterviews ?? 0,
        latestInterview: stats?.latestInterview ?? null,
      };
    });

    res.status(200).json({
      success: true,
      candidates: candidateResults,
      pagination: {
        page,
        limit,
        totalCandidates,
        totalPages: Math.ceil(totalCandidates / limit),
      },
    });
  } catch (error) {
    console.error("Admin candidate management error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load candidate information.",
    });
  }
});

export default router;

// =========================================================
// ADMIN MODEL MONITORING
// =========================================================

router.get("/model/monitoring", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [
      totalInterviews,
      completedInterviews,
      evaluatedInterviews,
      totalUsers,
      rubricAverages,
      evaluationMethods,
      recentEvaluations,
    ] = await Promise.all([
      Interview.countDocuments(),
      Interview.countDocuments({ status: "completed" }),
      Interview.countDocuments({ evaluation: { $exists: true } }),
      User.countDocuments({ role: "candidate" }),

      Interview.aggregate([
        { $match: { "evaluation.questionEvaluations.0": { $exists: true } } },
        { $unwind: "$evaluation.questionEvaluations" },
        {
          $group: {
            _id: null,
            completeness: { $avg: "$evaluation.questionEvaluations.rubric.completeness" },
            structure: { $avg: "$evaluation.questionEvaluations.rubric.structure" },
            specificity: { $avg: "$evaluation.questionEvaluations.rubric.specificity" },
            relevance: { $avg: "$evaluation.questionEvaluations.rubric.relevance" },
            communication: { $avg: "$evaluation.questionEvaluations.rubric.communication" },
            averageScore: { $avg: "$evaluation.questionEvaluations.score" },
            maximumScore: { $avg: "$evaluation.questionEvaluations.maxScore" },
            evaluatedAnswers: { $sum: 1 },
          },
        },
      ]),

      Interview.aggregate([
        { $match: { evaluation: { $exists: true } } },
        {
          $group: {
            _id: "$evaluation.evaluationMethod",
            count: { $sum: 1 },
          },
        },
      ]),

      Interview.find({ evaluation: { $exists: true } })
        .select("targetRole category difficulty evaluation.percentage evaluation.evaluatedAt")
        .sort({ "evaluation.evaluatedAt": -1 })
        .limit(5)
        .lean(),
    ]);

    const averages = rubricAverages[0] ?? {
      completeness: 0,
      structure: 0,
      specificity: 0,
      relevance: 0,
      communication: 0,
      averageScore: 0,
      maximumScore: 0,
      evaluatedAnswers: 0,
    };

    res.status(200).json({
      success: true,
      monitoring: {
        system: {
          name: "InterviewIQ Rubric Evaluation Engine",
          type: "Rule-based rubric evaluation",
          evaluationMethod: "rubric",
          trainedMachineLearningModel: false,
        },
        activity: {
          totalUsers,
          totalInterviews,
          completedInterviews,
          evaluatedInterviews,
          evaluatedAnswers: averages.evaluatedAnswers,
        },
        performance: {
          averageAnswerScore: Number(averages.averageScore.toFixed(2)),
          averageMaximumScore: Number(averages.maximumScore.toFixed(2)),
          rubricAverages: {
            completeness: Number(averages.completeness.toFixed(2)),
            structure: Number(averages.structure.toFixed(2)),
            specificity: Number(averages.specificity.toFixed(2)),
            relevance: Number(averages.relevance.toFixed(2)),
            communication: Number(averages.communication.toFixed(2)),
          },
        },
        evaluationMethods: evaluationMethods.map((item) => ({
          method: item._id,
          count: item.count,
        })),
        recentEvaluations,
        metricsNote:
          "These are descriptive statistics from the rule-based rubric evaluator. They are not ML accuracy, precision, recall, or F1-score measurements.",
      },
    });
  } catch (error) {
    console.error("Admin model monitoring error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load model monitoring statistics.",
    });
  }
});
