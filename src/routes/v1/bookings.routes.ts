import { Router } from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  getMyBookings,
} from "../../controllers/bookings.controller";
import {
  authenticate,
  requireGuest,
} from "../../middlewares/auth.middleware";

const router = Router();

// ✅ MUST be first before /:id or "my" gets treated as an ID
router.get("/my", authenticate, getMyBookings);
router.get("/", getAllBookings);
router.get("/:id", getBookingById);
router.post("/", authenticate, requireGuest, createBooking);
router.patch("/:id/status", authenticate, updateBookingStatus);
router.delete("/:id", authenticate, deleteBooking);

export default router;