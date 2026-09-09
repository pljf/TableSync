import { z } from "zod";

export const contributionSchema = z.object({
  menuPlanDishId: z.string().min(1, "Missing dish contribution.").max(128),
  guestId: z.string().min(1).max(128).optional()
});
