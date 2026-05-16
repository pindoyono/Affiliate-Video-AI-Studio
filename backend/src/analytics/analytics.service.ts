import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackEventDto } from './analytics.dto';

export interface VideoAnalyticsSummary {
  videoId: string;
  title: string;
  totalViews: number;
  totalClicks: number;
  ctr: number;
  avgWatchTime: number;
  avgRetention: number;
  totalConversions: number;
  totalRevenue: number;
  totalRoi: number;
}

export interface DashboardResult {
  totalVideos: number;
  totalViews: number;
  totalClicks: number;
  avgCtr: number;
  totalRevenue: number;
  avgRoi: number;
  topVideos: VideoAnalyticsSummary[];
}

export interface RevenueResult {
  totalRevenue: number;
  totalConversions: number;
  avgRevenuePerVideo: number;
  breakdown: {
    videoId: string;
    title: string;
    revenue: number;
    conversions: number;
    roi: number;
  }[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ─── Write path ───────────────────────────────────────────────────────────

  /**
   * Record a new analytics event (view / click / watch) for a video.
   * CTR and ROI are derived and stored automatically.
   */
  async trackEvent(dto: TrackEventDto, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: dto.videoId, userId },
    });
    if (!video) throw new NotFoundException('Video not found');

    const views = dto.views ?? 0;
    const clicks = dto.clicks ?? 0;
    const ctr = this.calcCtr(views, clicks);
    const revenue = dto.revenue ?? 0;
    const cost = dto.cost ?? 0;
    const roi = this.calcRoi(revenue, cost);
    const conversion = views > 0 ? parseFloat(((clicks / views) * 100).toFixed(2)) : 0;

    return this.prisma.videoAnalytics.create({
      data: {
        videoId: dto.videoId,
        views,
        clicks,
        ctr,
        watchTime: dto.watchTime ?? 0,
        retention: dto.retention ?? 0,
        conversion,
        revenue,
        roi,
      },
    });
  }

  // ─── Read path ────────────────────────────────────────────────────────────

  /**
   * Returns aggregated analytics for a single video (ownership-checked).
   */
  async getVideoAnalytics(videoId: string, userId: string): Promise<VideoAnalyticsSummary> {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
    });
    if (!video) throw new NotFoundException('Video not found');

    const records = await this.prisma.videoAnalytics.findMany({
      where: { videoId },
    });

    return this.aggregateRecords(videoId, video.title, records);
  }

  /**
   * High-level dashboard: totals + top 10 videos by revenue.
   */
  async getDashboard(userId: string): Promise<DashboardResult> {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      include: { analytics: true },
    });

    let totalViews = 0;
    let totalClicks = 0;
    let totalRevenue = 0;
    let totalRoi = 0;

    const summaries: VideoAnalyticsSummary[] = videos.map(v => {
      const s = this.aggregateRecords(v.id, v.title, v.analytics);
      totalViews += s.totalViews;
      totalClicks += s.totalClicks;
      totalRevenue += s.totalRevenue;
      totalRoi += s.totalRoi;
      return s;
    });

    const totalVideos = videos.length;
    const avgCtr = this.calcCtr(totalViews, totalClicks);
    const avgRoi = totalVideos > 0 ? parseFloat((totalRoi / totalVideos).toFixed(2)) : 0;

    const topVideos = [...summaries]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return {
      totalVideos,
      totalViews,
      totalClicks,
      avgCtr,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      avgRoi,
      topVideos,
    };
  }

  /**
   * Revenue breakdown across all videos owned by the user.
   */
  async getRevenue(userId: string): Promise<RevenueResult> {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      include: { analytics: true },
    });

    let totalRevenue = 0;
    let totalConversions = 0;

    const breakdown = videos
      .map(v => {
        const s = this.aggregateRecords(v.id, v.title, v.analytics);
        totalRevenue += s.totalRevenue;
        totalConversions += s.totalConversions;
        return {
          videoId: v.id,
          title: v.title,
          revenue: s.totalRevenue,
          conversions: s.totalConversions,
          roi: s.totalRoi,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const avgRevenuePerVideo =
      videos.length > 0
        ? parseFloat((totalRevenue / videos.length).toFixed(2))
        : 0;

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalConversions,
      avgRevenuePerVideo,
      breakdown,
    };
  }

  // ─── Helpers (public for unit-testing) ───────────────────────────────────

  /**
   * Click-through rate as a percentage (0-100).
   * Returns 0 when views is 0 to avoid division by zero.
   */
  calcCtr(views: number, clicks: number): number {
    if (views <= 0) return 0;
    return parseFloat(((clicks / views) * 100).toFixed(2));
  }

  /**
   * Return on Investment as a percentage.
   * ROI = ((revenue - cost) / cost) * 100
   * Returns 0 when cost is 0.
   */
  calcRoi(revenue: number, cost: number): number {
    if (cost <= 0) return 0;
    return parseFloat((((revenue - cost) / cost) * 100).toFixed(2));
  }

  /**
   * Aggregates a list of `VideoAnalytics` records into a summary object.
   */
  aggregateRecords(
    videoId: string,
    title: string,
    records: {
      views: number;
      clicks: number;
      watchTime: number;
      retention: number;
      conversion: number;
      revenue: number;
      roi: number;
    }[],
  ): VideoAnalyticsSummary {
    if (records.length === 0) {
      return {
        videoId,
        title,
        totalViews: 0,
        totalClicks: 0,
        ctr: 0,
        avgWatchTime: 0,
        avgRetention: 0,
        totalConversions: 0,
        totalRevenue: 0,
        totalRoi: 0,
      };
    }

    const totalViews = records.reduce((s, r) => s + r.views, 0);
    const totalClicks = records.reduce((s, r) => s + r.clicks, 0);
    const ctr = this.calcCtr(totalViews, totalClicks);
    const avgWatchTime = parseFloat(
      (records.reduce((s, r) => s + r.watchTime, 0) / records.length).toFixed(2),
    );
    const avgRetention = parseFloat(
      (records.reduce((s, r) => s + r.retention, 0) / records.length).toFixed(2),
    );
    const totalConversions = parseFloat(
      records.reduce((s, r) => s + r.conversion, 0).toFixed(2),
    );
    const totalRevenue = parseFloat(
      records.reduce((s, r) => s + r.revenue, 0).toFixed(2),
    );
    const totalRoi = parseFloat(
      (records.reduce((s, r) => s + r.roi, 0) / records.length).toFixed(2),
    );

    return {
      videoId,
      title,
      totalViews,
      totalClicks,
      ctr,
      avgWatchTime,
      avgRetention,
      totalConversions,
      totalRevenue,
      totalRoi,
    };
  }
}
