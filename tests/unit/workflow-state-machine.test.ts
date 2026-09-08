import { describe, expect, it } from "vitest";
import type { RoomStatus } from "@/lib/domain";
import {
  assertWorkflowActionAllowed,
  canPerformWorkflowAction,
  type WorkflowAction
} from "@/lib/workflow/state-machine";

const statuses: RoomStatus[] = [
  "DRAFT",
  "COLLECTING_PREFERENCES",
  "PLANNING",
  "VOTING",
  "FINALIZED",
  "ARCHIVED"
];

const expected: Record<WorkflowAction, RoomStatus[]> = {
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

describe("room workflow state machine", () => {
  for (const [action, allowed] of Object.entries(expected) as Array<[WorkflowAction, RoomStatus[]]>) {
    it(`allows ${action} only in its declared states`, () => {
      for (const status of statuses) {
        expect(canPerformWorkflowAction(status, action)).toBe(allowed.includes(status));
      }
    });
  }

  it("returns a useful error without changing state", () => {
    expect(() => assertWorkflowActionAllowed("FINALIZED", "CAST_VOTE")).toThrow(
      "Cannot vote while the room is finalized."
    );
  });
});
