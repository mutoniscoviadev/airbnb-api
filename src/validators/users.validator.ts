import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  phone: z.string().min(7, "Invalid phone number"),
  // ✅ password is required for creating a user
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["HOST", "GUEST"]).default("GUEST"),
});

export const updateUserSchema = createUserSchema.partial();