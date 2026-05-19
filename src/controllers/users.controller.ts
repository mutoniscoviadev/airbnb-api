import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { createUserSchema, updateUserSchema } from "../validators/users.validator";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

// GET /users - Get all users with pagination
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          role: true,
          avatar: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { listings: true },
          },
        },
        skip,
        take: limitNum,
      }),
      prisma.user.count(),
    ]);

    res.status(200).json({
      data: users,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /users/stats - Get user statistics
export const getUserStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = "stats:users";
    const cached = getCache(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const [totalUsers, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
    ]);

    const response = { totalUsers, byRole };
    setCache(cacheKey, response, 300);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// GET /users/:id - Get a single user
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt — id is now a string UUID
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.role === "HOST") {
      const hostWithListings = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          role: true,
          avatar: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
          listings: {
            include: {
              _count: { select: { bookings: true } },
            },
          },
        },
      });
      res.status(200).json(hostWithListings);
    } else {
      const guestWithBookings = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          role: true,
          avatar: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
          bookings: {
            include: {
              listing: {
                select: { title: true, location: true },
              },
            },
          },
        },
      });
      res.status(200).json(guestWithBookings);
    }
  } catch (error) {
    next(error);
  }
};

// POST /users - Create a new user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const hashedPassword = await (await import("bcrypt")).hash(result.data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        ...result.data,
        password: hashedPassword,
      },
    });

    deleteCacheByPrefix("stats:users");
    const { password: _, ...userWithoutPassword } = newUser as any;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// PUT /users/:id - Update a user
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id as string;

    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const existing = await prisma.user.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: result.data,
    });

    const { password: _, ...userWithoutPassword } = updated as any;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// DELETE /users/:id - Delete a user
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id as string;

    const existing = await prisma.user.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await prisma.user.delete({ where: { id } });
    deleteCacheByPrefix("stats:users");
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// GET /users/:id/listings - Get all listings by a host
export const getUserListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id as string;
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: { hostId: id },
        skip,
        take: limitNum,
      }),
      prisma.listing.count({ where: { hostId: id } }),
    ]);

    res.status(200).json({
      data: listings,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /users/:id/bookings - Get all bookings by a guest
export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id as string;
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { guestId: id },
        include: {
          listing: {
            select: { title: true, location: true },
          },
        },
        skip,
        take: limitNum,
      }),
      prisma.booking.count({ where: { guestId: id } }),
    ]);

    res.status(200).json({
      data: bookings,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};