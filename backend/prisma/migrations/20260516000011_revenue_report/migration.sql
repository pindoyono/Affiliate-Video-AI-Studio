-- Phase 11: Revenue reporting

-- CreateTable
CREATE TABLE "RevenueReport" (
    "id"        TEXT             NOT NULL,
    "videoId"   TEXT             NOT NULL,
    "cost"      DOUBLE PRECISION NOT NULL,
    "revenue"   DOUBLE PRECISION NOT NULL,
    "profit"    DOUBLE PRECISION NOT NULL,
    "roi"       DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenueReport_videoId_idx"   ON "RevenueReport"("videoId");
CREATE INDEX "RevenueReport_createdAt_idx" ON "RevenueReport"("createdAt");
