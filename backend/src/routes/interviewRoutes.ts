import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { predictInterviewPerformance } from "../services/mlPredictionService";

import { Interview } from "../models/Interview";
import { User } from "../models/User";
import { authenticate } from "../middleware/authenticate";
import { evaluateCompletedInterview } from "../services/interviewEvaluationService";
import { estimateInterviewReadiness } from "../services/interviewReadinessService";
import { summarizeSkillGaps } from "../services/skillGapService";

import { generateRoleSkills } from "../services/roleSkillService";
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
    // Step 1: Perform the existing rubric evaluation.
    const evaluation = evaluateCompletedInterview(interview);

    // Step 2: Prepare ML features from the actual rubric scores.
    const questionEvaluations = evaluation.questionEvaluations;
    const questionCount = questionEvaluations.length;

    if (questionCount > 0) {
      const averageRubricScore = (
        dimension: keyof (typeof questionEvaluations)[number]["rubric"],
        maximum: number
      ): number => {
        const total = questionEvaluations.reduce(
          (sum, question) => sum + question.rubric[dimension],
          0
        );

        return Math.round(
          (total / questionCount / maximum) * 100
        );
      };

      const features = {
        completeness_score: averageRubricScore("completeness", 4),
        structure_score: averageRubricScore("structure", 3),
        specificity_score: averageRubricScore("specificity", 3),
        relevance_score: averageRubricScore("relevance", 5),
        communication_score: averageRubricScore("communication", 5),
      };

      // Step 3: Request an experimental ML prediction.
      try {
        const prediction =
          await predictInterviewPerformance(features);

        if (prediction.success) {
          evaluation.mlPrediction = {
            predictedScore: prediction.predicted_score,
            predictionType: prediction.prediction_type,
            notice: prediction.notice,
            predictedAt: new Date(),
            featureSource: "rubric",
          };
        }
      } catch (mlError) {
        console.error(
          "ML prediction unavailable. Continuing with rubric evaluation:",
          mlError
        );
      }
    }

    // Step 4: Save the evaluation, even if ML prediction failed.
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
  authenticate,
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
  authenticate,
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
  authenticate,
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
  authenticate,
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
// GET ML PREDICTION ACCURACY
// GET /api/interviews/ml-accuracy
// =========================================================

// GET ML MODEL TRAINING INFORMATION
router.get(
  "/ml-model-info",
  authenticate,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const mlServiceUrl =
        process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

      const response = await fetch(
        `${mlServiceUrl}/model-info`,
        {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        res.status(response.status).json({
          success: false,
          message: `ML service error: ${errorText}`,
        });
        return;
      }

      const modelInfo = await response.json();

      res.status(200).json(modelInfo);
    } catch (error) {
      console.error("ML model information error:", error);

      res.status(503).json({
        success: false,
        message: "Unable to retrieve ML model information.",
      });
    }
  }
);

router.get(
  "/ml-accuracy",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const interviews = await Interview.find({
        candidateId: req.userId,
        status: "completed",
      })
        .select("evaluation.percentage evaluation.mlPrediction.predictedScore")
        .lean();

      const validPredictions = interviews
        .map((interview) => {
          const actualScore = interview.evaluation?.percentage;
          const predictedScore =
            interview.evaluation?.mlPrediction?.predictedScore;

          if (
            typeof actualScore !== "number" ||
            !Number.isFinite(actualScore) ||
            typeof predictedScore !== "number" ||
            !Number.isFinite(predictedScore)
          ) {
            return null;
          }

          return { actualScore, predictedScore };
        })
        .filter(
          (
            item
          ): item is {
            actualScore: number;
            predictedScore: number;
          } => item !== null
        );

      const predictionCount = validPredictions.length;

      if (predictionCount === 0) {
        res.status(200).json({
          success: true,
          accuracy: {
            predictionCount: 0,
            averagePredictedScore: null,
            averageActualScore: null,
            meanAbsoluteError: null,
            scoreAgreement: null,
            message: "Complete interviews with ML predictions to see accuracy statistics.",
          },
        });
        return;
      }

      const average = (values: number[]) =>
        values.reduce((sum, value) => sum + value, 0) /
        values.length;

      const averagePredictedScore = average(
        validPredictions.map((item) => item.predictedScore)
      );

      const averageActualScore = average(
        validPredictions.map((item) => item.actualScore)
      );

      const meanAbsoluteError = average(
        validPredictions.map((item) =>
          Math.abs(item.predictedScore - item.actualScore)
        )
      );

      const scoreAgreement = Math.max(
        0,
        100 - meanAbsoluteError
      );

      res.status(200).json({
        success: true,
        accuracy: {
          predictionCount,
          averagePredictedScore: Number(
            averagePredictedScore.toFixed(2)
          ),
          averageActualScore: Number(
            averageActualScore.toFixed(2)
          ),
          meanAbsoluteError: Number(
            meanAbsoluteError.toFixed(2)
          ),
          scoreAgreement: Number(scoreAgreement.toFixed(2)),
          message:
            "Score agreement measures how closely ML predictions match rubric evaluation scores. It is not a measure of hiring success.",
        },
      });
    } catch (error) {
      console.error("ML prediction accuracy error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to calculate ML prediction accuracy.",
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
  authenticate,
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
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // 1. Get the candidate's current target role.
      const user = await User.findById(req.userId).select("targetRole");

      if (!user) {
        res.status(404).json({
          success: false,
          message: "Candidate account not found.",
        });
        return;
      }

      const targetRole = user.targetRole?.trim();

      if (!targetRole) {
        res.status(400).json({
          success: false,
          message: "Please update your target role before generating a learning plan.",
        });
        return;
      }

      // 2. Retrieve completed interview assessments.
      const interviews = await Interview.find({
        candidateId: req.userId,
        status: "completed",
      })
        .select("status questions evaluation")
        .sort({ completedAt: -1 })
        .lean();

      // 3. Calculate previously assessed skills.
      const assessedSkills = summarizeSkillGaps(
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

      // 4. Generate role-specific skills using Gemini.
      const roleSkills = await generateRoleSkills(targetRole);

      // 5. Match role requirements with assessment evidence.
      const normalize = (value: string) =>
        value.toLowerCase().replace(/[^a-z0-9]/g, "");

      const roleSpecificSkillGaps = roleSkills.map((requiredSkill) => {
        const assessedSkill = assessedSkills.find(
          (item) =>
            normalize(item.skill) === normalize(requiredSkill.skill)
        );

        if (assessedSkill) {
          return {
            ...assessedSkill,
            skill: requiredSkill.skill,
            category: requiredSkill.category,
            importance: requiredSkill.importance,
            description: requiredSkill.description,
            recommendedPractice: [
              ...new Set([
                ...assessedSkill.recommendedPractice,
                ...requiredSkill.learningTopics,
              ]),
            ].slice(0, 4),
            assessed: true,
          };
        }

        // No assessment evidence means Not assessed, not Needs work.
        return {
          skill: requiredSkill.skill,
          category: requiredSkill.category,
          importance: requiredSkill.importance,
          description: requiredSkill.description,
          assessments: 0,
          averageScore: 0,
          readiness: "Not assessed" as const,
          strongAreas: [],
          weakAreas: [],
          recommendedPractice: requiredSkill.learningTopics,
          assessed: false,
        };
      });

      // 6. Sort by importance, then assessment score.
      const importanceOrder: Record<string, number> = {
        High: 0,
        Medium: 1,
        Low: 2,
      };

      roleSpecificSkillGaps.sort((a, b) => {
        const importanceDifference =
          importanceOrder[a.importance] -
          importanceOrder[b.importance];

        if (importanceDifference !== 0) {
          return importanceDifference;
        }

        return a.averageScore - b.averageScore;
      });

      // 7. Return dynamic learning recommendations.
      res.status(200).json({
        success: true,
        targetRole,
        skillGaps: roleSpecificSkillGaps,
        roleSkills,
        roleSkillsGenerated: true,
        totalRequiredSkills: roleSkills.length,
        assessedSkills: roleSpecificSkillGaps.filter(
          (skill) => skill.assessed
        ).length,
        unassessedSkills: roleSpecificSkillGaps.filter(
          (skill) => !skill.assessed
        ).length,
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
  authenticate,
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
  authenticate,
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
  authenticate,
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

      // Count answered and skipped questions.
const answeredQuestions = getAnsweredQuestionCount(
  interview.questions
);

const skippedQuestions =
  interview.questions.length - answeredQuestions;

// Require at least one answer before submission.
if (answeredQuestions === 0) {
  res.status(400).json({
    success: false,
    message:
      "Please answer at least one question before submitting the interview.",
    totalQuestions: interview.questions.length,
    answeredQuestions,
    skippedQuestions,
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
        skippedQuestions,
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
  authenticate,
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
    "At least one question must be answered before evaluation." ||
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