export type MutationState = {
  status: "idle" | "success" | "error";
  message?: string;
  mutationId?: string;
  redirectTo?: string;
};

export const initialMutationState: MutationState = { status: "idle" };
