-- Phase 9: Database consistency and production stability improvements

-- ─── 1. Create AffiliatePlatform enum ────────────────────────────────────────
CREATE TYPE "AffiliatePlatform" AS ENUM ('SHOPEE', 'TIKTOK', 'TOKOPEDIA', 'AMAZON');

-- ─── 2. Migrate AffiliateData.platform from TEXT to AffiliatePlatform enum ───
-- Replace any legacy 'MANUAL' values with 'SHOPEE' before casting
UPDATE "AffiliateData" SET "platform" = 'SHOPEE' WHERE "platform" = 'MANUAL';
-- Replace any legacy 'TOKOPEDIA' / 'AMAZON' text values (forward-compat guard)
UPDATE "AffiliateData" SET "platform" = 'TOKOPEDIA' WHERE "platform" = 'TOKOPEDIA';
UPDATE "AffiliateData" SET "platform" = 'AMAZON'    WHERE "platform" = 'AMAZON';

ALTER TABLE "AffiliateData"
  ALTER COLUMN "platform" TYPE "AffiliatePlatform"
  USING "platform"::"AffiliatePlatform";

-- ─── 3. Add createdAt to AffiliateData ───────────────────────────────────────
ALTER TABLE "AffiliateData"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── 4. Add timestamps to TrendAnalysis ──────────────────────────────────────
ALTER TABLE "TrendAnalysis"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TrendAnalysis"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── 5. Add timestamps to Scene ──────────────────────────────────────────────
ALTER TABLE "Scene"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Scene"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── 6. Add updatedAt to Presenter ───────────────────────────────────────────
ALTER TABLE "Presenter"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── 7. Add updatedAt to KnowledgeBase ───────────────────────────────────────
ALTER TABLE "KnowledgeBase"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── 8. Add updatedAt to VideoReview ─────────────────────────────────────────
ALTER TABLE "VideoReview"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── 9. Add timestamps to VideoAnalytics ─────────────────────────────────────
ALTER TABLE "VideoAnalytics"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "VideoAnalytics"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── 10. Make VideoVariant.thumbnail nullable ─────────────────────────────────
ALTER TABLE "VideoVariant"
  ALTER COLUMN "thumbnail" DROP NOT NULL;

-- ─── 11. Add indexes ──────────────────────────────────────────────────────────

-- AffiliateData
CREATE INDEX "AffiliateData_createdAt_idx" ON "AffiliateData"("createdAt");

-- TrendAnalysis
CREATE INDEX "TrendAnalysis_productId_idx"  ON "TrendAnalysis"("productId");
CREATE INDEX "TrendAnalysis_analyzedAt_idx" ON "TrendAnalysis"("analyzedAt");

-- Scene
CREATE INDEX "Scene_videoId_idx" ON "Scene"("videoId");
CREATE INDEX "Scene_order_idx"   ON "Scene"("order");

-- VideoVariant
CREATE INDEX "VideoVariant_videoId_idx"    ON "VideoVariant"("videoId");
CREATE INDEX "VideoVariant_createdAt_idx"  ON "VideoVariant"("createdAt");

-- VideoReview
CREATE INDEX "VideoReview_videoId_idx"    ON "VideoReview"("videoId");
CREATE INDEX "VideoReview_createdAt_idx"  ON "VideoReview"("createdAt");

-- VideoAnalytics
CREATE INDEX "VideoAnalytics_videoId_idx"    ON "VideoAnalytics"("videoId");
CREATE INDEX "VideoAnalytics_recordedAt_idx" ON "VideoAnalytics"("recordedAt");
CREATE INDEX "VideoAnalytics_createdAt_idx"  ON "VideoAnalytics"("createdAt");

-- KnowledgeBase
CREATE INDEX "KnowledgeBase_userId_idx" ON "KnowledgeBase"("userId");

-- JobQueue
CREATE INDEX "JobQueue_status_idx"    ON "JobQueue"("status");
CREATE INDEX "JobQueue_createdAt_idx" ON "JobQueue"("createdAt");

-- PublishJob
CREATE INDEX "PublishJob_videoId_idx"    ON "PublishJob"("videoId");
CREATE INDEX "PublishJob_createdAt_idx"  ON "PublishJob"("createdAt");
CREATE INDEX "PublishJob_status_idx"     ON "PublishJob"("status");

-- AgentTask
CREATE INDEX "AgentTask_userId_idx"    ON "AgentTask"("userId");
CREATE INDEX "AgentTask_chainId_idx"   ON "AgentTask"("chainId");
CREATE INDEX "AgentTask_createdAt_idx" ON "AgentTask"("createdAt");
CREATE INDEX "AgentTask_status_idx"    ON "AgentTask"("status");
