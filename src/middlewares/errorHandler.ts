import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { MulterError } from "multer";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Multer errors — file upload issues
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File too large. Maximum size is 5MB" });
      return;
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      res.status(400).json({ error: "Maximum of 5 photos allowed per listing" });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({ errors: err.issues });
    return;
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        res.status(409).json({ error: `${err.meta?.target} already exists` });
        return;
      case "P2025":
        res.status(404).json({ error: "Record not found" });
        return;
      case "P2003":
        res.status(400).json({ error: "Related record does not exist" });
        return;
      default:
        res.status(500).json({ error: "Database error" });
        return;
    }
  }

  // File type error from multer fileFilter
  if (err instanceof Error && err.message === "Only jpeg, png, webp images are allowed") {
    res.status(400).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}