import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { createProfileSchema, updateProfileSchema } from "../validators/profile.validator";

// GET /users/:id/profile - Get a user's profile
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt — id is now a string UUID
    const id = req.params.id;

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: id },
    });

    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

// POST /users/:id/profile - Create a profile for a user
export const createProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;

    const result = createProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { userId: id },
    });
    if (existingProfile) {
      res.status(409).json({ message: "Profile already exists for this user" });
      return;
    }

    const newProfile = await prisma.profile.create({
      data: {
        ...result.data,
        userId: id,
      },
    });

    res.status(201).json(newProfile);
  } catch (error) {
    next(error);
  }
};

// PUT /users/:id/profile - Update a user's profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;

    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { userId: id },
    });
    if (!existingProfile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const updated = await prisma.profile.update({
      where: { userId: id },
      data: result.data,
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};