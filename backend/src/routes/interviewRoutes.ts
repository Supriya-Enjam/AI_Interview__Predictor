import { Router, type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { Interview } from "../models/Interview";
import { User } from "../models/User";

import { evaluateCompletedInterview } from "../services/interviewEvaluationService";
import { estimateInterviewReadiness } from "../services/interviewReadinessService";
import { summarizeSkillGaps } from "../services/skillGapService";
import { recommendAdaptiveDifficulty } from "../services/adaptiveDifficultyService";
import {
  generateQuestionSet,
  seedDefaultQuestionBank,
} from "../services/questionBankService";

const router = Router();

// =========================================================
// TYPES AND VALIDATION
// =========================================================

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const interviewCategorySchema = z.enum([
  "technical",
  "behavioral",
  "mixed",
  "hr",
  "situational",
  "coding",
]);

const difficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

const createInterviewSchema = z.object({
  targetRole: z.string().trim().min(2).max(100),
  category: interviewCategorySchema,
  difficulty: difficultySchema,
  duration: z.union([
    z.literal(10),
    z.literal(15),
    z.literal(30),
    z.literal(45),
  ]),
});

const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(1).max(10000),
});

const questionBankPreviewSchema = z.object({
  category: interviewCategorySchema,
  difficulty: difficultySchema,
  targetRole: z.string().trim().min(2).max(100).optional(),
});

// =========================================================
// AUTHENTICATION MIDDLEWARE
// =========================================================

function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please sign in.",
    });
    return;
  }

  const token = authorization.slice(7).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret || !token) {
    res.status(401).json({
      success: false,
      message: "Invalid authentication configuration or token.",
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
      message: "Your session is invalid or expired. Please sign in again.",
    });
  }
}

// =========================================================
// HELPERS
// =========================================================

function isValidInterviewId(id: unknown): id is string {
  return typeof id === "string" && mongoose.isValidObjectId(id);
}

function getAnsweredQuestionCount(
  questions: Array<{ answer?: string }>
): number {
  return questions.filter((question) =>
    Boolean(question.answer?.trim())
  ).length;
}

/**
 * Attempts to evaluate a completed interview.
 * Returns null if evaluation fails so the completed interview
 * remains saved and can be evaluated again later.
 */
async function tryEvaluateInterview(
  interview: InstanceType<typeof Interview>
) {
  try {
    const evaluation = evaluateCompletedInterview(interview);

    interview.evaluation = evaluation;
    await interview.save();

    return evaluation;
  } catch (error) {
    console.error("Interview evaluation failed:", error);
    return null;
  }
}

// =========================================================
// CREATE INTERVIEW
// POST /api/interviews
// =========================================================

router.post(
  "/",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = createInterviewSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: "Please check your interview preferences.",
          errors: validation.error.flatten(),
        });
        return;
      }

      const user = await User.findById(req.userId).select(
        "name email role targetRole"
      );

      if (!user) {
        res.status(401).json({
          success: false,
          message: "Your account could not be found. Please sign in again.",
        });
        return;
      }

      if (user.role !== "candidate") {
        res.status(403).json({
          success: false,
          message: "Only candidate accounts can create interviews.",
        });
        return;
      }

      const { targetRole, category, difficulty, duration } =
        validation.data;

      await seedDefaultQuestionBank();

      const generatedQuestions = await generateQuestionSet(
        category,
        difficulty,
        targetRole,
        category === "mixed" ? 5 : 4
      );

      if (!generatedQuestions.length) {
        res.status(500).json({
          success: false,
          message: "No interview questions could be generated.",
        });
        return;
      }

      const categoryCycle = [
        "technical",
        "behavioral",
        "hr",
        "situational",
        "coding",
      ] as const;

      // Preserve skills and expected concepts from the question bank.
      const questions = generatedQuestions.map((entry, index) => {
        const resolvedCategory =
          entry.category === "mixed"
            ? categoryCycle[index % categoryCycle.length]
            : entry.category;

        return {
          questionId: new mongoose.Types.ObjectId().toString(),
          questionText: entry.questionText,
          category: resolvedCategory as
            | "technical"
            | "behavioral"
            | "hr"
            | "situational"
            | "coding",
          order: index + 1,
          skills: entry.skills ?? [],
          expectedConcepts: entry.expectedConcepts ?? [],
        };
      });

      const interview = await Interview.create({
        candidateId: user._id,
        targetRole,
        category,
        difficulty,
        duration,
        questions,
        status: "pending",
      });

      res.status(201).json({
        success: true,
        message: "Interview session created successfully.",
        interview: {
          id: interview._id.toString(),
          targetRole: interview.targetRole,
          category: interview.category,
          difficulty: interview.difficulty,
          duration: interview.duration,
          status: interview.status,
          questions: interview.questions.map((question) => ({
            questionId: question.questionId,
            questionText: question.questionText,
            category: question.category,
            order: question.order,
            skills: question.skills ?? [],
            expectedConcepts: question.expectedConcepts ?? [],
          })),
          createdAt: interview.createdAt,
        },
      });
    } catch (error) {
      console.error("Create interview error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create an interview session.",
      });
    }
  }
);

// =========================================================
// QUESTION BANK PREVIEW
// GET /api/interviews/question-bank
// =========================================================

router.get(
  "/question-bank",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const query = questionBankPreviewSchema.safeParse(req.query);

      if (!query.success) {
        res.status(400).json({
          success: false,
          message: "Please provide a valid category and difficulty.",
          errors: query.error.flatten(),
        });
        return;
      }

      const user = await User.findById(req.userId).select("targetRole");

      const targetRole =
        query.data.targetRole?.trim() ||
        user?.targetRole?.trim() ||
        "product engineer";

      await seedDefaultQuestionBank();

      const questions = await generateQuestionSet(
        query.data.category,
        query.data.difficulty,
        targetRole,
        query.data.category === "mixed" ? 5 : 4
      );

      res.status(200).json({
        success: true,
        category: query.data.category,
        difficulty: query.data.difficulty,
        targetRole,
        questions: questions.map((question) => ({
          questionText: question.questionText,
          category: question.category,
          difficulty: question.difficulty,
          skills: question.skills,
          expectedConcepts: question.expectedConcepts,
          roleContext: question.roleContext,
        })),
      });
    } catch (error) {
      console.error("Get question bank preview error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to preview the question bank.",
      });
    }
  }
);

// =========================================================
// SAVE AN INTERVIEW ANSWER
// POST /api/interviews/:id/answers
// =========================================================

router.post(
  "/:id/answers",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviewId = req.params.id;

      if (!isValidInterviewId(interviewId)) {
        res.status(400).json({
          success: false,
          message: "Invalid interview ID.",
        });
        return;
      }

      const validation = submitAnswerSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: "Enter a valid answer before saving.",
          errors: validation.error.flatten(),
        });
        return;
      }

      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: req.userId,
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: "Interview not found.",
        });
        return;
      }

      if (
        interview.status === "completed" ||
        interview.status === "cancelled"
      ) {
        res.status(400).json({
          success: false,
          message: "This interview can no longer accept answers.",
        });
        return;
      }

      const { questionId, answer } = validation.data;

      const question = interview.questions.find(
        (item) => item.questionId === questionId
      );

      if (!question) {
        res.status(404).json({
          success: false,
          message: "Question not found in this interview.",
        });
        return;
      }

      question.answer = answer;
      question.answeredAt = new Date();

      if (interview.status === "pending") {
        interview.status = "in_progress";
        interview.startedAt = new Date();
      }

      await interview.save();

      res.status(200).json({
        success: true,
        message: "Answer saved successfully.",
        questionId: question.questionId,
        answeredAt: question.answeredAt,
        status: interview.status,
      });
    } catch (error) {
      console.error("Save interview answer error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to save your answer.",
      });
    }
  }
);

// =========================================================
// GET CANDIDATE INTERVIEW HISTORY
// GET /api/interviews/history
// =========================================================

router.get(
  "/history",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviews = await Interview.find({
        candidateId: req.userId,
      })
        .select(
          "targetRole category difficulty duration status questions createdAt startedAt completedAt evaluation"
        )
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        count: interviews.length,
        interviews: interviews.map((interview) => ({
          id: interview._id.toString(),
          targetRole: interview.targetRole,
          category: interview.category,
          difficulty: interview.difficulty,
          duration: interview.duration,
          status: interview.status,
          totalQuestions: interview.questions.length,
          answeredQuestions: getAnsweredQuestionCount(interview.questions),
          createdAt: interview.createdAt,
          startedAt: interview.startedAt ?? null,
          completedAt: interview.completedAt ?? null,
          evaluation: interview.evaluation ?? null,
        })),
      });
    } catch (error) {
      console.error("Get interview history error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve interview history.",
      });
    }
  }
);

// =========================================================
// GET INTERVIEW READINESS
// GET /api/interviews/readiness
// =========================================================

router.get(
  "/readiness",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviews = await Interview.find({
        candidateId: req.userId,
        status: "completed",
      })
        .select("status evaluation completedAt createdAt")
        .sort({ completedAt: -1 })
        .lean();

      const readiness = estimateInterviewReadiness(
        interviews as Array<{
          status: string;
          evaluation?: {
            percentage?: number;
            strengths?: string[];
            improvements?: string[];
          };
          completedAt?: Date;
          createdAt?: Date;
        }>
      );

      res.status(200).json({
        success: true,
        readiness,
      });
    } catch (error) {
      console.error("Get interview readiness error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to calculate your readiness estimate.",
      });
    }
  }
);

// =========================================================
// GET SKILL GAP SUMMARY
// GET /api/interviews/skill-gaps
// =========================================================

router.get(
  "/skill-gaps",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviews = await Interview.find({
        candidateId: req.userId,
        status: "completed",
      })
        .select("status questions evaluation")
        .sort({ completedAt: -1 })
        .lean();

      const skillGaps = summarizeSkillGaps(
        interviews as Array<{
          status: string;
          questions: Array<{
            questionId: string;
            category?: string;
          }>;
          evaluation?: {
            questionEvaluations: Array<{
              questionId: string;
              score: number;
              maxScore: number;
              strengths: string[];
              improvements: string[];
            }>;
          };
        }>
      );

      res.status(200).json({
        success: true,
        skillGaps,
      });
    } catch (error) {
      console.error("Get skill gap summary error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to calculate your skill gaps.",
      });
    }
  }
);


// =========================================================
// GET ADAPTIVE INTERVIEW DIFFICULTY
// GET /api/interviews/adaptive-difficulty
// =========================================================

router.get(
  "/adaptive-difficulty",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const recommendation = await recommendAdaptiveDifficulty(
        req.userId
      );

      res.status(200).json({
        success: true,
        message: "Adaptive difficulty recommendation generated.",
        recommendation,
      });
    } catch (error) {
      console.error("Adaptive difficulty error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to calculate adaptive difficulty.",
      });
    }
  }
);


// =========================================================
// GET A SINGLE INTERVIEW
// GET /api/interviews/:id
// =========================================================

router.get(
  "/:id",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviewId = req.params.id;

      if (!isValidInterviewId(interviewId)) {
        res.status(400).json({
          success: false,
          message: "Invalid interview ID.",
        });
        return;
      }

      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: req.userId,
      }).lean();

      if (!interview) {
        res.status(404).json({
          success: false,
          message: "Interview not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        interview: {
          id: interview._id.toString(),
          targetRole: interview.targetRole,
          category: interview.category,
          difficulty: interview.difficulty,
          duration: interview.duration,
          status: interview.status,
          questions: interview.questions.map((question) => ({
            questionId: question.questionId,
            questionText: question.questionText,
            category: question.category,
            order: question.order,
            skills: question.skills ?? [],
            expectedConcepts: question.expectedConcepts ?? [],
            answer: question.answer ?? "",
            answeredAt: question.answeredAt ?? null,
            answered: Boolean(question.answer?.trim()),
          })),
          createdAt: interview.createdAt,
          startedAt: interview.startedAt ?? null,
          completedAt: interview.completedAt ?? null,
          evaluation: interview.evaluation ?? null,
        },
      });
    } catch (error) {
      console.error("Get interview error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to retrieve this interview.",
      });
    }
  }
);

// =========================================================
// COMPLETE AN INTERVIEW
// POST /api/interviews/:id/complete
// =========================================================

router.post(
  "/:id/complete",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviewId = req.params.id;

      if (!isValidInterviewId(interviewId)) {
        res.status(400).json({
          success: false,
          message: "Invalid interview ID.",
        });
        return;
      }

      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: req.userId,
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: "Interview not found.",
        });
        return;
      }

      if (interview.status === "cancelled") {
        res.status(400).json({
          success: false,
          message: "A cancelled interview cannot be completed.",
        });
        return;
      }

      // If already completed, retry evaluation only when needed.
      if (interview.status === "completed") {
        if (!interview.evaluation) {
          await tryEvaluateInterview(interview);
        }

        res.status(200).json({
          success: true,
          message: "Interview completion status retrieved.",
          interviewId: interview._id.toString(),
          status: interview.status,
          completedAt: interview.completedAt,
          evaluation: interview.evaluation ?? null,
          evaluationPending: !interview.evaluation,
        });
        return;
      }

      const unansweredQuestions = interview.questions.filter(
        (question) => !question.answer?.trim()
      );

      if (unansweredQuestions.length > 0) {
        res.status(400).json({
          success: false,
          message: "Please answer all questions before completing the interview.",
          unansweredCount: unansweredQuestions.length,
        });
        return;
      }

      interview.status = "completed";
      interview.completedAt = new Date();

      await interview.save();

      const evaluation = await tryEvaluateInterview(interview);

      res.status(200).json({
        success: true,
        message: "Interview completed successfully.",
        interviewId: interview._id.toString(),
        status: interview.status,
        completedAt: interview.completedAt,
        totalQuestions: interview.questions.length,
        answeredQuestions: getAnsweredQuestionCount(interview.questions),
        evaluation,
        evaluationPending: !evaluation,
      });
    } catch (error) {
      console.error("Complete interview error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to complete the interview.",
      });
    }
  }
);

// =========================================================
// EVALUATE A COMPLETED INTERVIEW
// POST /api/interviews/:id/evaluate
// =========================================================

router.post(
  "/:id/evaluate",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviewId = req.params.id;

      if (!isValidInterviewId(interviewId)) {
        res.status(400).json({
          success: false,
          message: "Invalid interview ID.",
        });
        return;
      }

      const interview = await Interview.findOne({
        _id: interviewId,
        candidateId: req.userId,
      });

      if (!interview) {
        res.status(404).json({
          success: false,
          message: "Interview not found.",
        });
        return;
      }

      if (interview.status !== "completed") {
        res.status(400).json({
          success: false,
          message: "Complete your interview before requesting evaluation.",
        });
        return;
      }

      if (interview.evaluation) {
        res.status(200).json({
          success: true,
          message: "Interview evaluation retrieved successfully.",
          evaluation: interview.evaluation,
        });
        return;
      }

      const evaluation = await tryEvaluateInterview(interview);

      if (!evaluation) {
        res.status(500).json({
          success: false,
          message: "Interview evaluation failed. Please try again.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Interview evaluated successfully.",
        evaluation,
      });
    } catch (error) {
      console.error("Evaluate interview error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to evaluate this interview.";

      if (
        message ===
          "All interview questions must have saved answers before evaluation." ||
        message === "Only completed interviews can be evaluated." ||
        message === "This interview has no questions to evaluate."
      ) {
        res.status(400).json({
          success: false,
          message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Unable to evaluate this interview.",
      });
    }
  }
);

export default router;