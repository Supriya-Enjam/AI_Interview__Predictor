
import mongoose, { Schema, type Document, type Model } from "mongoose";

export type InterviewCategory =
  | "technical"
  | "behavioral"
  | "mixed"
  | "hr"
  | "situational"
  | "coding";

export type InterviewDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export type InterviewStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export type InterviewQuestionCategory =
  | "technical"
  | "behavioral"
  | "hr"
  | "situational"
  | "coding";

export interface InterviewQuestion {
  questionId: string;
  questionText: string;
  category: InterviewQuestionCategory;
  order: number;
  skills?: string[];
  expectedConcepts?: string[];
  answer?: string;
  answeredAt?: Date;
}

export interface AnswerRubric {
  completeness: number;
  structure: number;
  specificity: number;
  relevance: number;
  communication: number;
  total: number;
}

export interface QuestionEvaluation {
  questionId: string;
  score: number;
  maxScore: number;
  rubric: AnswerRubric;
  feedback: string;
  strengths: string[];
  improvements: string[];
  matchedConcepts: string[];
  missingConcepts: string[];
  conceptCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordCoverage: number;
}

export interface InterviewEvaluation {
  overallScore: number;
  maxScore: number;
  percentage: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  questionEvaluations: QuestionEvaluation[];
  evaluatedAt: Date;
  evaluationMethod: "rubric";
}

export interface IInterview extends Document {
  candidateId: mongoose.Types.ObjectId;
  targetRole: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  duration: number;
  questions: InterviewQuestion[];
  status: InterviewStatus;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  evaluation?: InterviewEvaluation;
  updatedAt: Date;
}

const InterviewQuestionSchema = new Schema<InterviewQuestion>(
  {
    questionId: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["technical", "behavioral", "hr", "situational", "coding"],
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    skills: {
      type: [String],
      default: [],
    },
    expectedConcepts: {
      type: [String],
      default: [],
    },
    answer: {
      type: String,
      default: undefined,
    },
    answeredAt: {
      type: Date,
      default: undefined,
    },
  },
  { _id: false }
);

const QuestionEvaluationSchema = new Schema<QuestionEvaluation>(
  {
    questionId: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1,
    },

    rubric: {
  completeness: {
    type: Number,
    required: true,
    min: 0,
    max: 4,
  },
  structure: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  specificity: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  relevance: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },
  communication: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
    max: 20,
  },
},
    feedback: {
      type: String,
      required: true,
      trim: true,
    },
    strengths: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    matchedConcepts: {
      type: [String],
      default: [],
    },
    missingConcepts: {
      type: [String],
      default: [],
    },
    conceptCoverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
        matchedKeywords: {
      type: [String],
      default: [],
    },
    missingKeywords: {
      type: [String],
      default: [],
    },
    keywordCoverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const InterviewEvaluationSchema = new Schema<InterviewEvaluation>(
  {
    overallScore: {
      type: Number,
      required: true,
      min: 0,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    strengths: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    questionEvaluations: {
      type: [QuestionEvaluationSchema],
      default: [],
    },
    evaluatedAt: {
      type: Date,
      required: true,
    },
    evaluationMethod: {
      type: String,
      enum: ["rubric"],
      required: true,
    },
  },
  { _id: false }
);

const InterviewSchema = new Schema<IInterview>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    category: {
      type: String,
      enum: ["technical", "behavioral", "mixed", "hr", "situational", "coding"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    duration: {
      type: Number,
      enum: [10, 15, 30, 45],
      required: true,
    },
    questions: {
      type: [InterviewQuestionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    evaluation: {
      type: InterviewEvaluationSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

InterviewSchema.index({ candidateId: 1, createdAt: -1 });

export const Interview: Model<IInterview> =
  (mongoose.models.Interview as Model<IInterview>) ||
  mongoose.model<IInterview>("Interview", InterviewSchema);
