import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AffiliatePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateAffiliateDto } from './affiliate.dto';

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  constructor(private prisma: PrismaService) {}

  /** Retrieve affiliate data for a single product (ownership-checked). */
  async getByProductId(productId: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const data = await this.prisma.affiliateData.findUnique({
      where: { productId },
    });
    if (!data) throw new NotFoundException('Affiliate data not found for this product');

    return data;
  }

  /**
   * Generate or refresh affiliate data for a product.
   * - Detects affiliate availability based on product.affiliateUrl
   * - Creates a short link if one does not already exist
   * - Calculates estimated commission from product price
   * Performs an upsert so calling this endpoint is idempotent.
   */
  async generate(dto: GenerateAffiliateDto, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, userId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const affiliateAvailable = this.detectAffiliateAvailability(product);
    const platform = dto.platform ?? this.platformFromSourceType(product.sourceType);
    const commissionRate = dto.commissionRate ?? this.defaultCommissionRate(platform);
    const estimatedCommission = this.calculateEstimatedCommission(
      product.price,
      commissionRate,
    );

    // Resolve or create a short code for the affiliate link.
    const existing = await this.prisma.affiliateData.findUnique({
      where: { productId: dto.productId },
      select: { shortCode: true },
    });
    const shortCode = existing?.shortCode ?? this.generateShortCode();
    const shortLink = this.buildShortLink(shortCode);

    this.logger.log(`Generating affiliate data for product ${dto.productId}`);

    const affiliateData = await this.prisma.affiliateData.upsert({
      where: { productId: dto.productId },
      create: {
        productId: dto.productId,
        platform,
        commissionRate,
        estimatedCommission,
        affiliateAvailable,
        shortCode,
        shortLink,
      },
      update: {
        platform,
        commissionRate,
        estimatedCommission,
        affiliateAvailable,
        shortLink,
      },
    });

    return affiliateData;
  }

  /**
   * Aggregate affiliate metrics across all products owned by the user.
   * Returns totals and a per-product breakdown.
   */
  async getMetrics(userId: string) {
    const products = await this.prisma.product.findMany({
      where: { userId },
      select: { id: true, title: true, affiliateData: true },
    });

    let totalClicks = 0;
    let totalConversions = 0;
    let totalEstimatedRevenue = 0;

    const breakdown = products
      .filter(p => p.affiliateData !== null)
      .map(p => {
        const d = p.affiliateData!;
        totalClicks += d.clickCount;
        totalConversions += d.conversionCount;
        totalEstimatedRevenue += d.estimatedCommission * d.conversionCount;

        return {
          productId: p.id,
          productTitle: p.title,
          platform: d.platform,
          affiliateAvailable: d.affiliateAvailable,
          commissionRate: d.commissionRate,
          estimatedCommission: d.estimatedCommission,
          clickCount: d.clickCount,
          conversionCount: d.conversionCount,
          shortLink: d.shortLink,
        };
      });

    const conversionRate =
      totalClicks > 0
        ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2))
        : 0;

    return {
      summary: {
        totalClicks,
        totalConversions,
        conversionRate,
        totalEstimatedRevenue: parseFloat(totalEstimatedRevenue.toFixed(2)),
      },
      breakdown,
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /** Returns true when the product has a non-empty affiliate URL. */
  detectAffiliateAvailability(product: { affiliateUrl: string | null }): boolean {
    return !!(product.affiliateUrl && product.affiliateUrl.trim().length > 0);
  }

  /** Calculates estimated commission for a single conversion. */
  calculateEstimatedCommission(
    price: number | null | undefined,
    commissionRate: number,
  ): number {
    if (!price || price <= 0 || commissionRate <= 0) return 0;
    return parseFloat(((price * commissionRate) / 100).toFixed(2));
  }

  /** Generates a URL-safe 8-character short code. */
  generateShortCode(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
  }

  /** Builds the full short link from a short code. */
  buildShortLink(shortCode: string): string {
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3001';
    return `${baseUrl}/r/${shortCode}`;
  }

  /** Maps a Prisma SourceType to an AffiliatePlatform enum value. */
  private platformFromSourceType(sourceType: string): AffiliatePlatform {
    const map: Record<string, AffiliatePlatform> = {
      SHOPEE: AffiliatePlatform.SHOPEE,
      TIKTOK: AffiliatePlatform.TIKTOK,
      TOKOPEDIA: AffiliatePlatform.TOKOPEDIA,
      AMAZON: AffiliatePlatform.AMAZON,
    };
    return map[sourceType] ?? AffiliatePlatform.SHOPEE;
  }

  /** Default commission rates per platform (percentage). */
  private defaultCommissionRate(platform: AffiliatePlatform): number {
    const rates: Record<AffiliatePlatform, number> = {
      [AffiliatePlatform.SHOPEE]: 5,
      [AffiliatePlatform.TIKTOK]: 8,
      [AffiliatePlatform.TOKOPEDIA]: 5,
      [AffiliatePlatform.AMAZON]: 4,
    };
    return rates[platform] ?? 5;
  }
}
