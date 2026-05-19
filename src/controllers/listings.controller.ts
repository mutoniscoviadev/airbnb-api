import { Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { createListingSchema, updateListingSchema } from "../validators/listings.validator";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

// GET /listings - Get all listings
export const getAllListings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location, type, maxPrice, page, limit } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `listings:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const where = {
      ...(location && {
        location: { contains: location as string, mode: "insensitive" as const },
      }),
      ...(type && { type: type as any }),
      ...(maxPrice && { pricePerNight: { lte: parseFloat(maxPrice as string) } }),
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          host: { select: { name: true, avatar: true } },
          _count: { select: { bookings: true } },
        },
        skip,
        take: limitNum,
      }),
      prisma.listing.count({ where }),
    ]);

    const response = {
      data: listings,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    setCache(cacheKey, response, 60);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// GET /listings/search - Search listings
export const searchListings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location, type, minPrice, maxPrice, guests, page, limit } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `listings:search:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const where: any = {};
    if (location) where.location = { contains: location as string, mode: "insensitive" };
    if (type) where.type = type;
    if (minPrice) where.pricePerNight = { ...where.pricePerNight, gte: parseFloat(minPrice as string) };
    if (maxPrice) where.pricePerNight = { ...where.pricePerNight, lte: parseFloat(maxPrice as string) };
    if (guests) where.guests = { gte: parseInt(guests as string) };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          host: { select: { name: true, avatar: true } },
        },
        skip,
        take: limitNum,
      }),
      prisma.listing.count({ where }),
    ]);

    const response = {
      data: listings,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    setCache(cacheKey, response, 60);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// GET /listings/:id - Get a single listing
export const getListingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt — id is now a string UUID
    const id = req.params.id;

    const cacheKey = `listing:${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        host: true,
        bookings: {
          include: {
            guest: { select: { name: true, avatar: true } },
          },
        },
        reviews: {
          include: {
            user: { select: { name: true, avatar: true } },
          },
        },
        photos: true,
      },
    });

    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    setCache(cacheKey, listing, 60);
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

// POST /listings - Create a new listing
export const createListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = createListingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const newListing = await prisma.listing.create({
      data: { ...result.data, hostId: req.userId! },
    });

    deleteCacheByPrefix("listings:");
    deleteCacheByPrefix("stats:listings");
    res.status(201).json(newListing);
  } catch (error) {
    next(error);
  }
};

// PUT /listings/:id - Update a listing
export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;

    const result = updateListingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const listing = await prisma.listing.findFirst({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ message: "You can only edit your own listings" });
      return;
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: result.data,
    });

    deleteCacheByPrefix("listings:");
    deleteCacheByPrefix(`listing:${id}`);
    deleteCacheByPrefix("stats:listings");
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// DELETE /listings/:id - Delete a listing
export const deleteListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;

    const listing = await prisma.listing.findFirst({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ message: "You can only delete your own listings" });
      return;
    }

    await prisma.listing.delete({ where: { id } });

    deleteCacheByPrefix("listings:");
    deleteCacheByPrefix(`listing:${id}`);
    deleteCacheByPrefix("stats:listings");
    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// GET /listings/stats - Get listing statistics
export const getListingStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cacheKey = "stats:listings";
    const cached = getCache(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const [totalListings, avgPriceResult, byLocation, byType] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.aggregate({ _avg: { pricePerNight: true } }),
      prisma.listing.groupBy({
        by: ["location"],
        _count: { location: true },
        orderBy: { _count: { location: "desc" } },
      }),
      prisma.listing.groupBy({
        by: ["type"],
        _count: { type: true },
        orderBy: { _count: { type: "desc" } },
      }),
    ]);

    const response = {
      totalListings,
      averagePrice: avgPriceResult._avg.pricePerNight ?? 0,
      byLocation,
      byType,
    };

    setCache(cacheKey, response, 300);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};