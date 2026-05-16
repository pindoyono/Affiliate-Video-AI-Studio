-- CreateTable: VideoVariant
CREATE TABLE "VideoVariant" (
    "id"         TEXT             NOT NULL,
    "videoId"    TEXT             NOT NULL,
    "hook"       TEXT             NOT NULL,
    "title"      TEXT             NOT NULL,
    "thumbnail"  TEXT             NOT NULL,
    "ctr"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retention"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isWinner"   BOOLEAN          NOT NULL DEFAULT false,
    "isSelected" BOOLEAN          NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoVariant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VideoVariant"
    ADD CONSTRAINT "VideoVariant_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "Video"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
