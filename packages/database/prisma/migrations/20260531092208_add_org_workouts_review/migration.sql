-- CreateEnum
CREATE TYPE "WorkoutReviewStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "Workout_slug_key";

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewStatus" "WorkoutReviewStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Workout_slug_idx" ON "Workout"("slug");

-- CreateIndex
CREATE INDEX "Workout_organizationId_idx" ON "Workout"("organizationId");

-- CreateIndex
CREATE INDEX "Workout_reviewStatus_idx" ON "Workout"("reviewStatus");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
