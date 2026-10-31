
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import {
  extractResumeText,
  type ExtractedResume,
} from "../services/resumeService";

import { Interview } from "../models/Interview";

const router = Router();

// =========================================================
// TYPES
// =========================================================

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

type ResumeQuestionCategory = Exclude<
  ResumeInterviewCategory,
  "mixed"
>;

interface ResumeSkill {
  name: string;
  concepts: string[];
}

interface GeneratedResumeQuestion {
  questionText: string;
  category: ResumeQuestionCategory;
  skills: string[];
  expectedConcepts: string[];
}

interface ResumeSections {
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
}

// =========================================================
// FILE UPLOAD CONFIGURATION
// =========================================================

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

// =========================================================
// AUTHENTICATION
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

// =========================================================
// UPLOAD ERROR HANDLING
// =========================================================

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

// =========================================================
// RESUME EXTRACTION
// =========================================================

async function readResume(
  req: AuthenticatedRequest,
  res: Response
): Promise<ExtractedResume | null> {
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

  return extractResumeText(buffer, req.file.originalname);
}

// =========================================================
// RESUME SKILL DETECTION
// =========================================================

const resumeSkillLibrary: ResumeSkill[] = [
  {
    name: "React",
    concepts: ["components", "hooks", "props", "state management"],
  },
  {
    name: "Node.js",
    concepts: ["event loop", "asynchronous programming", "non-blocking I/O"],
  },
  {
    name: "TypeScript",
    concepts: ["static typing", "interfaces", "type safety"],
  },
  {
    name: "JavaScript",
    concepts: ["closures", "promises", "event loop", "ES6"],
  },
  {
    name: "Python",
    concepts: ["data structures", "functions", "object-oriented programming"],
  },
  {
    name: "Java",
    concepts: ["object-oriented programming", "collections", "exception handling"],
  },
  {
    name: "MongoDB",
    concepts: ["collections", "documents", "aggregation", "indexing"],
  },
  {
    name: "SQL",
    concepts: ["joins", "queries", "normalization", "indexing"],
  },
  {
    name: "Express",
    concepts: ["middleware", "routing", "REST APIs"],
  },
  {
    name: "AWS",
    concepts: ["cloud computing", "deployment", "scalability"],
  },
  {
    name: "Docker",
    concepts: ["containers", "images", "containerization"],
  },
  {
    name: "Linux",
    concepts: ["commands", "file permissions", "shell scripting", "process management"],
  },
  {
    name: "Git",
    concepts: ["version control", "branching", "merging"],
  },
  {
    name: "Machine Learning",
    concepts: ["model training", "features", "evaluation", "prediction"],
  },
  {
    name: "Data Analysis",
    concepts: ["data cleaning", "data visualization", "statistical analysis"],
  },
  {
    name: "REST API",
    concepts: ["HTTP methods", "status codes", "API design"],
  },
  {
    name: "HTML",
    concepts: ["semantic HTML", "forms", "document structure"],
  },
  {
    name: "CSS",
    concepts: ["flexbox", "grid", "responsive design"],
  },
];

function detectResumeSkills(text: string): ResumeSkill[] {
  const normalized = text.toLowerCase();

  return resumeSkillLibrary.filter((skill) => {
    const escaped = skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const pattern = new RegExp(
      `(^|[^a-z0-9])${escaped.toLowerCase()}([^a-z0-9]|$)`,
      "i"
    );

    return pattern.test(normalized);
  });
}

// =========================================================
// PROJECT INFORMATION DETECTION
// =========================================================

function extractProjectDetails(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  const projectPattern =
    /(?:projects?|developed|built|implemented|created)\s*[:\-]?\s*([^.!?]{15,180})/gi;

  const projects: string[] = [];

  let match: RegExpExecArray | null;

  while ((match = projectPattern.exec(normalized)) !== null) {
    const project = match[1].trim();

    if (project.length >= 15) {
      projects.push(project);
    }

    if (projects.length >= 3) {
      break;
    }
  }

  return [...new Set(projects)];
}

// =========================================================
// RESUME QUESTION GENERATION
// =========================================================

function generateResumeQuestions(
  text: string,
  category: ResumeInterviewCategory = "mixed"
): GeneratedResumeQuestion[] {
  const skills = detectResumeSkills(text);
  const projects = extractProjectDetails(text);

  const questions: GeneratedResumeQuestion[] = [];

  const addQuestion = (
    questionText: string,
    questionCategory: ResumeQuestionCategory,
    questionSkills: string[] = [],
    expectedConcepts: string[] = []
  ) => {
    questions.push({
      questionText,
      category: questionCategory,
      skills: questionSkills,
      expectedConcepts,
    });
  };

  if (category === "mixed" || category === "hr") {
    addQuestion(
      "Walk me through your resume and explain how your experience prepares you for this role.",
      "hr",
      [],
      ["career experience", "relevant skills", "career goals"]
    );
  }

  if (
    category === "mixed" ||
    category === "behavioral" ||
    category === "situational"
  ) {
    addQuestion(
      "Which project or achievement on your resume best demonstrates your problem-solving skills? Explain your contribution.",
      "behavioral",
      [],
      ["problem solving", "individual contribution", "project outcome"]
    );

    addQuestion(
      "Describe a challenging problem you encountered in a project listed on your resume and how you solved it.",
      "behavioral",
      [],
      ["challenge identification", "problem solving", "solution implementation"]
    );
  }

  if (
    category === "mixed" ||
    category === "technical" ||
    category === "coding"
  ) {
    for (const skill of skills.slice(0, 5)) {
      addQuestion(
        `Your resume mentions ${skill.name}. Explain how you have used it and describe a practical challenge you solved with it.`,
        category === "mixed" ? "technical" : category,
        [skill.name],
        skill.concepts
      );
    }
  }

  if (
    category === "mixed" ||
    category === "technical" ||
    category === "behavioral" ||
    category === "coding"
  ) {
    for (const project of projects.slice(0, 2)) {
      const projectSkills = skills
        .filter((skill) =>
          project.toLowerCase().includes(skill.name.toLowerCase())
        )
        .map((skill) => skill.name);

      addQuestion(
        `Your resume includes the experience "${project}". What was your specific contribution, what technical decisions did you make, and what was the result?`,
        category === "mixed" ? "technical" : category,
        projectSkills,
        [
          "project architecture",
          "individual contribution",
          "technical decisions",
          "project outcome",
        ]
      );
    }
  }

  if (
    category === "mixed" ||
    category === "hr" ||
    category === "behavioral"
  ) {
    addQuestion(
      "Which skill on your resume would you most like to improve, and what steps are you taking to develop it?",
      category === "mixed" ? "behavioral" : category,
      [],
      ["self-awareness", "continuous learning", "professional development"]
    );
  }

  if (questions.length === 0) {
    const fallbackCategory: ResumeQuestionCategory =
      category === "mixed" ? "technical" : category;

    addQuestion(
      "Explain the most important skills and experiences you have included in your resume.",
      fallbackCategory,
      [],
      ["relevant skills", "professional experience"]
    );

    addQuestion(
      "Describe a project or achievement that demonstrates your ability to learn and solve problems.",
      fallbackCategory,
      [],
      ["problem solving", "learning ability", "project experience"]
    );
  }

  const uniqueQuestions = [
    ...new Map(
      questions.map((question) => [
        question.questionText.toLowerCase(),
        question,
      ])
    ).values(),
  ];

  return uniqueQuestions.slice(0, 10);
}

// =========================================================
// RESUME ROLE REQUIREMENTS
// =========================================================

const roleSkillRequirements: Record<string, string[]> = {
  "frontend developer": [
    "HTML", "CSS", "JavaScript", "TypeScript", "React", "Git",
  ],
  "backend developer": [
    "JavaScript", "TypeScript", "Node.js", "Express",
    "MongoDB", "SQL", "REST API", "Git",
  ],
  "full stack developer": [
    "HTML", "CSS", "JavaScript", "TypeScript", "React",
    "Node.js", "Express", "MongoDB", "SQL", "REST API", "Git",
  ],
  "software engineer": [
    "Java", "Python", "JavaScript", "Data Analysis", "SQL", "Git",
  ],
  "data analyst": [
    "Python", "SQL", "Data Analysis", "Machine Learning",
  ],
  "machine learning engineer": [
    "Python", "Machine Learning", "Data Analysis", "SQL",
  ],
  "cloud engineer": [
    "AWS", "Docker", "Linux", "Python", "Git",
  ],
};

function getRoleSkills(targetRole: string): string[] {
  const normalizedRole = targetRole.toLowerCase().trim();

  const exactMatch = roleSkillRequirements[normalizedRole];

  if (exactMatch) {
    return exactMatch;
  }

  if (
    normalizedRole.includes("frontend") ||
    normalizedRole.includes("front end")
  ) {
    return roleSkillRequirements["frontend developer"];
  }

  if (
    normalizedRole.includes("backend") ||
    normalizedRole.includes("back end")
  ) {
    return roleSkillRequirements["backend developer"];
  }

  if (normalizedRole.includes("full stack")) {
    return roleSkillRequirements["full stack developer"];
  }

  if (normalizedRole.includes("data analyst")) {
    return roleSkillRequirements["data analyst"];
  }

  if (
    normalizedRole.includes("machine learning") ||
    normalizedRole.includes("ml engineer")
  ) {
    return roleSkillRequirements["machine learning engineer"];
  }

  if (
    normalizedRole.includes("cloud") ||
    normalizedRole.includes("devops")
  ) {
    return roleSkillRequirements["cloud engineer"];
  }

  return roleSkillRequirements["software engineer"];
}

// =========================================================
// RESUME SECTION EXTRACTION
// =========================================================

function extractResumeSections(text: string): ResumeSections {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result: ResumeSections = {
    education: [],
    experience: [],
    projects: [],
    certifications: [],
  };

  let currentSection: keyof ResumeSections | null = null;

  const sectionPatterns: Record<keyof ResumeSections, RegExp> = {
    education: /^(education|academic background|qualifications)$/i,
    experience:
      /^(experience|work experience|professional experience|employment history|internships?)$/i,
    projects: /^(projects|personal projects|academic projects|key projects)$/i,
    certifications: /^(certifications?|licenses|courses|training)$/i,
  };

  for (const line of lines) {
    const cleanedLine = line.replace(/[:\-]$/, "").trim();

    const heading = (
      Object.keys(sectionPatterns) as Array<keyof ResumeSections>
    ).find((section) => sectionPatterns[section].test(cleanedLine));

    if (heading) {
      currentSection = heading;
      continue;
    }

    if (
      /^(skills|technical skills|summary|profile|objective|achievements|awards|languages|interests)$/i.test(
        cleanedLine
      )
    ) {
      currentSection = null;
      continue;
    }

    if (currentSection && line.length >= 4) {
      result[currentSection].push(line);
    }
  }

  return {
    education: result.education.slice(0, 8),
    experience: result.experience.slice(0, 10),
    projects: result.projects.slice(0, 10),
    certifications: result.certifications.slice(0, 8),
  };
}

// =========================================================
// RESUME ANALYSIS
// =========================================================

function analyzeResume(text: string, targetRole: string) {
  const detectedSkills = detectResumeSkills(text);

  const detectedSkillNames = detectedSkills.map((skill) => skill.name);

  const requiredSkills = getRoleSkills(targetRole);

  const matchedSkills = requiredSkills.filter((required) =>
    detectedSkillNames.some(
      (detected) => detected.toLowerCase() === required.toLowerCase()
    )
  );

  const missingSkills = requiredSkills.filter(
    (required) => !matchedSkills.includes(required)
  );

  const projects = extractProjectDetails(text);
  const sections = extractResumeSections(text);

  const strengths: string[] = [];

  if (matchedSkills.length > 0) {
    strengths.push(
      `Your resume mentions ${matchedSkills.length} of the ${requiredSkills.length} skills selected for ${targetRole}.`
    );
  }

  if (projects.length > 0 || sections.projects.length > 0) {
    strengths.push("Your resume contains project-related information.");
  }

  if (sections.experience.length > 0) {
    strengths.push("Your resume contains a work experience section.");
  }

  if (sections.education.length > 0) {
    strengths.push("Your resume contains an education section.");
  }

  if (sections.certifications.length > 0) {
    strengths.push("Your resume contains certification or training information.");
  }

  if (strengths.length === 0) {
    strengths.push(
      "Your resume text was extracted successfully. Add clearly labelled skills, projects, and experience sections to improve analysis."
    );
  }

  const recommendations: string[] = missingSkills.map(
    (skill) =>
      `Consider learning or demonstrating ${skill} for the ${targetRole} role.`
  );

  if (projects.length === 0 && sections.projects.length === 0) {
    recommendations.push(
      "Add a clearly labelled Projects section with project descriptions, technologies, and your contributions."
    );
  }

  if (sections.experience.length === 0) {
    recommendations.push(
      "Add a clearly labelled Experience or Internship section if you have relevant experience."
    );
  }

  if (sections.education.length === 0) {
    recommendations.push(
      "Add an Education section with your qualification and institution."
    );
  }

  if (sections.certifications.length === 0) {
    recommendations.push(
      "Include relevant certifications or completed technical training, if available."
    );
  }

  // Rule-based score, not a trained ML prediction.
  // 70% skill coverage + 20% project evidence + 10% experience evidence.

  const skillScore =
    requiredSkills.length > 0
      ? (matchedSkills.length / requiredSkills.length) * 70
      : 0;

  const projectScore =
    projects.length > 0 || sections.projects.length > 0 ? 20 : 0;

  const experienceScore =
    sections.experience.length > 0 ? 10 : 0;

  const readinessScore = Math.round(
    Math.min(100, skillScore + projectScore + experienceScore)
  );

  return {
    targetRole,
    readinessScore,
    scoreBreakdown: {
      roleSkillCoverage: Math.round(skillScore),
      projectEvidence: projectScore,
      experienceEvidence: experienceScore,
    },
    detectedSkills: detectedSkills.map((skill) => ({
      name: skill.name,
      relatedConcepts: skill.concepts,
    })),
    matchedSkills,
    missingSkills,
    strengths,
    recommendations,
    projects,
    sections,
    analysisMethod: "Rule-based resume analysis",
  };
}

// =========================================================
// VALIDATION OPTIONS
// =========================================================

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

// =========================================================
// POST /api/resumes/analysis
// ANALYZE RESUME AGAINST TARGET ROLE
// =========================================================

router.post(
  "/analysis",
  authenticateRequest,
  handleResumeUpload,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const targetRole =
        typeof req.body.targetRole === "string"
          ? req.body.targetRole.trim()
          : "";

      if (targetRole.length < 2 || targetRole.length > 100) {
        res.status(400).json({
          success: false,
          message: "Enter a job role between 2 and 100 characters.",
        });
        return;
      }

      const extracted = await readResume(req, res);

      if (!extracted) {
        return;
      }

      const analysis = analyzeResume(extracted.text, targetRole);

      res.status(200).json({
        success: true,
        message: "Resume analysis completed successfully.",
        data: {
          fileType: extracted.fileType,
          characterCount: extracted.characterCount,
          analysis,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to analyze this resume.",
      });
    }
  }
);

// =========================================================
// POST /api/resumes/questions
// PREVIEW RESUME-BASED QUESTIONS
// =========================================================

router.post(
  "/questions",
  authenticateRequest,
  handleResumeUpload,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const extracted = await readResume(req, res);

      if (!extracted) {
        return;
      }

      const generatedQuestions = generateResumeQuestions(
        extracted.text,
        "mixed"
      );

      res.status(200).json({
        success: true,
        message: "Resume processed and interview questions generated.",
        data: {
          fileType: extracted.fileType,
          characterCount: extracted.characterCount,
          questions: generatedQuestions.map(
            (question) => question.questionText
          ),
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

// =========================================================
// POST /api/resumes/interviews
// CREATE RESUME-BASED INTERVIEW
// =========================================================

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

      if (
        !validDifficulties.includes(
          difficulty as ResumeInterviewDifficulty
        )
      ) {
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

      const extracted = await readResume(req, res);

      if (!extracted) {
        return;
      }

      const generatedQuestions = generateResumeQuestions(
        extracted.text,
        category as ResumeInterviewCategory
      );

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

        questions: generatedQuestions.map((question, index) => ({
          questionId: new mongoose.Types.ObjectId().toString(),
          questionText: question.questionText,
          category: question.category,
          skills: question.skills,
          expectedConcepts: question.expectedConcepts,
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
