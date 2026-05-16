-- Add new VideoStatus values
ALTER TYPE "VideoStatus" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "VideoStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "VideoStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "VideoStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "VideoStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Migrate existing COMPLETED rows to PUBLISHED before removing the old value
UPDATE "Video" SET "status" = 'PUBLISHED' WHERE "status" = 'COMPLETED';

-- Replace the VideoStatus enum so COMPLETED is removed
-- (PostgreSQL requires recreating the type to drop a value)
CREATE TYPE "VideoStatus_new" AS ENUM (
    'DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED',
    'RENDERING', 'PUBLISHED', 'FAILED', 'ARCHIVED'
);

ALTER TABLE "Video"
    ALTER COLUMN "status" TYPE "VideoStatus_new"
    USING "status"::text::"VideoStatus_new";

DROP TYPE "VideoStatus";
ALTER TYPE "VideoStatus_new" RENAME TO "VideoStatus";

-- Create ReviewAction enum
CREATE TYPE "ReviewAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- Create VideoReview table
CREATE TABLE "VideoReview" (
    "id"         TEXT         NOT NULL,
    "videoId"    TEXT         NOT NULL,
    "reviewerId" TEXT         NOT NULL,
    "action"     "ReviewAction" NOT NULL,
    "notes"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoReview_pkey" PRIMARY KEY ("id")
);

-- Foreign key: VideoReview → Video
ALTER TABLE "VideoReview"
    ADD CONSTRAINT "VideoReview_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "Video"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
