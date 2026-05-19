import { Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { createBookingSchema } from "../validators/bookings.validator";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendEmail } from "../config/email";
import {
  bookingConfirmationEmail,
  bookingCancellationEmail,
} from "../templates/emails";

// GET /bookings - Get all bookings
export const getAllBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        include: {
          guest: { select: { name: true, avatar: true } },
          listing: { select: { title: true, location: true } },
        },
        skip,
        take: limitNum,
      }),
      prisma.booking.count(),
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

// GET /bookings/:id - Get a single booking
export const getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt — id is now a string UUID
    const id = req.params.id;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
          },
        },
        listing: {
          include: {
            host: { select: { name: true, avatar: true } },
          },
        },
      },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
};

// POST /bookings - Create a new booking
export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    // ✅ guestId is now a string UUID from token
    const guestId = req.userId!;

    const listing = await prisma.listing.findFirst({
      where: { id: result.data.listingId },
    });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const checkInDate = new Date(result.data.checkIn);
    const checkOutDate = new Date(result.data.checkOut);

    // Check for booking conflicts
    const conflict = await prisma.booking.findFirst({
      where: {
        listingId: result.data.listingId,
        status: "CONFIRMED",
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
    });

    if (conflict) {
      res.status(409).json({ message: "Listing is already booked for these dates" });
      return;
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = nights * listing.pricePerNight;

    const newBooking = await prisma.booking.create({
      data: {
        guestId,
        listingId: result.data.listingId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice,
        status: "PENDING",
      },
    });

    const guest = await prisma.user.findUnique({ where: { id: guestId } });

    res.status(201).json(newBooking);

    try {
      if (guest) {
        await sendEmail(
          guest.email,
          "Booking Confirmation",
          bookingConfirmationEmail(
            guest.name,
            listing.title,
            listing.location,
            checkInDate.toDateString(),
            checkOutDate.toDateString(),
            totalPrice
          )
        );
      }
    } catch (emailError) {
      console.error("Booking confirmation email failed:", emailError);
    }
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id/status - Update booking status
export const updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;
    const { status } = req.body;

    const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status. Must be PENDING, CONFIRMED or CANCELLED" });
      return;
    }

    const existing = await prisma.booking.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// DELETE /bookings/:id - Cancel a booking
export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ No parseInt
    const id = req.params.id;

    const booking = await prisma.booking.findFirst({
      where: { id },
      include: {
        listing: { select: { title: true } },
        guest: { select: { name: true, email: true } },
      },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    if (booking.guestId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ message: "You can only cancel your own bookings" });
      return;
    }

    if (booking.status === "CANCELLED") {
      res.status(400).json({ message: "Booking is already cancelled" });
      return;
    }

    const cancelled = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    res.status(200).json({ message: "Booking cancelled successfully", booking: cancelled });

    try {
      await sendEmail(
        booking.guest.email,
        "Booking Cancellation",
        bookingCancellationEmail(
          booking.guest.name,
          booking.listing.title,
          booking.checkIn.toDateString(),
          booking.checkOut.toDateString()
        )
      );
    } catch (emailError) {
      console.error("Booking cancellation email failed:", emailError);
    }
  } catch (error) {
    next(error);
  }
};