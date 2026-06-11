-- Catch-up migration: brings migration history in line with schema.prisma.
-- These objects were previously applied to dev databases via `prisma db push`,
-- so every statement is written to be idempotent (safe on both fresh and
-- already-pushed databases).

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'REVIEWED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Workout: restore slug uniqueness ─────────────────────────────────────────
-- 20260531092208_add_org_workouts_review dropped "Workout_slug_key", but
-- schema.prisma declares `slug String @unique` — restore it for fresh deploys.

CREATE UNIQUE INDEX IF NOT EXISTS "Workout_slug_key" ON "Workout"("slug");

-- ── User: password reset + email verification columns ───────────────────────

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_passwordResetToken_key" ON "User"("passwordResetToken");
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerifyToken_key" ON "User"("emailVerifyToken");

-- ── RefreshToken ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

DO $$ BEGIN
  ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── AssessmentTemplate ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AssessmentTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssessmentTemplate_organizationId_idx" ON "AssessmentTemplate"("organizationId");
CREATE INDEX IF NOT EXISTS "AssessmentTemplate_createdById_idx" ON "AssessmentTemplate"("createdById");

DO $$ BEGIN
  ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Assessment ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Assessment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trainerId" TEXT,
    "organizationId" TEXT NOT NULL,
    "responses" JSONB NOT NULL DEFAULT '{}',
    "weekNumber" INTEGER,
    "year" INTEGER,
    "scheduledDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "trainerNotes" TEXT,
    "overallRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Assessment_templateId_idx" ON "Assessment"("templateId");
CREATE INDEX IF NOT EXISTS "Assessment_clientId_idx" ON "Assessment"("clientId");
CREATE INDEX IF NOT EXISTS "Assessment_trainerId_idx" ON "Assessment"("trainerId");
CREATE INDEX IF NOT EXISTS "Assessment_organizationId_idx" ON "Assessment"("organizationId");
CREATE INDEX IF NOT EXISTS "Assessment_status_idx" ON "Assessment"("status");
CREATE INDEX IF NOT EXISTS "Assessment_year_weekNumber_idx" ON "Assessment"("year", "weekNumber");

DO $$ BEGIN
  ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ProgramPlan ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ProgramPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalWeeks" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProgramPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProgramPlan_organizationId_idx" ON "ProgramPlan"("organizationId");
CREATE INDEX IF NOT EXISTS "ProgramPlan_trainerId_idx" ON "ProgramPlan"("trainerId");
CREATE INDEX IF NOT EXISTS "ProgramPlan_clientId_idx" ON "ProgramPlan"("clientId");
CREATE INDEX IF NOT EXISTS "ProgramPlan_status_idx" ON "ProgramPlan"("status");

DO $$ BEGIN
  ALTER TABLE "ProgramPlan" ADD CONSTRAINT "ProgramPlan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProgramPlan" ADD CONSTRAINT "ProgramPlan_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProgramPlan" ADD CONSTRAINT "ProgramPlan_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ProgramPlanEntry ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ProgramPlanEntry" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "dayOfWeek" "RecurrenceDay" NOT NULL,
    "notes" TEXT,
    "targetSets" INTEGER,
    "targetReps" INTEGER,
    "targetWeightKg" DOUBLE PRECISION,
    "targetDurationMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramPlanEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProgramPlanEntry_planId_idx" ON "ProgramPlanEntry"("planId");
CREATE INDEX IF NOT EXISTS "ProgramPlanEntry_workoutId_idx" ON "ProgramPlanEntry"("workoutId");

DO $$ BEGIN
  ALTER TABLE "ProgramPlanEntry" ADD CONSTRAINT "ProgramPlanEntry_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ProgramPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProgramPlanEntry" ADD CONSTRAINT "ProgramPlanEntry_workoutId_fkey"
    FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
