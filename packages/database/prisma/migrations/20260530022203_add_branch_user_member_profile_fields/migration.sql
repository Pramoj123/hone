-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "address" TEXT,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "fitnessGoals" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "healthNotes" TEXT,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "memberNumber" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "referredBy" TEXT,
ADD COLUMN     "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "bloodType" TEXT,
    "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentMedications" TEXT,
    "pastInjuries" TEXT,
    "pastSurgeries" TEXT,
    "physicianName" TEXT,
    "physicianPhone" TEXT,
    "hasSignedWaiver" BOOLEAN NOT NULL DEFAULT false,
    "waiverSignedAt" TIMESTAMP(3),
    "fitnessLevel" TEXT,
    "primaryGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_userId_key" ON "MemberProfile"("userId");

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
