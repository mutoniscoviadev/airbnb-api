import { Request, Response, NextFunction } from "express";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import prisma from "../config/prisma";
import { model, filterModel } from "../config/ai";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";

// ======= PART 1: Smart Listing Search =======
export const aiSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body;
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    if (!query) {
      res.status(400).json({ message: "query is required" });
      return;
    }

    // Extract filters using temperature: 0 model
    const filterPrompt = `
You are a search filter extractor for a property rental platform.
Extract search filters from the user's query and return ONLY a JSON object.
No explanation, no markdown, just raw JSON.

Valid listing types: APARTMENT, HOUSE, VILLA, CABIN

Return this exact format:
{
  "location": "string or null",
  "type": "APARTMENT|HOUSE|VILLA|CABIN or null",
  "maxPrice": "number or null",
  "guests": "number or null"
}

User query: "${query}"
`;

    const filterResponse = await filterModel.invoke([
      new HumanMessage(filterPrompt),
    ]);

    let filters: any;
    try {
      const raw = filterResponse.content as string;
      const cleaned = raw.replace(/```json|```/g, "").trim();
      filters = JSON.parse(cleaned);
    } catch {
      res.status(400).json({ message: "Could not parse filters from your query" });
      return;
    }

    // Check if all filters are null
    const hasFilters = Object.values(filters).some((v) => v !== null);
    if (!hasFilters) {
      res.status(400).json({
        message: "Could not extract any filters from your query, please be more specific",
      });
      return;
    }

    // Build Prisma where clause
    const where: any = {};
    if (filters.location) where.location = { contains: filters.location, mode: "insensitive" };
    if (filters.type) where.type = filters.type;
    if (filters.maxPrice) where.pricePerNight = { lte: filters.maxPrice };
    if (filters.guests) where.guests = { gte: filters.guests };

    // Fetch listings and count simultaneously
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          host: { select: { name: true, email: true } },
        },
        skip,
        take: limitNum,
      }),
      prisma.listing.count({ where }),
    ]);

    res.status(200).json({
      filters,
      data: listings,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("AI Search Error:", error?.message || error);
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ message: "AI service configuration error" });
      return;
    }
    next(error);
  }
};

// ======= PART 2: Listing Description Generator =======
export const generateDescription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { tone = "professional" } = req.body;

    const validTones = ["professional", "casual", "luxury"];
    if (!validTones.includes(tone)) {
      res.status(400).json({ message: "tone must be professional, casual, or luxury" });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ message: "You can only generate descriptions for your own listings" });
      return;
    }

    const toneInstructions: Record<string, string> = {
      professional: "Write in a formal, clear, and business-like tone.",
      casual: "Write in a friendly, relaxed, and conversational tone.",
      luxury: "Write in an elegant, premium, and aspirational tone.",
    };

    const prompt = `
You are a professional property listing copywriter.
${toneInstructions[tone]}
Generate a compelling description for this property listing.
Return ONLY the description text, no extra commentary.

Property details:
- Title: ${listing.title}
- Location: ${listing.location}
- Type: ${listing.type}
- Price per night: $${listing.pricePerNight}
- Max guests: ${listing.guests}
- Amenities: ${listing.amenities.join(", ")}
`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const description = (response.content as string).trim();

    // Save to database
    const updated = await prisma.listing.update({
      where: { id },
      data: { description },
    });

    res.status(200).json({ description, listing: updated });
  } catch (error: any) {
    console.error("Generate Description Error:", error?.message || error);
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ message: "AI service configuration error" });
      return;
    }
    next(error);
  }
};

// In-memory chat sessions
const chatSessions: Record<string, any[]> = {};

// ======= PART 3: Guest Support Chatbot =======
export const aiChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, message, listingId } = req.body;

    if (!sessionId || !message) {
      res.status(400).json({ message: "sessionId and message are required" });
      return;
    }

    // Initialize session if not exists
    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }

    // Build system prompt
    let systemPrompt = "You are a helpful guest support assistant for an Airbnb-like platform.";

    if (listingId) {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (listing) {
        systemPrompt = `
You are a helpful guest support assistant for an Airbnb-like platform.
You are currently helping a guest with questions about this specific listing:

Title: ${listing.title}
Location: ${listing.location}
Price per night: $${listing.pricePerNight}
Max guests: ${listing.guests}
Type: ${listing.type}
Amenities: ${listing.amenities.join(", ")}
Description: ${listing.description}

Answer questions about this listing accurately based on the details above.
If asked something not covered by the listing details, say you don't have that information.
        `.trim();
      }
    }

    // Add user message to history
    chatSessions[sessionId].push(new HumanMessage(message));

    // Trim history to last 10 exchanges (20 messages)
    if (chatSessions[sessionId].length > 20) {
      chatSessions[sessionId] = chatSessions[sessionId].slice(-20);
    }

    // Build messages array
    const messages = [
      new SystemMessage(systemPrompt),
      ...chatSessions[sessionId],
    ];

    const response = await model.invoke(messages);
    const reply = (response.content as string).trim();

    // Add AI response to history
    chatSessions[sessionId].push(response);

    res.status(200).json({
      response: reply,
      sessionId,
      messageCount: chatSessions[sessionId].length,
    });
  } catch (error: any) {
    console.error("AI Chat Error:", error?.message || error);
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ message: "AI service configuration error" });
      return;
    }
    next(error);
  }
};

// ======= PART 4: AI Booking Recommendation =======
export const aiRecommend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Fetch last 5 bookings with listing details
    const bookings = await prisma.booking.findMany({
      where: { guestId: userId },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (bookings.length === 0) {
      res.status(400).json({
        message: "No booking history found. Make some bookings first to get recommendations.",
      });
      return;
    }

    // Build booking history summary
    const historySummary = bookings
      .map((b) => `- ${b.listing.type} in ${b.listing.location}, $${b.listing.pricePerNight}/night, ${b.listing.guests} guests max`)
      .join("\n");

    const prompt = `
You are a recommendation engine for a property rental platform.
Analyze this user's booking history and suggest search filters.
Return ONLY a JSON object, no explanation, no markdown.

Booking history:
${historySummary}

Return this exact format:
{
  "preferences": "string describing what the user likes",
  "searchFilters": {
    "location": "string or null",
    "type": "APARTMENT|HOUSE|VILLA|CABIN or null",
    "maxPrice": "number or null",
    "guests": "number or null"
  },
  "reason": "string explaining the recommendation"
}
`;

    const response = await model.invoke([new HumanMessage(prompt)]);

    let aiResult: any;
    try {
      const raw = response.content as string;
      const cleaned = raw.replace(/```json|```/g, "").trim();
      aiResult = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ message: "AI returned invalid response, please try again" });
      return;
    }

    // Get already booked listing IDs
    const bookedIds = bookings.map((b) => b.listingId);

    // Build where clause from AI filters
    const { searchFilters } = aiResult;
    const where: any = {
      id: { notIn: bookedIds },
    };
    if (searchFilters.location) where.location = { contains: searchFilters.location, mode: "insensitive" };
    if (searchFilters.type) where.type = searchFilters.type;
    if (searchFilters.maxPrice) where.pricePerNight = { lte: searchFilters.maxPrice };
    if (searchFilters.guests) where.guests = { gte: searchFilters.guests };

    const recommendations = await prisma.listing.findMany({
      where,
      take: 5,
      include: {
        host: { select: { name: true, avatar: true } },
      },
    });

    res.status(200).json({
      preferences: aiResult.preferences,
      reason: aiResult.reason,
      searchFilters: aiResult.searchFilters,
      recommendations,
    });
  } catch (error: any) {
    console.error("AI Recommend Error:", error?.message || error);
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ message: "AI service configuration error" });
      return;
    }
    next(error);
  }
};

// ======= PART 5: Review Summarizer =======
export const reviewSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const cacheKey = `ai:review-summary:${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { listingId: id },
      include: { user: { select: { name: true } } },
    });

    if (reviews.length < 3) {
      res.status(400).json({
        message: "Not enough reviews to generate a summary (minimum 3 required)",
      });
      return;
    }

    // Calculate average rating in code
    const averageRating = parseFloat(
      (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    );

    // Format reviews for AI
    const reviewText = reviews
      .map((r) => `- ${r.user.name} (${r.rating}/5): ${r.comment}`)
      .join("\n");

    const prompt = `
You are a review analyst for a property rental platform.
Analyze these guest reviews and return ONLY a JSON object.
No explanation, no markdown, just raw JSON.

Reviews:
${reviewText}

Return this exact format:
{
  "summary": "2-3 sentence overall summary of guest experience",
  "positives": ["thing 1", "thing 2", "thing 3"],
  "negatives": ["thing 1"] 
}

Note: negatives can be an empty array if there are no complaints.
`;

    const response = await model.invoke([new HumanMessage(prompt)]);

    let aiResult: any;
    try {
      const raw = response.content as string;
      const cleaned = raw.replace(/```json|```/g, "").trim();
      aiResult = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ message: "AI returned invalid response, please try again" });
      return;
    }

    const result = {
      summary: aiResult.summary,
      positives: aiResult.positives,
      negatives: aiResult.negatives ?? [],
      averageRating,
      totalReviews: reviews.length,
    };

    // Cache for 10 minutes
    setCache(cacheKey, result, 600);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Review Summary Error:", error?.message || error);
    if (error?.status === 429) {
      res.status(429).json({ message: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ message: "AI service configuration error" });
      return;
    }
    next(error);
  }
};