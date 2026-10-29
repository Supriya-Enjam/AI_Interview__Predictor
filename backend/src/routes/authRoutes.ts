
import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { z } from "zod";

import { User } from "../models/User";
import { LoginOtp } from "../models/LoginOtp";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { sendEmail } from "../config/email";
import { OAuth2Client } from "google-auth-library";

const router = Router();
const googleClient = new OAuth2Client();

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});

const verifyOtpSchema = z.object({
  challengeId: z.string().regex(/^[a-f\d]{24}$/i),
  otp: z.string().regex(/^\d{6}$/),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
  token: z.string().regex(/^[a-f\d]{64}$/i),
  password: z.string().min(8).max(72),
});

// =====================================================
// HELPERS
// =====================================================

function createToken(userId: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  return jwt.sign({ sub: userId }, secret, {
    expiresIn: "1h",
  });
}

function publicUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  targetRole?: string;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    targetRole: user.targetRole ?? "",
  };
}

const passwordResetMessage =
  "If an account exists for that email, password reset instructions will be sent.";

// =====================================================
// REGISTER
// POST /api/auth/register
// =====================================================

router.post(
  "/register",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = registerSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Please check your registration details.",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const name = parsed.data.name;
      const email = parsed.data.email.toLowerCase();
      const password = parsed.data.password;

      const existingUser = await User.findOne({ email }).lean();

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: "An account with this email already exists.",
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "candidate",
      });

      const token = createToken(String(user._id));

      res.status(201).json({
        success: true,
        message: "Registration successful.",
        token,
        user: publicUser(user),
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        res.status(409).json({
          success: false,
          message: "An account with this email already exists.",
        });
        return;
      }

      console.error("Registration error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to register right now.",
      });
    }
  }
);

// =====================================================
// LOGIN — STEP 1: VERIFY PASSWORD AND SEND OTP
// POST /api/auth/login
// =====================================================

router.post(
  "/login",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Please enter a valid email and password.",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const email = parsed.data.email.toLowerCase();
      const password = parsed.data.password;

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
        return;
      }

      const passwordMatches = await bcrypt.compare(
        password,
        user.password
      );

      if (!passwordMatches) {
        res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
        return;
      }

      const otp = String(randomInt(100000, 1000000));
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await LoginOtp.deleteOne({ userId: user._id });

      const otpRecord = await LoginOtp.create({
        userId: user._id,
        otpHash,
        expiresAt,
        attempts: 0,
      });

      try {
        await sendEmail({
          to: user.email,
          subject: "Your InterviewIQ login verification code",
          text:
            `Hello ${user.name},\n\n` +
            `Your InterviewIQ login verification code is: ${otp}\n\n` +
            "This code expires in 5 minutes. If you did not attempt to log in, you can ignore this email.",
          html:
            `<p>Hello ${user.name},</p>` +
            "<p>Your InterviewIQ login verification code is:</p>" +
            `<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>` +
            "<p>This code expires in 5 minutes. If you did not attempt to log in, you can ignore this email.</p>",
        });
      } catch (emailError: unknown) {
        await LoginOtp.deleteOne({ _id: otpRecord._id });

        console.error("Login OTP email delivery failed:", emailError);

        res.status(503).json({
          success: false,
          message:
            "We couldn't send the verification email. Please try again later.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        requiresOtp: true,
        challengeId: String(otpRecord._id),
        message: "A verification code has been sent to your email.",
      });
    } catch (error: unknown) {
      console.error("Login error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to log in right now.",
      });
    }
  }
);

// =====================================================
// LOGIN — STEP 2: VERIFY OTP
// POST /api/auth/verify-otp
// =====================================================

router.post(
  "/verify-otp",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Enter a valid verification code.",
        });
        return;
      }

      const { challengeId, otp } = parsed.data;

      const otpRecord = await LoginOtp.findById(challengeId)
        .select("+otpHash");

      if (!otpRecord) {
        res.status(400).json({
          success: false,
          message:
            "The verification code is invalid or expired. Please log in again.",
        });
        return;
      }

      if (otpRecord.expiresAt.getTime() <= Date.now()) {
        await LoginOtp.deleteOne({ _id: otpRecord._id });

        res.status(400).json({
          success: false,
          message: "The verification code has expired. Please log in again.",
        });
        return;
      }

      if (otpRecord.attempts >= 5) {
        await LoginOtp.deleteOne({ _id: otpRecord._id });

        res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Please log in again.",
        });
        return;
      }

      const otpMatches = await bcrypt.compare(
        otp,
        otpRecord.otpHash
      );

      if (!otpMatches) {
        otpRecord.attempts += 1;

        if (otpRecord.attempts >= 5) {
          await LoginOtp.deleteOne({ _id: otpRecord._id });

          res.status(429).json({
            success: false,
            message: "Too many incorrect attempts. Please log in again.",
          });
          return;
        }

        await otpRecord.save();

        res.status(400).json({
          success: false,
          message: "Incorrect verification code.",
          attemptsRemaining: 5 - otpRecord.attempts,
        });
        return;
      }

      const deletion = await LoginOtp.deleteOne({
        _id: otpRecord._id,
      });

      if (deletion.deletedCount !== 1) {
        res.status(400).json({
          success: false,
          message:
            "The verification code is no longer valid. Please log in again.",
        });
        return;
      }

      const user = await User.findById(otpRecord.userId);

      if (!user) {
        res.status(401).json({
          success: false,
          message: "Unable to complete login. Please try again.",
        });
        return;
      }

      const token = createToken(String(user._id));

      res.status(200).json({
        success: true,
        message: "Login successful.",
        token,
        user: publicUser(user),
      });
    } catch (error: unknown) {
      console.error("OTP verification error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to verify the code right now.",
      });
    }
  }
);

// =====================================================
// FORGOT PASSWORD — SEND RESET LINK
// POST /api/auth/forgot-password
// =====================================================

router.post(
  "/forgot-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Enter a valid email address.",
        });
        return;
      }

      const email = parsed.data.email.toLowerCase();
      const user = await User.findOne({ email });

      // Do not reveal whether the email belongs to an account.
      if (!user) {
        res.status(200).json({
          success: true,
          message: passwordResetMessage,
        });
        return;
      }

      const resetBaseUrl = process.env.PASSWORD_RESET_URL;

      if (!resetBaseUrl) {
        throw new Error("PASSWORD_RESET_URL is not configured.");
      }

      const resetUrl = new URL(resetBaseUrl);

      if (!["http:", "https:"].includes(resetUrl.protocol)) {
        throw new Error("PASSWORD_RESET_URL must use HTTP or HTTPS.");
      }

      // Invalidate earlier reset links for this user.
      await PasswordResetToken.deleteMany({ userId: user._id });

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256")
        .update(rawToken)
        .digest("hex");

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        expiresAt,
      });

      resetUrl.searchParams.set("token", rawToken);
      resetUrl.searchParams.set("email", email);

      try {
        await sendEmail({
          to: email,
          subject: "Reset your InterviewIQ password",
          text:
            `Hello ${user.name},\n\n` +
            "We received a request to reset your InterviewIQ password.\n\n" +
            `Open this link to choose a new password: ${resetUrl.toString()}\n\n` +
            "This link expires in 15 minutes and can only be used once. " +
            "If you did not request a reset, you can ignore this email.",
          html:
            "<p>Hello,</p>" +
            "<p>We received a request to reset your InterviewIQ password.</p>" +
            `<p><a href="${resetUrl.toString()}">Reset your password</a></p>` +
            "<p>This link expires in 15 minutes and can only be used once. " +
            "If you did not request a reset, you can ignore this email.</p>",
        });
      } catch (emailError: unknown) {
        await PasswordResetToken.deleteMany({ userId: user._id });
        throw emailError;
      }

      res.status(200).json({
        success: true,
        message: passwordResetMessage,
      });
    } catch (error: unknown) {
      console.error("Forgot-password error:", error);

      res.status(503).json({
        success: false,
        message:
          "Unable to process your request right now. Please try again later.",
      });
    }
  }
);

// =====================================================
// RESET PASSWORD — VALIDATE TOKEN AND SAVE NEW PASSWORD
// POST /api/auth/reset-password
// =====================================================

router.post(
  "/reset-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message:
            "Provide a valid email, reset token, and password of 8–72 characters.",
        });
        return;
      }

      const { email, token, password } = parsed.data;

      const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

      const resetRecord = await PasswordResetToken.findOne({
        tokenHash,
      }).select("+tokenHash");

      if (!resetRecord) {
        res.status(400).json({
          success: false,
          message:
            "This reset link is invalid or has expired. Request a new one.",
        });
        return;
      }

      if (resetRecord.expiresAt.getTime() <= Date.now()) {
        await PasswordResetToken.deleteOne({
          _id: resetRecord._id,
        });

        res.status(400).json({
          success: false,
          message:
            "This reset link is invalid or has expired. Request a new one.",
        });
        return;
      }

      const user = await User.findOne({
        _id: resetRecord.userId,
        email: email.toLowerCase(),
      });

      if (!user) {
        res.status(400).json({
          success: false,
          message:
            "This reset link is invalid or has expired. Request a new one.",
        });
        return;
      }

      user.password = await bcrypt.hash(password, 12);
      await user.save();

      // Consume all reset links and pending OTPs for this user.
      await PasswordResetToken.deleteMany({ userId: user._id });
      await LoginOtp.deleteMany({ userId: user._id });

      res.status(200).json({
        success: true,
        message:
          "Your password has been reset. You can now sign in with your new password.",
      });
    } catch (error: unknown) {
      console.error("Reset-password error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to reset your password right now. Please try again.",
      });
    }
  }
);

// =====================================================
// GOOGLE SIGN-IN
// POST /api/auth/google
// =====================================================

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

router.post(
  "/google",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = googleLoginSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "A valid Google credential is required.",
        });
        return;
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;

      if (!clientId) {
        console.error("GOOGLE_CLIENT_ID is not configured.");

        res.status(503).json({
          success: false,
          message: "Google sign-in is not configured.",
        });
        return;
      }

      // Verify the Google ID token and its intended audience.
      const ticket = await googleClient.verifyIdToken({
        idToken: parsed.data.idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();

      if (
        !payload ||
        !payload.email ||
        payload.email_verified !== true
      ) {
        res.status(401).json({
          success: false,
          message: "Your Google account email could not be verified.",
        });
        return;
      }

      const email = payload.email.toLowerCase();
      const name =
        payload.name?.trim() || email.split("@")[0] || "Candidate";

      // Reuse an account if this verified email already exists.
      let user = await User.findOne({ email });

      if (!user) {
        // The account still requires a password in the current User model.
        // Generate a random, undisclosed password for Google-created users.
        const randomPassword = randomBytes(32).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        try {
          user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "candidate",
          });
        } catch (createError: unknown) {
          // Handle two simultaneous sign-ins for the same new email.
          if (
            typeof createError === "object" &&
            createError !== null &&
            "code" in createError &&
            createError.code === 11000
          ) {
            user = await User.findOne({ email });
          } else {
            throw createError;
          }
        }
      }

      if (!user) {
        res.status(500).json({
          success: false,
          message: "Unable to complete Google sign-in.",
        });
        return;
      }

      // Preserve existing roles and targetRole for existing accounts.
      const token = createToken(String(user._id));

      res.status(200).json({
        success: true,
        message: "Google sign-in successful.",
        token,
        user: publicUser(user),
      });
    } catch (error: unknown) {
      console.error(
        "Google sign-in verification failed:",
        error instanceof Error ? error.message : "Unknown error"
      );

      res.status(401).json({
        success: false,
        message: "Google sign-in failed. Please try again.",
      });
    }
  }
);


function getAuthenticatedUserId(req: Request): string | null {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string"
    ) {
      return null;
    }

    return decoded.sub;
  } catch {
    return null;
  }
}

// GET /api/auth/me
// Retrieve the profile of the authenticated user.
router.get(
  "/me",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required. Please log in again.",
        });
        return;
      }

      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User profile not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Profile retrieved successfully.",
        user: publicUser(user),
      });
    } catch (error: unknown) {
      console.error(
        "Get profile error:",
        error instanceof Error ? error.message : "Unknown error"
      );

      res.status(500).json({
        success: false,
        message: "Unable to retrieve your profile.",
      });
    }
  }
);

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  targetRole: z.string().trim().max(100),
});

// PATCH /api/auth/me
// Update the authenticated user's profile.
router.patch(
  "/me",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required. Please log in again.",
        });
        return;
      }

      const parsed = updateProfileSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message:
            "Name must contain 2–80 characters and target role must not exceed 100 characters.",
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        {
          name: parsed.data.name,
          targetRole: parsed.data.targetRole,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User profile not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        user: publicUser(user),
      });
    } catch (error: unknown) {
      console.error(
        "Update profile error:",
        error instanceof Error ? error.message : "Unknown error"
      );

      res.status(500).json({
        success: false,
        message: "Unable to update your profile.",
      });
    }
  }
);


export default router;
