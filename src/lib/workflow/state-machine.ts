import type { RoomStatus } from "@/lib/domain";

export type WorkflowAction =
  | "JOIN_ROOM"
  | "UPDATE_PREFERENCES"
  | "UPDATE_ROOM_DETAILS"
  | "GENERATE_PLANS"
  | "CAST_VOTE"
  | "FINALIZE_PLAN"
  | "REOPEN_PREFERENCES"
  | "UNDO_FINALIZATION"
  | "UPDATE_SHOPPING";

const allowedStatuses: Record<WorkflowAction, readonly RoomStatus[]> = {
  JOIN_ROOM: ["COLLECTING_PREFERENCES", "PLANNING"],
  UPDATE_PREFERENCES: ["COLLECTING_PREFERENCES", "PLANNING"],
  UPDATE_ROOM_DETAILS: ["COLLECTING_PREFERENCES", "PLANNING"],
  GENERATE_PLANS: ["COLLECTING_PREFERENCES", "PLANNING"],
  CAST_VOTE: ["VOTING"],
  FINALIZE_PLAN: ["VOTING"],
  REOPEN_PREFERENCES: ["VOTING"],
  UNDO_FINALIZATION: ["FINALIZED"],
  UPDATE_SHOPPING: ["FINALIZED"]
};

const actionLabels: Record<WorkflowAction, string> = {
  JOIN_ROOM: "join the room",
  UPDATE_PREFERENCES: "update preferences",
  UPDATE_ROOM_DETAILS: "update room details",
  GENERATE_PLANS: "generate menu plans",
  CAST_VOTE: "vote",
  FINALIZE_PLAN: "finalize a plan",
  REOPEN_PREFERENCES: "reopen preferences",
  UNDO_FINALIZATION: "undo finalization",
  UPDATE_SHOPPING: "change the shopping list"
};

export function canPerformWorkflowAction(status: RoomStatus, action: WorkflowAction): boolean {
  return allowedStatuses[action].includes(status);
}

export function assertWorkflowActionAllowed(status: RoomStatus, action: WorkflowAction): void {
  if (!canPerformWorkflowAction(status, action)) {
    throw new Error(`Cannot ${actionLabels[action]} while the room is ${status.toLowerCase().replaceAll("_", " ")}.`);
  }
}
