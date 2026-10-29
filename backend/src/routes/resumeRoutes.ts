
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { extractResumeText } from "../services/resumeService";
import { Interview } from "../models/Interview";

const router = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

type ResumeInterviewCategory =
  | "technical"
  | "behavioral"
  | "mixed"
  | "hr"
  | "situational"
  | "coding";

type ResumeInterviewDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.toLowerCase().split(".").pop();

    const valid =
      (extension === "pdf" && file.mimetype === "application/pdf") ||
      (extension === "docx" &&
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    if (!valid) {
      callback(new Error("Upload a valid PDF or DOCX resume."));
      return;
    }

    callback(null, true);
  },
});

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

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      success: false,
      message: "Authentication configuration is missing.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(authorization.slice(7), secret);

    if (
      typeof decoded !== "object" ||
      !decoded.sub ||
      typeof decoded.sub !== "string" ||
      !mongoose.isValidObjectId(decoded.sub)
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token. Please log in again.",
      });
      return;
    }

    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
}

function handleResumeUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  upload.single("resume")(req, res, (error: unknown) => {
    if (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Resume upload failed.",
      });
      return;
    }

    next();
  });
}

async function readResume(
  req: AuthenticatedRequest,
  res: Response
): Promise<string | null> {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: "Please select a PDF or DOCX resume.",
    });
    return null;
  }

  const buffer = req.file.buffer;
  const extension = req.file.originalname.toLowerCase().split(".").pop();

  const isPdf =
    extension === "pdf" &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-";

  const isDocx =
    extension === "docx" &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    [0x03, 0x05, 0x07].includes(buffer[2]) &&
    [0x04, 0x06, 0x08].includes(buffer[3]);

  if (!isPdf && !isDocx) {
    res.status(400).json({
      success: false,
      message: "The file content does not match a valid PDF or DOCX file.",
    });
    return null;
  }

  const extracted = await extractResumeText(
    buffer,
    req.file.originalname
  );

  return extracted.text;
}

function generateResumeQuestions(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  const technologyKeywords = [
    "React",
    "Node.js",
    "TypeScript",
    "JavaScript",
    "Python",
    "Java",
    "MongoDB",
    "SQL",
    "Express",
    "AWS",
    "Docker",
    "Git",
    "machine learning",
    "data analysis",
    "REST API",
    "HTML",
    "CSS",
  ];

  const foundTechnologies = technologyKeywords.filter((technology) =>
    normalized.toLowerCase().includes(technology.toLowerCase())
  );

  const questions: string[] = [
    "Walk me through your resume and explain how your experience prepares you for this role.",
    "Which project or achievement on your resume best demonstrates your problem-solving skills? Explain your contribution.",
    "Describe a challenging problem you encountered in a project listed on your resume and how you solved it.",
  ];

  for (const technology of foundTechnologies.slice(0, 5)) {
    questions.push(
      `Your resume mentions ${technology}. Explain how you have used it and describe a practical challenge you solved with it.`
    );
  }

  const projectMatch = normalized.match(
    /(?:projects?|developed|built|implemented|created)\s*[:\-]?\s*([^.!?]{15,180})/i
  );

  if (projectMatch?.[1]) {
    questions.push(
      `Your resume includes the experience "${projectMatch[1].trim()}". What was your specific contribution, and how did you measure the result?`
    );
  }

  questions.push(
    "Which skill on your resume would you most like to improve, and what steps are you taking to develop it?"
  );

  return [...new Set(questions)].slice(0, 10);
}

const validCategories: ResumeInterviewCategory[] = [
  "technical",
  "behavioral",
  "mixed",
  "hr",
  "situational",
  "coding",
];

const validDifficulties: ResumeInterviewDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

// Existing endpoint: generate questions without creating an interview.
router.post(
  "/questions",
  authenticateRequest,
  handleResumeUpload,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const text = await readResume(req, res);
      if (text === null) return;

      const extracted = await extractResumeText(
        req.file!.buffer,
        req.file!.originalname
      );

      res.status(200).json({
        success: true,
        message: "Resume processed and interview questions generated.",
        data: {
          fileType: extracted.fileType,
          characterCount: extracted.characterCount,
          questions: generateResumeQuestions(text),
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to process this resume.",
      });
    }
  }
);

// New endpoint: generate resume questions and save a real interview session.
router.post(
  "/interviews",
  authenticateRequest,
  handleResumeUpload,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const targetRole =
        typeof req.body.targetRole === "string"
          ? req.body.targetRole.trim()
          : "";

      const category =
        typeof req.body.category === "string" ? req.body.category : "";

      const difficulty =
        typeof req.body.difficulty === "string" ? req.body.difficulty : "";

      const duration = Number(req.body.duration);

      if (targetRole.length < 2 || targetRole.length > 100) {
        res.status(400).json({
          success: false,
          message: "Enter a job role between 2 and 100 characters.",
        });
        return;
      }

      if (!validCategories.includes(category as ResumeInterviewCategory)) {
        res.status(400).json({
          success: false,
          message: "Select a valid interview category.",
        });
        return;
      }

      if (!validDifficulties.includes(
        difficulty as ResumeInterviewDifficulty
      )) {
        res.status(400).json({
          success: false,
          message: "Select a valid interview difficulty.",
        });
        return;
      }

      if (![10, 15, 30, 45].includes(duration)) {
        res.status(400).json({
          success: false,
          message: "Choose a duration of 10, 15, 30, or 45 minutes.",
        });
        return;
      }

      const text = await readResume(req, res);
      if (text === null) return;

      const generatedQuestions = generateResumeQuestions(text);

      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required. Please log in again.",
        });
        return;
      }

      const interview = await Interview.create({
        candidateId: new mongoose.Types.ObjectId(req.userId),
        targetRole,
        category: category as ResumeInterviewCategory,
        difficulty: difficulty as ResumeInterviewDifficulty,
        duration,
        questions: generatedQuestions.map((questionText, index) => ({
          questionId: new mongoose.Types.ObjectId().toString(),
          questionText,
          category:
            category === "mixed"
              ? index % 2 === 0
                ? "technical"
                : "behavioral"
              : category,
          order: index + 1,
        })),
        status: "pending",
      });

      res.status(201).json({
        success: true,
        message: "Resume-based interview created successfully.",
        data: {
          interview: {
            id: interview._id.toString(),
            targetRole: interview.targetRole,
            category: interview.category,
            difficulty: interview.difficulty,
            duration: interview.duration,
            questions: interview.questions,
            status: interview.status,
            createdAt: interview.createdAt,
          },
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create the resume-based interview.",
      });
    }
  }
);

export default router;
