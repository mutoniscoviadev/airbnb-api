import { Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

// GET /listings/:id/reviews - Get all reviews for a listing
export const getListingReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt — id is now a string UUID
    const listingId = req.params.id;
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `reviews:${listingId}:${pageNum}:${limitNum}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const listing = await prisma.listing.findFirst({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { listingId },
        include: {
          user: { select: { name: true, avatar: true } },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.count({ where: { listingId } }),
    ]);

    const response = {
      data: reviews,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    setCache(cacheKey, response, 30);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// POST /listings/:id/reviews - Add a review
export const createReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const listingId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      res.status(400).json({ message: "rating and comment are required" });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: "Rating must be between 1 and 5" });
      return;
    }

    const listing = await prisma.listing.findFirst({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        userId: req.userId!,
        listingId,
      },
      include: {
        user: { select: { name: true, avatar: true } },
      },
    });

    deleteCacheByPrefix(`reviews:${listingId}`);
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

// DELETE /reviews/:id - Delete a review
export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;

    const review = await prisma.review.findFirst({ where: { id } });
    if (!review) {
      res.status(404).json({ message: "Review not found" });
      return;
    }

    if (review.userId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ message: "You can only delete your own reviews" });
      return;
    }

    await prisma.review.delete({ where: { id } });
    deleteCacheByPrefix(`reviews:${review.listingId}`);
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};