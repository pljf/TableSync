-- Record destructive workflow transitions with explicit activity types.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'PREFERENCES_REOPENED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'FINALIZATION_UNDONE';
