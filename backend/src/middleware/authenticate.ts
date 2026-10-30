
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
      return;
    }

    const token = authorization.slice(7).trim();
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      console.error("JWT_SECRET is missing or invalid.");

      res.status(500).json({
        success: false,
        message: "Authentication service is not configured correctly.",
      });
      return;
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !/^[a-f\d]{24}$/i.test(decoded.sub)
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    req.userId = decoded.sub;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}
