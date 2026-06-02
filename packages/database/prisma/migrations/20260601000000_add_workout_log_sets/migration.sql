-- AlterTable: add sets JSON column to WorkoutLog (already applied via db push)
ALTER TABLE "WorkoutLog" ADD COLUMN IF NOT EXISTS "sets" JSONB;
