import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OpportunityResult {
  product: {
    id: string;
    title: string;
    price: number | null;
    sourceType: string;
    searchVolume: number | null;
    growthVelocity: number | null;
    seasonality: number | null;
    creatorCount: number | null;
  };
  score: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH';
  profitPotential: number;
  recommendation: string;
}

@Injectable()
export class OpportunityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Score all products for a user and return them ordered by score descending.
   */
  async getOpportunities(userId: string): Promise<OpportunityResult[]> {
    const products = await this.prisma.product.findMany({
      where: { userId },
      include: {
        affiliateData: true,
        trendAnalyses: { orderBy: { analyzedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = products.map(p => this.scoreProduct(p));
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Score a single product (ownership-checked).
   */
  async getOpportunityById(productId: string, userId: string): Promise<OpportunityResult> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
      include: {
        affiliateData: true,
        trendAnalyses: { orderBy: { analyzedAt: 'desc' }, take: 1 },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.scoreProduct(product);
  }

  // ─── Scoring engine ────────────────────────────────────────────────────────

  /**
   * Scores a product using the 5-factor opportunity formula:
   *
   *   Opportunity Score =
   *     30% × growthRate
   *   + 25% × engagement
   *   + 20% × competitionLow
   *   + 15% × affiliateCommission
   *   + 10% × searchVolume
   *
   * Each factor is normalised to a 0–100 scale before weighting.
   */
  scoreProduct(product: {
    id: string;
    title: string;
    price: number | null;
    rating: number | null;
    soldCount: number | null;
    sourceType: string;
    searchVolume: number | null;
    growthVelocity: number | null;
    seasonality: number | null;
    creatorCount: number | null;
    affiliateData: {
      commissionRate: number;
      estimatedCommission: number;
    } | null;
    trendAnalyses: {
      estimatedConversion: number;
    }[];
  }): OpportunityResult {
    const growthScore = this.normalizeGrowthVelocity(product.growthVelocity);
    const engagementScore = this.normalizeEngagement(product.rating, product.soldCount);
    const competitionScore = this.normalizeCompetitionLow(product.creatorCount);
    const commissionScore = this.normalizeCommission(product.affiliateData?.commissionRate);
    const searchScore = this.normalizeSearchVolume(product.searchVolume);

    const score = parseFloat(
      (
        growthScore * 0.30 +
        engagementScore * 0.25 +
        competitionScore * 0.20 +
        commissionScore * 0.15 +
        searchScore * 0.10
      ).toFixed(2),
    );

    const competition = this.classifyCompetition(competitionScore);
    const profitPotential = this.calcProfitPotential(
      product.affiliateData,
      product.trendAnalyses[0]?.estimatedConversion ?? 0,
    );
    const recommendation = this.buildRecommendation(score);

    return {
      product: {
        id: product.id,
        title: product.title,
        price: product.price,
        sourceType: product.sourceType,
        searchVolume: product.searchVolume,
        growthVelocity: product.growthVelocity,
        seasonality: product.seasonality,
        creatorCount: product.creatorCount,
      },
      score,
      competition,
      profitPotential,
      recommendation,
    };
  }

  // ─── Individual factor normalisers (public so they can be unit-tested) ────

  /** Normalises growthVelocity (% per period) to 0–100.  Cap at 200 %. */
  normalizeGrowthVelocity(value: number | null | undefined): number {
    if (value == null) return 0;
    return Math.min(Math.max(value, 0), 200) / 2;
  }

  /**
   * Engagement: 60 % from star rating (0–5 → 0–100) +
   *             40 % from soldCount (cap at 10 000).
   */
  normalizeEngagement(
    rating: number | null | undefined,
    soldCount: number | null | undefined,
  ): number {
    const ratingScore = Math.min(Math.max(rating ?? 0, 0), 5) / 5;
    const soldScore = Math.min(Math.max(soldCount ?? 0, 0), 10_000) / 10_000;
    return (ratingScore * 0.6 + soldScore * 0.4) * 100;
  }

  /** Competition-low score: fewer creators → higher score. Cap at 200 creators. */
  normalizeCompetitionLow(creatorCount: number | null | undefined): number {
    if (creatorCount == null) return 50; // neutral when unknown
    const normalised = Math.min(Math.max(creatorCount, 0), 200) / 200;
    return (1 - normalised) * 100;
  }

  /** Normalises commission rate (%) to 0–100.  Cap at 20 %. */
  normalizeCommission(commissionRate: number | null | undefined): number {
    if (commissionRate == null) return 0;
    return Math.min(Math.max(commissionRate, 0), 20) / 20 * 100;
  }

  /** Normalises search volume to 0–100.  Cap at 100 000. */
  normalizeSearchVolume(searchVolume: number | null | undefined): number {
    if (searchVolume == null) return 0;
    return Math.min(Math.max(searchVolume, 0), 100_000) / 100_000 * 100;
  }

  /** Returns a competition label based on the competition-low score. */
  classifyCompetition(competitionScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (competitionScore >= 66) return 'LOW';
    if (competitionScore >= 33) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Profit potential = estimated commission per sale × estimated conversion count.
   * Returns 0 when data is unavailable.
   */
  calcProfitPotential(
    affiliateData: { estimatedCommission: number } | null | undefined,
    estimatedConversion: number,
  ): number {
    if (!affiliateData) return 0;
    return parseFloat((affiliateData.estimatedCommission * estimatedConversion).toFixed(2));
  }

  /** Converts an opportunity score into a human-readable recommendation. */
  buildRecommendation(score: number): string {
    if (score >= 70) return 'Strong Buy: High growth potential with good margins';
    if (score >= 50) return 'Consider: Moderate opportunity with manageable competition';
    if (score >= 30) return 'Caution: Limited opportunity or high competition';
    return 'Skip: Low opportunity score';
  }
}
