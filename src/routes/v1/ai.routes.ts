import { Router } from "express";
import {
  aiSearch,
  generateDescription,
  aiChat,
  aiRecommend,
  reviewSummary,
} from "../../controllers/ai.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /ai/search:
 *   post:
 *     summary: Smart listing search using AI
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 example: apartment in Kigali under $100 for 2 guests
 *     responses:
 *       200:
 *         description: Search results with extracted filters
 *       400:
 *         description: Could not extract filters
 */
router.post("/search", aiSearch);

/**
 * @swagger
 * /ai/listings/{id}/generate-description:
 *   post:
 *     summary: Generate AI description for a listing
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, luxury]
 *                 default: professional
 *     responses:
 *       200:
 *         description: Generated description and updated listing
 *       403:
 *         description: Not the listing owner
 *       404:
 *         description: Listing not found
 */
router.post("/listings/:id/generate-description", authenticate, generateDescription);

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     summary: Guest support chatbot
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - message
 *             properties:
 *               sessionId:
 *                 type: string
 *               message:
 *                 type: string
 *               listingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI response with session info
 */
router.post("/chat", aiChat);

/**
 * @swagger
 * /ai/recommend:
 *   post:
 *     summary: AI booking recommendations based on history
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended listings
 *       400:
 *         description: No booking history
 */
router.post("/recommend", authenticate, aiRecommend);

/**
 * @swagger
 * /ai/listings/{id}/review-summary:
 *   get:
 *     summary: AI summary of listing reviews
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI review summary
 *       400:
 *         description: Not enough reviews
 *       404:
 *         description: Listing not found
 */
router.get("/listings/:id/review-summary", reviewSummary);

export default router;