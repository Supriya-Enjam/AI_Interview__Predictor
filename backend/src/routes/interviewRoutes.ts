
import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { Interview } from "../models/Interview";

import { User } from "../models/User";
import { evaluateCompletedInterview } from "../services/interviewEvaluationService";
import { estimateInterviewReadiness } from "../services/interviewReadinessService";
import { summarizeSkillGaps } from "../services/skillGapService";
import { generateQuestionSet, seedDefaultQuestionBank } from "../services/questionBankService";


const router = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const createInterviewSchema = z.object({
  targetRole: z.string().trim().min(2).max(100),
  category: z.enum([
    "technical",
    "behavioral",
    "mixed",
    "hr",
    "situational",
    "coding",
  ]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
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
  category: z.enum([
    "technical",
    "behavioral",
    "mixed",
    "hr",
    "situational",
    "coding",
  ]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  targetRole: z.string().trim().min(2).max(100).optional(),
});

const questionBank = {
  technical: {
    beginner: [
      "Explain the difference between a variable and a constant.",
      "What is the purpose of a function in programming?",
      "Explain the difference between an array and an object.",
      "How would you validate user input before submitting it to a backend service?",
    ],
    intermediate: [
      "Explain how you would debug a performance issue in an application.",
      "What is the difference between synchronous and asynchronous programming?",
      "How would you design a REST API for a simple user management system?",
      "Describe a scenario where caching would improve an application and how you would evaluate the trade-offs.",
    ],
    advanced: [
      "How would you design a scalable system that handles millions of requests?",
      "Explain the trade-offs between SQL and NoSQL databases for a distributed application.",
      "How would you investigate a race condition in a production system?",
      "Describe how you would design a fault-tolerant job-processing pipeline in a cloud environment.",
    ],
  },
  behavioral: {
    beginner: [
      "Tell me about yourself and your career goals.",
      "Describe a time you learned something new.",
      "How do you organize your work when you have several tasks?",
      "Tell me about a time you solved a problem without direct instructions.",
    ],
    intermediate: [
      "Describe a challenging problem you solved and the steps you took.",
      "Tell me about a time you received constructive feedback.",
      "Describe how you handled a disagreement with a teammate.",
      "Give an example of a project where you influenced a decision without formal authority.",
    ],
    advanced: [
      "Describe a difficult decision you made with incomplete information.",
      "Tell me about a time you influenced a team through a challenging change.",
      "Describe a project failure and what you changed afterward.",
      "Share a time when you had to balance stakeholder priorities with delivery constraints.",
    ],
  },
  hr: {
    beginner: [
      "Why are you interested in this role and how does it fit your long-term goals?",
      "Describe a strength you bring to a team and how you have used it recently.",
      "What motivates you to keep learning and improve as a professional?",
    ],
    intermediate: [
      "How do you manage priorities when you are asked to do multiple things at once?",
      "What does good teamwork look like to you in a fast-moving environment?",
      "How do you handle conflict in a professional setting while maintaining respect?",
    ],
    advanced: [
      "How would you evaluate whether a role is a good fit for your long-term career trajectory?",
      "Describe a time you had to align personal goals with organizational priorities.",
      "How do you think about professional growth when you are balancing delivery pressure and learning?",
    ],
  },
  situational: {
    beginner: [
      "A teammate misses a deadline because they are overwhelmed. How would you respond?",
      "You receive conflicting instructions from two stakeholders. What do you do?",
      "A user reports a bug that is blocking their work. How would you investigate and communicate?",
    ],
    intermediate: [
      "Your team must deliver a feature with incomplete requirements. How do you reduce risk and keep momentum?",
      "You notice a teammate is struggling with a task that affects the team timeline. What do you do?",
      "A project is falling behind schedule, and the client asks for a commitment you may not be able to meet. How would you respond?",
    ],
    advanced: [
      "A major change is proposed late in a delivery cycle. How would you assess the impact and communicate trade-offs?",
      "You discover a risk that could affect product reliability but no immediate fix is available. What is your approach?",
      "A team decides to move faster, but quality checks are being bypassed. How would you handle it?",
    ],
  },
  coding: {
    beginner: [
      "Write pseudocode to check whether a number is prime and explain the logic.",
      "Describe how you would reverse a string and why the approach works.",
      "How would you approach writing a function to find the largest number in an array?",
    ],
    intermediate: [
      "How would you implement a queue using an array and explain its trade-offs?",
      "Explain how you would detect duplicates in a list while minimizing complexity.",
      "Design a function to flatten a nested list and discuss edge cases.",
    ],
    advanced: [
      "Describe how you would design a rate-limited API that handles burst traffic safely.",
      "How would you optimize a recursive algorithm that is hitting stack limits or performance issues?",
      "Explain how you would design a consistent and testable distributed cache invalidation strategy.",
    ],
  },
};

function createQuestions(
  category: "technical" | "behavioral" | "mixed" | "hr" | "situational" | "coding",
  difficulty: "beginner" | "intermediate" | "advanced",
  targetRole: string
) {
  const technical = questionBank.technical[difficulty];
  const behavioral = questionBank.behavioral[difficulty];
  const hr = questionBank.hr[difficulty];
  const situational = questionBank.situational[difficulty];
  const coding = questionBank.coding[difficulty];

  const selectedByCategory = {
    technical,
    behavioral,
    hr,
    situational,
    coding,
    mixed: [
      technical[0],
      behavioral[0],
      hr[0],
      situational[0],
      coding[0],
    ],
  };

  const selected = selectedByCategory[category] ?? technical;

  return selected.map((questionText, index) => {
    let questionCategory: "technical" | "behavioral" | "hr" | "situational" | "coding";

    if (category === "behavioral") {
      questionCategory = "behavioral";
    } else if (category === "hr") {
      questionCategory = "hr";
    } else if (category === "situational") {
      questionCategory = "situational";
    } else if (category === "coding") {
      questionCategory = "coding";
    } else if (category === "mixed") {
      const cycle = ["technical", "behavioral", "hr", "situational", "coding"] as const;
      questionCategory = cycle[index % cycle.length];
    } else {
      questionCategory = "technical";
    }

    const normalizedText =
      category === "behavioral" || category === "hr" || category === "situational" || category === "coding"
        ? questionText
        : questionCategory === "behavioral" || questionCategory === "situational" || questionCategory === "hr" || questionCategory === "coding"
          ? questionText
          : `${questionText} Consider your experience with ${targetRole}.`;

    return {
      questionId: new mongoose.Types.ObjectId().toString(),
      questionText: normalizedText,
      category: questionCategory,
      order: index + 1,
    };
  });
}

function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: () => void
) {
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

      const questions = generatedQuestions.map((entry, index) => {
        const cycle = ["technical", "behavioral", "hr", "situational", "coding"] as const;
        const resolvedCategory =
          entry.category === "mixed"
            ? cycle[index % cycle.length]
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
// SAVE AN INTERVIEW ANSWER
// POST /api/interviews/:id/answers
// =========================================================

router.post(
  "/:id/answers",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviewId = req.params.id;

      if (
        typeof interviewId !== "string" ||
        !mongoose.isValidObjectId(interviewId)
      ) {
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
          message: "Enter an answer before saving.",
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
        query.data.targetRole?.trim() || user?.targetRole?.trim() || "product engineer";

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
          answeredQuestions: interview.questions.filter(
            (question) => Boolean(question.answer?.trim())
          ).length,
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
          questions: Array<{ questionId: string; category?: string }>;
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


router.get(
  "/:id",
  authenticateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviewId = req.params.id;

      if (
        typeof interviewId !== "string" ||
        !mongoose.isValidObjectId(interviewId)
      ) {
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
            answer: question.answer ?? "",
            answeredAt: question.answeredAt ?? null,
            answered: Boolean(question.answer?.trim()),
          })),
          createdAt: interview.createdAt,
          startedAt: interview.startedAt,
          completedAt: interview.completedAt,
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

      if (
        typeof interviewId !== "string" ||
        !mongoose.isValidObjectId(interviewId)
      ) {
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

      if (interview.status === "completed") {
        res.status(200).json({
          success: true,
          message: "This interview has already been completed.",
          interviewId: interview._id.toString(),
          status: interview.status,
          completedAt: interview.completedAt,
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

      res.status(200).json({
        success: true,
        message: "Interview completed successfully.",
        interviewId: interview._id.toString(),
        status: interview.status,
        completedAt: interview.completedAt,
        totalQuestions: interview.questions.length,
        answeredQuestions: interview.questions.filter(
          (question) => Boolean(question.answer?.trim())
        ).length,
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

      if (
        typeof interviewId !== "string" ||
        !mongoose.isValidObjectId(interviewId)
      ) {
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

      // Reuse the saved evaluation instead of recalculating it.
      if (interview.evaluation) {
        res.status(200).json({
          success: true,
          message: "Interview evaluation retrieved successfully.",
          evaluation: interview.evaluation,
        });
        return;
      }

      const evaluation = evaluateCompletedInterview(interview);

      interview.evaluation = evaluation;
      await interview.save();

      res.status(200).json({
        success: true,
        message: "Interview evaluated successfully.",
        evaluation: interview.evaluation,
      });
    } catch (error) {
      console.error("Evaluate interview error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to evaluate this interview.";

      if (
        message === "All interview questions must have saved answers before evaluation." ||
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
