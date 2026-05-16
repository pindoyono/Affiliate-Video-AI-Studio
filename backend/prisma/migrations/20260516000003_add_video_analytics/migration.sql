-- CreateTable: VideoAnalytics
CREATE TABLE "VideoAnalytics" (
    "id"         TEXT         NOT NULL,
    "videoId"    TEXT         NOT NULL,
    "views"      INTEGER      NOT NULL DEFAULT 0,
    "clicks"     INTEGER      NOT NULL DEFAULT 0,
    "ctr"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "watchTime"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retention"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roi"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAnalytics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VideoAnalytics"
    ADD CONSTRAINT "VideoAnalytics_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "Video"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
