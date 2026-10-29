
import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ILearningProgress extends Document {
  userId: Types.ObjectId;
  completedTopics: string[];
  createdAt: Date;
  updatedAt: Date;
}

const learningProgressSchema = new Schema<ILearningProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    completedTopics: {
      type: [String],
      default: [],
      validate: {
        validator: (topics: string[]) =>
          topics.length <= 100 &&
          topics.every(
            (topic) =>
              typeof topic === "string" &&
              topic.length > 0 &&
              topic.length <= 200
          ),
        message: "Completed topics must contain at most 100 valid topic IDs.",
      },
    },
  },
  {
    timestamps: true,
  }
);

export const LearningProgress = mongoose.model<ILearningProgress>(
  "LearningProgress",
  learningProgressSchema
);
