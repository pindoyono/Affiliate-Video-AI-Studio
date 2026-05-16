-- CreateTable
CREATE TABLE "UserPreference" (
    "id"             TEXT         NOT NULL,
    "userId"         TEXT         NOT NULL,
    "niche"          TEXT,
    "targetAudience" TEXT,
    "contentStyle"   TEXT,
    "language"       TEXT         NOT NULL DEFAULT 'en',
    "embedding"      DOUBLE PRECISION[],
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "UserPreference"
    ADD CONSTRAINT "UserPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
