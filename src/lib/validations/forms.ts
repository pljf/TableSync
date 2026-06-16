import { z } from "zod";

const csvSchema = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

export const createRoomSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  description: z.string().trim().optional(),
  eventType: z.enum(["DINNER", "POTLUCK", "HOTPOT", "BBQ", "PICNIC", "BRUNCH", "OTHER"]),
  dateTime: z.string().optional(),
  location: z.string().trim().optional(),
  totalBudgetDollars: z.coerce.number().positive().optional(),
  expectedGuests: z.coerce.number().int().min(2).max(50),
  isPublicShareable: z.coerce.boolean().optional()
});

export const joinRoomSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  dietType: z.enum(["OMNIVORE", "VEGETARIAN", "VEGAN", "PESCATARIAN", "HALAL", "KOSHER", "GLUTEN_FREE"]),
  allergies: csvSchema,
  dislikes: csvSchema,
  likes: csvSchema,
  spiceLevel: z.enum(["NONE", "MILD", "MEDIUM", "HOT"]),
  maxBudgetDollars: z.coerce.number().positive().optional(),
  canBring: z.coerce.boolean().optional(),
  notes: z.string().trim().optional()
});

export const voteSchema = z.object({
  planId: z.string().min(1),
  guestId: z.string().min(1),
  value: z.enum(["LIKE", "NEUTRAL", "VETO"]),
  reason: z.string().trim().optional()
});

export const claimShoppingSchema = z.object({
  itemId: z.string().min(1),
  guestId: z.string().optional()
});

