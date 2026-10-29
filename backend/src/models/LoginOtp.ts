
import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ILoginOtp extends Document {
  userId: Types.ObjectId;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const loginOtpSchema = new Schema<ILoginOtp>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const LoginOtp = mongoose.model<ILoginOtp>(
  "LoginOtp",
  loginOtpSchema
);
