import { z } from "zod";

const csvSchema = z
  .string()
  .max(2_000, "Use at most 2,000 characters")
  .optional()
  .transform((value) => {
    const terms = (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    return [...new Map(terms.map((term) => [term.toLowerCase(), term])).values()];
  });

const optionalBudgetSchema = z.coerce.number().min(0.01).max(1_000_000).multipleOf(0.01).optional();

export const createRoomSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120, "Use at most 120 characters"),
  description: z.string().trim().max(2_000, "Use at most 2,000 characters").optional(),
  eventType: z.enum(["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"]),
  dateTime: z.iso.datetime({ local: true, offset: true, error: "Enter a valid date and time" }).max(40).optional(),
  location: z.string().trim().max(200, "Use at most 200 characters").optional(),
  totalBudgetDollars: optionalBudgetSchema,
  expectedGuests: z.coerce.number().int().min(2).max(50),
  isPublicShareable: z.coerce.boolean().optional()
});

export const joinRoomSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100, "Use at most 100 characters"),
  email: z.string().email().max(254).optional().or(z.literal("")),
  dietType: z.enum(["OMNIVORE", "VEGETARIAN", "VEGAN", "PESCATARIAN", "HALAL", "KOSHER", "GLUTEN_FREE"]),
  allergies: csvSchema,
  dislikes: csvSchema,
  likes: csvSchema,
  spiceLevel: z.enum(["NONE", "MILD", "MEDIUM", "HOT"]),
  maxBudgetDollars: optionalBudgetSchema,
  canBring: z.coerce.boolean().optional(),
  notes: z.string().trim().max(2_000, "Use at most 2,000 characters").optional()
});

export const joinContextSchema = z.object({
  token: z.string().uuid(),
  submissionKey: z.string().uuid()
});

export const voteSchema = z
  .object({
    planId: z.string().min(1).max(128),
    value: z.enum(["LIKE", "NEUTRAL", "VETO"]),
    reason: z.string().trim().max(1_000, "Use at most 1,000 characters").optional()
  })
  .superRefine((vote, context) => {
    if (vote.value === "VETO" && !vote.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A veto reason is required."
      });
    }
  });

export const claimShoppingSchema = z.object({
  itemId: z.string().min(1).max(128),
  guestId: z.string().min(1).max(128).optional()
});

