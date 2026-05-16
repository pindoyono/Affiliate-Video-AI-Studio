-- CreateTable
CREATE TABLE "AffiliateData" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "affiliateAvailable" BOOLEAN NOT NULL DEFAULT false,
    "shortLink" TEXT,
    "shortCode" TEXT,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateData_productId_key" ON "AffiliateData"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateData_shortCode_key" ON "AffiliateData"("shortCode");

-- AddForeignKey
ALTER TABLE "AffiliateData" ADD CONSTRAINT "AffiliateData_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
