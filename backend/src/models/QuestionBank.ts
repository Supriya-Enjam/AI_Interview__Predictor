import mongoose, { Schema, type Document, type Model } from "mongoose";

export type QuestionBankCategory =
  | "technical"
  | "behavioral"
  | "mixed"
  | "hr"
  | "situational"
  | "coding";

export type QuestionBankDifficulty = "beginner" | "intermediate" | "advanced";

export interface IQuestionBankItem extends Document {
  category: QuestionBankCategory;
  difficulty: QuestionBankDifficulty;
  questionText: string;
  skills: string[];
  expectedConcepts: string[];
  roleContext?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionBankItemSchema = new Schema<IQuestionBankItem>(
  {
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
    questionText: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.every((skill) => skill.trim().length > 0),
        message: "Skills must be non-empty strings.",
      },
    },
    expectedConcepts: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) =>
          value.every((concept) => concept.trim().length > 0),
        message: "Expected concepts must be non-empty strings.",
      },
    },
    roleContext: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

questionBankItemSchema.index({ category: 1, difficulty: 1 });

export const QuestionBankItem: Model<IQuestionBankItem> =
  (mongoose.models.QuestionBankItem as Model<IQuestionBankItem>) ||
  mongoose.model<IQuestionBankItem>("QuestionBankItem", questionBankItemSchema);
