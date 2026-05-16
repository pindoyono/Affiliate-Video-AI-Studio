import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrendsService {
  constructor(private prisma: PrismaService) {}

  async analyzeProduct(productId: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Simulated trend analysis - in production would use real data sources
    const salesGrowth = Math.random() * 100;
    const engagementGrowth = Math.random() * 100;
    const affiliateAvailable = !!product.affiliateUrl;
    const competitionLevel = Math.random() * 100;
    const estimatedConversion = Math.random() * 10;

    const trendScore = this.calculateTrendScore({
      salesGrowth,
      engagementGrowth,
      affiliateAvailable,
      competitionLevel,
      estimatedConversion,
    });

    const analysis = await this.prisma.trendAnalysis.create({
      data: {
        productId,
        salesGrowth,
        engagementGrowth,
        affiliateAvailable,
        competitionLevel,
        estimatedConversion,
        trendScore,
      },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { trendScore },
    });

    return analysis;
  }

  calculateTrendScore(data: {
    salesGrowth: number;
    engagementGrowth: number;
    affiliateAvailable: boolean;
    competitionLevel: number;
    estimatedConversion: number;
  }): number {
    const normalizedSales = Math.min(data.salesGrowth / 100, 1);
    const normalizedEngagement = Math.min(data.engagementGrowth / 100, 1);
    const affiliateScore = data.affiliateAvailable ? 1 : 0;
    const normalizedCompetition = 1 - Math.min(data.competitionLevel / 100, 1);
    const normalizedConversion = Math.min(data.estimatedConversion / 10, 1);

    return (
      normalizedSales * 30 +
      normalizedEngagement * 25 +
      affiliateScore * 20 +
      normalizedCompetition * 15 +
      normalizedConversion * 10
    );
  }

  async getDashboard(userId: string) {
    const products = await this.prisma.product.findMany({
      where: { userId },
      include: {
        trendAnalyses: { orderBy: { analyzedAt: 'desc' }, take: 1 },
      },
      orderBy: { trendScore: 'desc' },
    });

    const totalProducts = products.length;
    const avgTrendScore =
      products.reduce((sum, p) => sum + (p.trendScore || 0), 0) / (totalProducts || 1);
    const topProducts = products.slice(0, 5);

    return { totalProducts, avgTrendScore, topProducts };
  }

  async getTrendsByProduct(productId: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.trendAnalysis.findMany({
      where: { productId },
      orderBy: { analyzedAt: 'desc' },
    });
  }

  async getAllTrends(userId: string) {
    return this.prisma.trendAnalysis.findMany({
      where: { product: { userId } },
      include: { product: true },
      orderBy: { analyzedAt: 'desc' },
      take: 50,
    });
  }
}
