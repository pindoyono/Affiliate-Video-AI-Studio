-- CreateEnum
CREATE TYPE "AgentType" AS ENUM (
    'TREND',
    'RESEARCH',
    'AFFILIATE',
    'STORY',
    'SCRIPT',
    'VOICE',
    'VIDEO',
    'ANALYTICS',
    'OPTIMIZATION'
);

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id"          TEXT               NOT NULL,
    "agentType"   "AgentType"        NOT NULL,
    "input"       JSONB              NOT NULL,
    "output"      JSONB,
    "status"      "AgentTaskStatus"  NOT NULL DEFAULT 'PENDING',
    "error"       TEXT,
    "attempts"    INTEGER            NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER            NOT NULL DEFAULT 3,
    "userId"      TEXT,
    "chainId"     TEXT,
    "chainOrder"  INTEGER,
    "createdAt"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)       NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentTask_chainId_idx" ON "AgentTask"("chainId");

-- CreateIndex
CREATE INDEX "AgentTask_userId_status_idx" ON "AgentTask"("userId", "status");
