
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate";

import {
  generateChatbotReply,
  type ChatHistoryMessage,
} from "../services/geminiService";

const router = Router();

// =====================================================
// CHATBOT REQUEST VALIDATION
// =====================================================

const chatbotSchema = z.object({
  message: z.string().trim().min(1).max(2000),

  history: z
    .array(
      z.object({
        role: z.enum(["user", "model", "assistant"]),
        text: z.string().max(4000),
      })
    )
    .max(10)
    .optional()
    .default([]),
});

// =====================================================
// SEND MESSAGE TO INTERVIEWIQ AI CHATBOT
// =====================================================

router.post(
  "/message",
  authenticate,

  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate incoming request
      const parsed = chatbotSchema.safeParse(req.body);

      if (!parsed.success) {
        console.error(
          "Chatbot validation error:",
          parsed.error.issues
        );

        res.status(400).json({
          success: false,
          message: "Please provide a valid message.",
          errors: parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });

        return;
      }

      const { message, history } = parsed.data;

      // Convert frontend history roles to backend roles
      const safeHistory: ChatHistoryMessage[] = history.map(
        (item) => ({
          role: item.role === "user" ? "user" : "model",
          text: item.text,
        })
      );

      // Generate AI response using Groq
      const reply = await generateChatbotReply(
        message,
        safeHistory
      );

      res.status(200).json({
        success: true,
        reply,
      });
    } catch (error: unknown) {
      console.error("Chatbot error:", error);

      // Missing Groq API key
      if (
        error instanceof Error &&
        error.message === "GROQ_API_KEY is missing."
      ) {
        res.status(500).json({
          success: false,
          message: "AI assistant configuration is missing.",
        });

        return;
      }

      // Invalid Groq API key
      if (
        error instanceof Error &&
        error.message === "GROQ_INVALID_API_KEY"
      ) {
        res.status(401).json({
          success: false,
          message: "AI assistant authentication failed. Please check the server configuration.",
        });

        return;
      }

      // Groq quota exceeded
      if (
        error instanceof Error &&
        error.message === "GROQ_QUOTA_EXCEEDED"
      ) {
        res.status(429).json({
          success: false,
          message:
            "The AI assistant has temporarily reached its usage limit. Please try again later.",
        });

        return;
      }

      // Other Groq API errors
      res.status(502).json({
        success: false,
        message:
          "Unable to get an AI response. Please try again.",
      });
    }
  }
);

export default router;
