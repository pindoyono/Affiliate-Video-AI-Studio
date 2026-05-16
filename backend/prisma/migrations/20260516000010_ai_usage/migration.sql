-- Phase 10: AI operational cost tracking

-- CreateTable
CREATE TABLE "AiUsage" (
    "id"               TEXT             NOT NULL,
    "service"          TEXT             NOT NULL,
    "provider"         TEXT             NOT NULL,
    "tokens"           INTEGER,
    "promptTokens"     INTEGER,
    "completionTokens" INTEGER,
    "estimatedCost"    DOUBLE PRECISION,
    "requestType"      TEXT,
    "userId"           TEXT,
    "projectId"        TEXT,
    "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsage_userId_idx"    ON "AiUsage"("userId");
CREATE INDEX "AiUsage_projectId_idx" ON "AiUsage"("projectId");
CREATE INDEX "AiUsage_provider_idx"  ON "AiUsage"("provider");
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");
