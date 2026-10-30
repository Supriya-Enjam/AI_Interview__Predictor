
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { connectDB } from "../config/db";
import { User } from "../models/User";

async function createAdmin(): Promise<void> {
  try {
    await connectDB();

    const name = process.env.ADMIN_NAME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error(
        "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be configured."
      );
    }

    if (password.length < 12 || password.length > 72) {
      throw new Error("Admin password must contain 12–72 characters.");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === "admin") {
        console.log("An admin account already exists for this email.");
        return;
      }

      throw new Error(
        "This email already belongs to a candidate. Use a different admin email."
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin account created successfully.");
    console.log(`Admin email: ${email}`);
    console.log("You can now log in using the existing OTP login flow.");
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin().catch((error: unknown) => {
  console.error(
    "Admin creation failed:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
