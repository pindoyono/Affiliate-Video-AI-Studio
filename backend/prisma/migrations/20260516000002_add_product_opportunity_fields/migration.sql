-- AlterTable: add opportunity scoring fields to Product
ALTER TABLE "Product"
    ADD COLUMN IF NOT EXISTS "searchVolume"   INTEGER,
    ADD COLUMN IF NOT EXISTS "growthVelocity" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "seasonality"    DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "creatorCount"   INTEGER;
