
import mongoose, { Schema, type Document } from "mongoose";

export type DatasetFileType = "csv" | "json";
export type DatasetStatus = "active" | "inactive";

export interface IDataset extends Document {
  name: string;
  description: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  fileType: DatasetFileType;
  recordCount: number;
  status: DatasetStatus;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const datasetSchema = new Schema<IDataset>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    storedFileName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["csv", "json"],
      required: true,
    },
    recordCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Dataset =
  mongoose.models.Dataset ||
  mongoose.model<IDataset>("Dataset", datasetSchema);
