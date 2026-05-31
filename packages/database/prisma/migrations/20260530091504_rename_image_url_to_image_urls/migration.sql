/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Workout` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Workout" DROP COLUMN "imageUrl",
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
