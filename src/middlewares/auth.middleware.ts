import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// userId is now a string (UUID)
export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
}

const JWT_SECRET = process.env["JWT_SECRET"] as string;

// authenticate — verifies JWT token
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // userId is now a string
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

    req.userId = decoded.userId;
    req.role = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};

// requireHost — only HOST or ADMIN can proceed
export const requireHost = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.role !== "HOST" && req.role !== "ADMIN") {
    res.status(403).json({ message: "Access denied. Hosts only" });
    return;
  }
  next();
};

// requireGuest — only GUEST or ADMIN can proceed
export const requireGuest = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.role !== "GUEST" && req.role !== "ADMIN") {
    res.status(403).json({ message: "Access denied. Guests only" });
    return;
  }
  next();
};

// requireAdmin — only ADMIN can proceed
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.role !== "ADMIN") {
    res.status(403).json({ message: "Access denied. Admins only" });
    return;
  }
  next();
};