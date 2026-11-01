
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";

import { Interview } from "../models/Interview";
import { QuestionBankItem } from "../models/QuestionBank";
import { User } from "../models/User";
import { Dataset } from "../models/Dataset";

const router = Router();

// =========================================================
// DATASET UPLOAD CONFIGURATION
// =========================================================

const datasetUploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "datasets"
);

const datasetStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, datasetUploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const datasetUpload = multer({
  storage: datasetStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension !== ".csv" && extension !== ".json") {
      callback(new Error("Only CSV and JSON files are allowed."));
      return;
    }

    callback(null, true);
  },
});

// =========================================================
// ADMIN AUTHENTICATION
// =========================================================

function requireAdmin(
  req: Request,
  res: Response,
  next: () => void
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  const token = authorization.slice(7).trim();
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    res.status(401).json({
      success: false,
      message: "Invalid authentication.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
      return;
    }

    void User.findById(decoded.sub)
      .then((user) => {
        if (!user || user.role !== "admin") {
          res.status(403).json({
            success: false,
            message: "Admin access required.",
          });
          return;
        }

        next();
      })
      .catch((error) => {
        console.error("Admin auth check failed:", error);

        res.status(500).json({
          success: false,
          message: "Unable to validate admin access.",
        });
      });
  } catch {
    res.status(401).json({
      success: false,
      message: "Your session is invalid or expired.",
    });
  }
}

// =========================================================
// QUESTION BANK VALIDATION
// =========================================================

const adminQuestionSchema = z.object({
  category: z.enum([
    "technical",
    "behavioral",
    "mixed",
    "hr",
    "situational",
    "coding",
  ]),
  difficulty: z.enum([
    "beginner",
    "intermediate",
    "advanced",
  ]),
  questionText: z.string().trim().min(10).max(2000),
  skills: z
    .array(z.string().trim().min(1).max(100))
    .max(10)
    .default([]),
  expectedConcepts: z
    .array(z.string().trim().min(1).max(100))
    .max(10)
    .default([]),
  roleContext: z.string().trim().max(200).optional(),
});

const adminQuestionQuerySchema = z.object({
  category: z.enum([
    "technical",
    "behavioral",
    "mixed",
    "hr",
    "situational",
    "coding",
    "all",
  ]).optional(),
  difficulty: z.enum([
    "beginner",
    "intermediate",
    "advanced",
    "all",
  ]).optional(),
  search: z.string().trim().max(120).optional(),
});

// =========================================================
// ADMIN QUESTION BANK
// =========================================================

router.get(
  "/questions",
  requireAdmin,
  async (req: Request, res: Response) => {
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

        if (search) {
          const escapedSearch = search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

          filter.$or = [
            {
              questionText: {
                $regex: escapedSearch,
                $options: "i",
              },
            },
            {
              skills: {
                $regex: escapedSearch,
                $options: "i",
              },
            },
            {
              expectedConcepts: {
                $regex: escapedSearch,
                $options: "i",
              },
            },
            {
              roleContext: {
                $regex: escapedSearch,
                $options: "i",
              },
            },
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

      res.status(500).json({
        success: false,
        message: "Unable to load the question bank.",
      });
    }
  }
);

router.get(
  "/questions/stats",
  requireAdmin,
  async (_req, res) => {
    try {
      const categoryCounts = await QuestionBankItem.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            count: -1,
            _id: 1,
          },
        },
      ]);

      const difficultyCounts = await QuestionBankItem.aggregate([
        {
          $group: {
            _id: "$difficulty",
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            count: -1,
            _id: 1,
          },
        },
      ]);

      const totalQuestions =
        await QuestionBankItem.countDocuments();

      res.status(200).json({
        success: true,
        stats: {
          totalQuestions,
          byCategory: Object.fromEntries(
            categoryCounts.map((entry) => [
              String(entry._id),
              Number(entry.count),
            ])
          ),
          byDifficulty: Object.fromEntries(
            difficultyCounts.map((entry) => [
              String(entry._id),
              Number(entry.count),
            ])
          ),
        },
      });
    } catch (error) {
      console.error("Admin question-bank stats error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load question-bank statistics.",
      });
    }
  }
);

router.get(
  "/questions/export",
  requireAdmin,
  async (_req, res) => {
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

      res.status(500).json({
        success: false,
        message: "Unable to export the question bank.",
      });
    }
  }
);

router.post(
  "/questions",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = adminQuestionSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message:
            "Please provide a valid question, category, and difficulty.",
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

      res.status(500).json({
        success: false,
        message: "Unable to save the question.",
      });
    }
  }
);

router.patch(
  "/questions/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id || !/^[a-f\d]{24}$/i.test(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid question ID.",
        });
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

      const updated = await QuestionBankItem.findByIdAndUpdate(
        id,
        parsed.data,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: "Question not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Question updated.",
        question: updated,
      });
    } catch (error) {
      console.error("Admin question update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update the question.",
      });
    }
  }
);

router.delete(
  "/questions/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id || !/^[a-f\d]{24}$/i.test(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid question ID.",
        });
        return;
      }

      const deleted = await QuestionBankItem.findByIdAndDelete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Question not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Question removed from the bank.",
        questionId: id,
      });
    } catch (error) {
      console.error("Admin question delete error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to remove the question.",
      });
    }
  }
);

// =========================================================
// ADMIN CANDIDATE MANAGEMENT
// =========================================================

router.get(
  "/candidates",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(
        1,
        Number(req.query.page) || 1
      );

      const limit = Math.min(
        50,
        Math.max(1, Number(req.query.limit) || 10)
      );

      const search = String(req.query.search || "").trim();

      const filter: Record<string, unknown> = {
        role: "candidate",
      };

      if (search) {
        const escapedSearch = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        filter.$or = [
          {
            name: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            email: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            targetRole: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
        ];
      }

      const totalCandidates =
        await User.countDocuments(filter);

      const candidates = await User.find(filter)
        .select("name email targetRole createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const candidateIds = candidates.map(
        (candidate) => candidate._id
      );

      const interviewStats = await Interview.aggregate([
        {
          $match: {
            candidateId: {
              $in: candidateIds,
            },
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
            totalInterviews: {
              $sum: 1,
            },
            completedInterviews: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "completed"] },
                  1,
                  0,
                ],
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
        interviewStats.map((item) => [
          String(item._id),
          item,
        ])
      );

      const candidateResults = candidates.map(
        (candidate) => {
          const stats = statsByCandidate.get(
            String(candidate._id)
          );

          return {
            id: String(candidate._id),
            name: candidate.name,
            email: candidate.email,
            targetRole:
              candidate.targetRole || "Not specified",
            registeredAt: candidate.createdAt,
            totalInterviews:
              stats?.totalInterviews ?? 0,
            completedInterviews:
              stats?.completedInterviews ?? 0,
            latestInterview:
              stats?.latestInterview ?? null,
          };
        }
      );

      res.status(200).json({
        success: true,
        candidates: candidateResults,
        pagination: {
          page,
          limit,
          totalCandidates,
          totalPages: Math.ceil(
            totalCandidates / limit
          ),
        },
      });
    } catch (error) {
      console.error(
        "Admin candidate management error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to load candidate information.",
      });
    }
  }
);

// =========================================================
// ADMIN INTERVIEW MANAGEMENT
// =========================================================

const adminInterviewQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum([
    "pending",
    "in_progress",
    "completed",
    "cancelled",
    "all",
  ]).optional(),
  category: z.enum([
    "technical",
    "behavioral",
    "mixed",
    "hr",
    "situational",
    "coding",
    "all",
  ]).optional(),
  difficulty: z.enum([
    "beginner",
    "intermediate",
    "advanced",
    "all",
  ]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

router.get(
  "/interviews",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = adminInterviewQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Invalid interview filters.",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const {
        search,
        status,
        category,
        difficulty,
        page,
        limit,
      } = parsed.data;

      const filter: Record<string, unknown> = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (category && category !== "all") {
        filter.category = category;
      }

      if (difficulty && difficulty !== "all") {
        filter.difficulty = difficulty;
      }

      if (search) {
        const escapedSearch = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const matchingCandidates = await User.find({
          role: "candidate",
          $or: [
            { name: { $regex: escapedSearch, $options: "i" } },
            { email: { $regex: escapedSearch, $options: "i" } },
          ],
        })
          .select("_id")
          .lean();

        const candidateIds = matchingCandidates.map(
          (candidate) => candidate._id
        );

        const searchConditions: Record<string, unknown>[] = [
          {
            targetRole: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
        ];

        if (candidateIds.length > 0) {
          searchConditions.push({
            candidateId: { $in: candidateIds },
          });
        }

        filter.$or = searchConditions;
      }

      const [interviews, totalInterviews, statusCounts] =
        await Promise.all([
          Interview.find(filter)
            .populate("candidateId", "name email targetRole")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),

          Interview.countDocuments(filter),

          Interview.aggregate([
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]),
        ]);

      const interviewResults = interviews.map((interview) => {
        const candidate = interview.candidateId as unknown as {
          _id: { toString(): string };
          name?: string;
          email?: string;
          targetRole?: string;
        } | null;

        return {
          id: String(interview._id),
          candidate: candidate
            ? {
                id: candidate._id.toString(),
                name: candidate.name ?? "Unknown candidate",
                email: candidate.email ?? "",
                targetRole: candidate.targetRole ?? "Not specified",
              }
            : null,
          targetRole: interview.targetRole,
          category: interview.category,
          difficulty: interview.difficulty,
          duration: interview.duration,
          status: interview.status,
          questionCount: interview.questions.length,
          answeredQuestionCount: interview.questions.filter(
            (question) => Boolean(question.answer?.trim())
          ).length,
          overallScore: interview.evaluation?.overallScore ?? null,
          maxScore: interview.evaluation?.maxScore ?? null,
          percentage: interview.evaluation?.percentage ?? null,
          evaluationSummary: interview.evaluation?.summary ?? null,
          createdAt: interview.createdAt,
          startedAt: interview.startedAt ?? null,
          completedAt: interview.completedAt ?? null,
        };
      });

      const counts = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };

      for (const item of statusCounts) {
        if (item._id in counts) {
          counts[item._id as keyof typeof counts] = Number(item.count);
        }
      }

      res.status(200).json({
        success: true,
        interviews: interviewResults,
        stats: {
          totalInterviews: await Interview.countDocuments(),
          pendingInterviews: counts.pending,
          inProgressInterviews: counts.in_progress,
          completedInterviews: counts.completed,
          cancelledInterviews: counts.cancelled,
        },
        pagination: {
          page,
          limit,
          totalInterviews,
          totalPages: Math.ceil(totalInterviews / limit),
        },
      });
    } catch (error) {
      console.error("Admin interview management error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load interview records.",
      });
    }
  }
);

// =========================================================
// ADMIN DATASET MANAGEMENT
// =========================================================

const datasetQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["active", "inactive", "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const datasetStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

// Upload a dataset
router.post(
  "/datasets",
  requireAdmin,
  (req: Request, res: Response, next) => {
    datasetUpload.single("file")(req, res, (error) => {
      if (error) {
        res.status(400).json({
          success: false,
          message:
            error instanceof multer.MulterError
              ? error.code === "LIMIT_FILE_SIZE"
                ? "File size must not exceed 5 MB."
                : error.message
              : error.message,
        });
        return;
      }

      next();
    });
  },
  async (req: Request, res: Response) => {
    let uploadedPath: string | undefined;

    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Please select a CSV or JSON file.",
        });
        return;
      }

      uploadedPath = req.file.path;

      const name = String(req.body.name || "").trim();
      const description = String(
        req.body.description || ""
      ).trim();

      if (!name || name.length > 120) {
        res.status(400).json({
          success: false,
          message:
            "Dataset name is required and must not exceed 120 characters.",
        });
        await fs.unlink(uploadedPath).catch(() => undefined);
        return;
      }

      if (description.length > 500) {
        res.status(400).json({
          success: false,
          message:
            "Description must not exceed 500 characters.",
        });
        await fs.unlink(uploadedPath).catch(() => undefined);
        return;
      }

      const extension = path
        .extname(req.file.originalname)
        .toLowerCase();

      const fileType = extension === ".csv" ? "csv" : "json";

      const fileContents = await fs.readFile(
        uploadedPath,
        "utf8"
      );

      let recordCount = 0;

      if (fileType === "csv") {
        const records = parse(fileContents, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
        });

        recordCount = records.length;
      } else {
        const parsedJson: unknown = JSON.parse(fileContents);

        if (!Array.isArray(parsedJson)) {
          throw new Error(
            "JSON dataset must contain an array of records."
          );
        }

        if (
          !parsedJson.every(
            (record) =>
              record !== null &&
              typeof record === "object" &&
              !Array.isArray(record)
          )
        ) {
          throw new Error(
            "Every JSON dataset record must be an object."
          );
        }

        recordCount = parsedJson.length;
      }

      const authorization = req.headers.authorization;
      const token = authorization?.slice(7).trim();
      const secret = process.env.JWT_SECRET;

      if (!token || !secret) {
        throw new Error(
          "Unable to identify the uploading administrator."
        );
      }

      const decoded = jwt.verify(token, secret);

      if (
        typeof decoded === "string" ||
        typeof decoded.sub !== "string"
      ) {
        throw new Error("Invalid administrator token.");
      }

      const dataset = await Dataset.create({
        name,
        description,
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        filePath: uploadedPath,
        fileType,
        recordCount,
        status: "active",
        uploadedBy: decoded.sub,
      });

      res.status(201).json({
        success: true,
        message: "Dataset uploaded successfully.",
        dataset: {
          id: dataset._id,
          name: dataset.name,
          description: dataset.description,
          originalFileName: dataset.originalFileName,
          fileType: dataset.fileType,
          recordCount: dataset.recordCount,
          status: dataset.status,
          createdAt: dataset.createdAt,
        },
      });
    } catch (error) {
      if (uploadedPath) {
        await fs.unlink(uploadedPath).catch(
          () => undefined
        );
      }

      console.error("Dataset upload failed:", error);

      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload dataset.",
      });
    }
  }
);

// Get datasets with search and pagination
router.get(
  "/datasets",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = datasetQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Invalid dataset filters.",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const { search, status, page, limit } = parsed.data;

      const filter: Record<string, unknown> = {};

      if (status && status !== "all") {
        filter.status = status;
      }

      if (search) {
        const escapedSearch = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        filter.$or = [
          {
            name: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            description: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            originalFileName: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
        ];
      }

      const [datasets, totalDatasets, activeDatasets, inactiveDatasets] =
        await Promise.all([
          Dataset.find(filter)
            .select("-filePath -storedFileName")
            .populate("uploadedBy", "name email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),

          Dataset.countDocuments(filter),
          Dataset.countDocuments({ status: "active" }),
          Dataset.countDocuments({ status: "inactive" }),
        ]);

      res.status(200).json({
        success: true,
        datasets: datasets.map((dataset) => ({
          id: String(dataset._id),
          name: dataset.name,
          description: dataset.description,
          originalFileName: dataset.originalFileName,
          fileType: dataset.fileType,
          recordCount: dataset.recordCount,
          status: dataset.status,
          uploadedBy: dataset.uploadedBy,
          createdAt: dataset.createdAt,
          updatedAt: dataset.updatedAt,
        })),
        stats: {
          totalDatasets: await Dataset.countDocuments(),
          activeDatasets,
          inactiveDatasets,
          totalRecords: await Dataset.aggregate([
            {
              $group: {
                _id: null,
                total: { $sum: "$recordCount" },
              },
            },
          ]).then((result) => result[0]?.total ?? 0),
        },
        pagination: {
          page,
          limit,
          totalDatasets,
          totalPages: Math.ceil(totalDatasets / limit),
        },
      });
    } catch (error) {
      console.error("Admin dataset fetch error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load datasets.",
      });
    }
  }
);

// Activate or deactivate a dataset
router.patch(
  "/datasets/:id/status",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id || !/^[a-f\d]{24}$/i.test(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid dataset ID.",
        });
        return;
      }

      const parsed = datasetStatusSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Status must be active or inactive.",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const updated = await Dataset.findByIdAndUpdate(
        id,
        { status: parsed.data.status },
        {
          new: true,
          runValidators: true,
        }
      ).select("-filePath -storedFileName");

      if (!updated) {
        res.status(404).json({
          success: false,
          message: "Dataset not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Dataset ${updated.status === "active" ? "activated" : "deactivated"} successfully.`,
        dataset: {
          id: String(updated._id),
          name: updated.name,
          status: updated.status,
        },
      });
    } catch (error) {
      console.error("Dataset status update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update dataset status.",
      });
    }
  }
);

// Delete a dataset and its stored file
router.delete(
  "/datasets/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id || !/^[a-f\d]{24}$/i.test(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid dataset ID.",
        });
        return;
      }

      const dataset = await Dataset.findById(id);

      if (!dataset) {
        res.status(404).json({
          success: false,
          message: "Dataset not found.",
        });
        return;
      }

      // Only remove files stored inside the dataset upload directory.
      const resolvedPath = path.resolve(dataset.filePath);
      const relativePath = path.relative(
        datasetUploadDirectory,
        resolvedPath
      );

      const isInsideUploadDirectory =
        relativePath !== "" &&
        !relativePath.startsWith("..") &&
        !path.isAbsolute(relativePath);

      if (!isInsideUploadDirectory) {
        res.status(500).json({
          success: false,
          message: "Dataset file path is invalid. File was not deleted.",
        });
        return;
      }

      await fs.unlink(resolvedPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });

      await Dataset.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Dataset deleted successfully.",
        datasetId: id,
      });
    } catch (error) {
      console.error("Dataset deletion error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to delete dataset.",
      });
    }
  }
);

// =========================================================
// ADMIN MODEL MONITORING
// =========================================================

router.get(
  "/model/monitoring",
  requireAdmin,
  async (_req: Request, res: Response) => {
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
        Interview.countDocuments({
          status: "completed",
        }),
        Interview.countDocuments({
          evaluation: { $exists: true },
        }),
        User.countDocuments({
          role: "candidate",
        }),

        Interview.aggregate([
          {
            $match: {
              "evaluation.questionEvaluations.0": {
                $exists: true,
              },
            },
          },
          {
            $unwind: "$evaluation.questionEvaluations",
          },
          {
            $group: {
              _id: null,
              completeness: {
                $avg:
                  "$evaluation.questionEvaluations.rubric.completeness",
              },
              structure: {
                $avg:
                  "$evaluation.questionEvaluations.rubric.structure",
              },
              specificity: {
                $avg:
                  "$evaluation.questionEvaluations.rubric.specificity",
              },
              relevance: {
                $avg:
                  "$evaluation.questionEvaluations.rubric.relevance",
              },
              communication: {
                $avg:
                  "$evaluation.questionEvaluations.rubric.communication",
              },
              averageScore: {
                $avg: "$evaluation.questionEvaluations.score",
              },
              maximumScore: {
                $avg: "$evaluation.questionEvaluations.maxScore",
              },
              evaluatedAnswers: {
                $sum: 1,
              },
            },
          },
        ]),

        Interview.aggregate([
          {
            $match: {
              evaluation: { $exists: true },
            },
          },
          {
            $group: {
              _id: "$evaluation.evaluationMethod",
              count: { $sum: 1 },
            },
          },
        ]),

        Interview.find({
          evaluation: { $exists: true },
        })
          .select(
            "targetRole category difficulty evaluation.percentage evaluation.evaluatedAt"
          )
          .sort({
            "evaluation.evaluatedAt": -1,
          })
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
            averageAnswerScore: Number(
              averages.averageScore.toFixed(2)
            ),
            averageMaximumScore: Number(
              averages.maximumScore.toFixed(2)
            ),
            rubricAverages: {
              completeness: Number(
                averages.completeness.toFixed(2)
              ),
              structure: Number(
                averages.structure.toFixed(2)
              ),
              specificity: Number(
                averages.specificity.toFixed(2)
              ),
              relevance: Number(
                averages.relevance.toFixed(2)
              ),
              communication: Number(
                averages.communication.toFixed(2)
              ),
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
  }
);

export default router;
