-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "muscleGroups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "audioUrl" TEXT,
    "description" TEXT,
    "instructions" TEXT,
    "tips" TEXT,
    "sets" TEXT,
    "reps" TEXT,
    "restSeconds" INTEGER,
    "durationMinutes" INTEGER,
    "caloriesPerHour" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workout_slug_key" ON "Workout"("slug");

-- CreateIndex
CREATE INDEX "Workout_category_idx" ON "Workout"("category");

-- CreateIndex
CREATE INDEX "Workout_difficulty_idx" ON "Workout"("difficulty");
