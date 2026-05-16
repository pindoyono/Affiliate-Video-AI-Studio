import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueReportDto } from './revenue.dto';

export interface RevenueReportRecord {
  id: string;
  videoId: string;
  cost: number;
  revenue: number;
  profit: number;
  roi: number;
  createdAt: Date;
}

export interface VideoRevenueSummary {
  videoId: string;
  title: string;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  avgRoi: number;
  reportCount: number;
}

export interface RevenueDashboard {
  totalVideos: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  avgRoi: number;
  topVideos: VideoRevenueSummary[];
}

export interface RevenueReportList {
  total: number;
  records: RevenueReportRecord[];
}

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  // ─── Write path ─────────────────────────────────────────────────────────────

  /**
   * Create a revenue report entry for a video (ownership-checked).
   * Profit and ROI are automatically computed from cost and revenue.
   */
  async create(dto: CreateRevenueReportDto, userId: string): Promise<RevenueReportRecord> {
    const video = await this.prisma.video.findFirst({
      where: { id: dto.videoId, userId },
    });
    if (!video) throw new NotFoundException('Video not found');

    const profit = this.calcProfit(dto.revenue, dto.cost);
    const roi = this.calcRoi(dto.revenue, dto.cost);

    return this.prisma.revenueReport.create({
      data: {
        videoId: dto.videoId,
        cost: dto.cost,
        revenue: dto.revenue,
        profit,
        roi,
      },
    });
  }

  // ─── Read path ───────────────────────────────────────────────────────────────

  /**
   * Dashboard: aggregated revenue metrics across all videos owned by user.
   */
  async getDashboard(userId: string): Promise<RevenueDashboard> {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      include: { revenueReports: true },
    });

    let totalCost = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let roiSum = 0;

    const summaries: VideoRevenueSummary[] = videos.map(v => {
      const s = this.aggregateVideoReports(v.id, v.title, v.revenueReports);
      totalCost += s.totalCost;
      totalRevenue += s.totalRevenue;
      totalProfit += s.totalProfit;
      roiSum += s.avgRoi;
      return s;
    });

    const totalVideos = videos.length;
    const avgRoi = totalVideos > 0 ? parseFloat((roiSum / totalVideos).toFixed(2)) : 0;
    const topVideos = [...summaries]
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10);

    return {
      totalVideos,
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      avgRoi,
      topVideos,
    };
  }

  /**
   * Revenue metrics for a specific video (ownership-checked).
   */
  async getVideoRevenue(videoId: string, userId: string): Promise<VideoRevenueSummary> {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
    });
    if (!video) throw new NotFoundException('Video not found');

    const reports = await this.prisma.revenueReport.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
    });

    return this.aggregateVideoReports(videoId, video.title, reports);
  }

  /**
   * Full paginated list of revenue report records for the user's videos.
   */
  async getReport(userId: string): Promise<RevenueReportList> {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      select: { id: true },
    });
    const videoIds = videos.map(v => v.id);

    const records = await this.prisma.revenueReport.findMany({
      where: { videoId: { in: videoIds } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      total: records.length,
      records,
    };
  }

  // ─── Calculators (public for unit-testing) ────────────────────────────────

  /**
   * Profit = Revenue - Cost
   */
  calcProfit(revenue: number, cost: number): number {
    return parseFloat((revenue - cost).toFixed(2));
  }

  /**
   * ROI = ((Revenue - Cost) / Cost) * 100
   * Returns 0 when cost is 0 to avoid division by zero.
   */
  calcRoi(revenue: number, cost: number): number {
    if (cost <= 0) return 0;
    return parseFloat((((revenue - cost) / cost) * 100).toFixed(2));
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  aggregateVideoReports(
    videoId: string,
    title: string,
    reports: { cost: number; revenue: number; profit: number; roi: number }[],
  ): VideoRevenueSummary {
    if (reports.length === 0) {
      return { videoId, title, totalCost: 0, totalRevenue: 0, totalProfit: 0, avgRoi: 0, reportCount: 0 };
    }

    const totalCost    = parseFloat(reports.reduce((s, r) => s + r.cost,    0).toFixed(2));
    const totalRevenue = parseFloat(reports.reduce((s, r) => s + r.revenue, 0).toFixed(2));
    const totalProfit  = parseFloat(reports.reduce((s, r) => s + r.profit,  0).toFixed(2));
    const avgRoi       = parseFloat(
      (reports.reduce((s, r) => s + r.roi, 0) / reports.length).toFixed(2),
    );

    return { videoId, title, totalCost, totalRevenue, totalProfit, avgRoi, reportCount: reports.length };
  }
}
