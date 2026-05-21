import { Router } from "express";
import {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../../controllers/auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: a3f8c2d1-4b5e-4f6a-8c9d-1e2f3a4b5c6d
 *         name:
 *           type: string
 *           example: Alice Johnson
 *         email:
 *           type: string
 *           example: alice@example.com
 *         username:
 *           type: string
 *           example: alicej
 *         phone:
 *           type: string
 *           example: +1-555-0101
 *         role:
 *           type: string
 *           enum: [HOST, GUEST, ADMIN]
 *           example: HOST
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: https://res.cloudinary.com/example/image.jpg
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-01-01T00:00:00.000Z
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           $ref: '#/components/schemas/User'
 *     RegisterInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - username
 *         - phone
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: Alice Johnson
 *         email:
 *           type: string
 *           example: alice@example.com
 *         username:
 *           type: string
 *           example: alicej
 *         phone:
 *           type: string
 *           example: +1-555-0101
 *         password:
 *           type: string
 *           example: password123
 *         role:
 *           type: string
 *           enum: [HOST, GUEST]
 *           example: HOST
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: alice@example.com
 *         password:
 *           type: string
 *           example: password123
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Resource not found
 *     CreateReviewInput:
 *       type: object
 *       required:
 *         - rating
 *         - comment
 *       properties:
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *         comment:
 *           type: string
 *           example: Great place to stay!
 *     Review:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: a3f8c2d1-4b5e-4f6a-8c9d-1e2f3a4b5c6d
 *         rating:
 *           type: integer
 *           example: 4
 *         comment:
 *           type: string
 *           example: Great place to stay!
 *         userId:
 *           type: string
 *         listingId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: a3f8c2d1-4b5e-4f6a-8c9d-1e2f3a4b5c6d
 *         checkIn:
 *           type: string
 *           format: date-time
 *         checkOut:
 *           type: string
 *           format: date-time
 *         totalPrice:
 *           type: number
 *           example: 480
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED]
 *         guestId:
 *           type: string
 *         listingId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CreateBookingInput:
 *       type: object
 *       required:
 *         - listingId
 *         - checkIn
 *         - checkOut
 *       properties:
 *         listingId:
 *           type: string
 *           example: a3f8c2d1-4b5e-4f6a-8c9d-1e2f3a4b5c6d
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: 2026-08-01T00:00:00.000Z
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: 2026-08-05T00:00:00.000Z
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email or username already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Missing fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the logged-in user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: No token provided or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", authenticate, getMe);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change your password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: password123
 *               newPassword:
 *                 type: string
 *                 example: newpassword456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Missing fields or new password too short
 *       401:
 *         description: Current password incorrect or invalid token
 */
router.post("/change-password", authenticate, changePassword);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     description: Always returns the same response whether the email exists or not
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: alice@example.com
 *     responses:
 *       200:
 *         description: Reset link sent if email is registered
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password using token from email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password/:token", resetPassword);

export default router;