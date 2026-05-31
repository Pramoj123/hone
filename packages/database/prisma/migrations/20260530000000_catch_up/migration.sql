-- Catch-up migration: documents columns added directly via db push
-- These already exist in the database; this migration just records them in history.

-- AlterTable Organization (columns already exist in DB)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "publicEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "openingHours" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- AlterTable User (add relation columns if missing)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
