-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurrenceDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateTable
CREATE TABLE "WorkoutProgram" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "targetSets" TEXT,
    "targetReps" TEXT,
    "targetDurationMinutes" INTEGER,
    "targetWeightKg" DOUBLE PRECISION,
    "scheduledDate" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceDays" "RecurrenceDay"[] DEFAULT ARRAY[]::"RecurrenceDay"[],
    "status" "ProgramStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkoutProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actualSets" INTEGER,
    "actualReps" TEXT,
    "actualWeightKg" DOUBLE PRECISION,
    "actualDurationMinutes" INTEGER,
    "rpe" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAssessment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "performanceNotes" TEXT,
    "goalsNextWeek" TEXT,
    "overallRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutProgram_clientId_idx" ON "WorkoutProgram"("clientId");

-- CreateIndex
CREATE INDEX "WorkoutProgram_trainerId_idx" ON "WorkoutProgram"("trainerId");

-- CreateIndex
CREATE INDEX "WorkoutProgram_workoutId_idx" ON "WorkoutProgram"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutProgram_status_idx" ON "WorkoutProgram"("status");

-- CreateIndex
CREATE INDEX "WorkoutLog_programId_idx" ON "WorkoutLog"("programId");

-- CreateIndex
CREATE INDEX "WorkoutLog_clientId_idx" ON "WorkoutLog"("clientId");

-- CreateIndex
CREATE INDEX "WorkoutLog_completedAt_idx" ON "WorkoutLog"("completedAt");

-- CreateIndex
CREATE INDEX "WeeklyAssessment_clientId_idx" ON "WeeklyAssessment"("clientId");

-- CreateIndex
CREATE INDEX "WeeklyAssessment_trainerId_idx" ON "WeeklyAssessment"("trainerId");

-- CreateIndex
CREATE INDEX "WeeklyAssessment_year_weekNumber_idx" ON "WeeklyAssessment"("year", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAssessment_clientId_weekNumber_year_key" ON "WeeklyAssessment"("clientId", "weekNumber", "year");

-- AddForeignKey
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAssessment" ADD CONSTRAINT "WeeklyAssessment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAssessment" ADD CONSTRAINT "WeeklyAssessment_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
