import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendEmail } from "../config/email";
import { welcomeEmail, passwordResetEmail } from "../templates/emails";

const JWT_SECRET = process.env["JWT_SECRET"] as string;
const JWT_EXPIRES_IN = process.env["JWT_EXPIRES_IN"] as string;

// ======= POST /auth/register =======
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, username, password, phone, role } = req.body;

    if (!name || !email || !username || !password || !phone) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    if (role === "ADMIN") {
      res.status(400).json({ message: "Cannot register as ADMIN" });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      res.status(409).json({ message: "Email or username already taken" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        phone,
        password: hashedPassword,
        role: role ?? "GUEST",
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    // Send response first
    res.status(201).json(userWithoutPassword);

    // Send welcome email after response
    try {
      await sendEmail(
        user.email,
        "Welcome to Airbnb!",
        welcomeEmail(user.name, user.role)
      );
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
    }
  } catch (error) {
    next(error);
  }
};

// ======= POST /auth/login =======
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // ✅ userId is now a string UUID
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
};

// ======= GET /auth/me =======
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.role === "HOST") {
      const hostWithListings = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          listings: {
            include: {
              _count: { select: { bookings: true } },
            },
          },
        },
      });
      const { password: _, ...userWithoutPassword } = hostWithListings as any;
      res.status(200).json(userWithoutPassword);
    } else {
      const guestWithBookings = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          bookings: {
            include: {
              listing: {
                select: { title: true, location: true },
              },
            },
          },
        },
      });
      const { password: _, ...userWithoutPassword } = guestWithBookings as any;
      res.status(200).json(userWithoutPassword);
    }
  } catch (error) {
    next(error);
  }
};

// ======= POST /auth/change-password =======
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "currentPassword and newPassword are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ message: "New password must be at least 8 characters" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// ======= POST /auth/forgot-password =======
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const SAFE_RESPONSE = "If that email is registered, a reset link has been sent";

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(200).json({ message: SAFE_RESPONSE });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExpiry: expiry },
    });

    const resetLink = `${process.env["API_URL"] || "http://localhost:3000"}/auth/reset-password/${rawToken}`;

    // Send response first
    res.status(200).json({ message: SAFE_RESPONSE });

    // Send email after response
    try {
      await sendEmail(
        user.email,
        "Password Reset Request",
        passwordResetEmail(user.name, resetLink)
      );
    } catch (emailError) {
      console.error("Password reset email failed:", emailError);
    }
  } catch (error) {
    next(error);
  }
};

// ======= POST /auth/reset-password/:token =======
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = req.params["token"];
    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({ message: "newPassword is required" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired reset token" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};