-- CreateEnum
CREATE TYPE "PublishPlatform" AS ENUM ('YOUTUBE', 'TIKTOK', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "PublishJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PublishJob" (
    "id"              TEXT              NOT NULL,
    "videoId"         TEXT              NOT NULL,
    "platform"        "PublishPlatform" NOT NULL,
    "scheduledAt"     TIMESTAMP(3)      NOT NULL,
    "publishedAt"     TIMESTAMP(3),
    "status"          "PublishJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts"        INTEGER           NOT NULL DEFAULT 0,
    "maxAttempts"     INTEGER           NOT NULL DEFAULT 3,
    "platformVideoId" TEXT,
    "error"           TEXT,
    "createdAt"       TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)      NOT NULL,

    CONSTRAINT "PublishJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PublishJob"
    ADD CONSTRAINT "PublishJob_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "Video"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
