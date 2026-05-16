import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Shared fixture helpers ───────────────────────────────────────────────────

function makeRecord(overrides: Partial<{
  views: number; clicks: number; watchTime: number;
  retention: number; conversion: number; revenue: number; roi: number;
}> = {}) {
  return {
    views: 100,
    clicks: 10,
    watchTime: 60,
    retention: 70,
    conversion: 10,
    revenue: 50,
    roi: 20,
    ...overrides,
  };
}

const baseVideo = {
  id: 'video-1',
  title: 'Test Video',
  userId: 'user-1',
  analytics: [makeRecord()],
};

const mockPrisma = {
  video: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  videoAnalytics: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  // ─── calcCtr ─────────────────────────────────────────────────────────────

  describe('calcCtr', () => {
    it('returns 0 when views is 0', () => expect(service.calcCtr(0, 5)).toBe(0));
    it('returns 10 % for 10 clicks / 100 views', () =>
      expect(service.calcCtr(100, 10)).toBe(10));
    it('returns 100 % when clicks equal views', () =>
      expect(service.calcCtr(50, 50)).toBe(100));
    it('rounds to 2 decimal places', () =>
      expect(service.calcCtr(3, 1)).toBe(33.33));
  });

  // ─── calcRoi ─────────────────────────────────────────────────────────────

  describe('calcRoi', () => {
    it('returns 0 when cost is 0', () => expect(service.calcRoi(100, 0)).toBe(0));
    it('returns 100 % when revenue equals 2× cost', () =>
      expect(service.calcRoi(200, 100)).toBe(100));
    it('returns negative ROI when revenue < cost', () =>
      expect(service.calcRoi(50, 100)).toBe(-50));
    it('rounds to 2 decimal places', () =>
      expect(service.calcRoi(10, 3)).toBeCloseTo(233.33, 1));
  });

  // ─── aggregateRecords ─────────────────────────────────────────────────────

  describe('aggregateRecords', () => {
    it('returns zero-summary for empty records array', () => {
      const result = service.aggregateRecords('v1', 'My Video', []);
      expect(result).toEqual({
        videoId: 'v1',
        title: 'My Video',
        totalViews: 0,
        totalClicks: 0,
        ctr: 0,
        avgWatchTime: 0,
        avgRetention: 0,
        totalConversions: 0,
        totalRevenue: 0,
        totalRoi: 0,
      });
    });

    it('sums views and clicks correctly', () => {
      const records = [makeRecord({ views: 100, clicks: 10 }), makeRecord({ views: 200, clicks: 20 })];
      const result = service.aggregateRecords('v1', 'V', records);
      expect(result.totalViews).toBe(300);
      expect(result.totalClicks).toBe(30);
    });

    it('calculates CTR from totals', () => {
      const records = [makeRecord({ views: 200, clicks: 20 })];
      const result = service.aggregateRecords('v1', 'V', records);
      expect(result.ctr).toBe(10);
    });

    it('averages watchTime and retention', () => {
      const records = [
        makeRecord({ watchTime: 60, retention: 80 }),
        makeRecord({ watchTime: 40, retention: 60 }),
      ];
      const result = service.aggregateRecords('v1', 'V', records);
      expect(result.avgWatchTime).toBe(50);
      expect(result.avgRetention).toBe(70);
    });

    it('sums revenue correctly', () => {
      const records = [makeRecord({ revenue: 30 }), makeRecord({ revenue: 20 })];
      const result = service.aggregateRecords('v1', 'V', records);
      expect(result.totalRevenue).toBe(50);
    });
  });

  // ─── trackEvent ──────────────────────────────────────────────────────────

  describe('trackEvent', () => {
    it('creates a VideoAnalytics record with computed CTR and ROI', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(baseVideo);
      const created = { id: 'rec-1', videoId: 'video-1', views: 100, clicks: 10, ctr: 10, roi: 100 };
      mockPrisma.videoAnalytics.create.mockResolvedValue(created);

      const result = await service.trackEvent(
        { videoId: 'video-1', views: 100, clicks: 10, revenue: 200, cost: 100 },
        'user-1',
      );

      expect(result).toBe(created);
      const createCall = mockPrisma.videoAnalytics.create.mock.calls[0][0];
      expect(createCall.data.ctr).toBe(10);
      expect(createCall.data.roi).toBe(100);
    });

    it('throws NotFoundException when video does not belong to user', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);

      await expect(
        service.trackEvent({ videoId: 'x', views: 1 }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('defaults views, clicks, revenue to 0 when omitted', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(baseVideo);
      mockPrisma.videoAnalytics.create.mockResolvedValue({});

      await service.trackEvent({ videoId: 'video-1' }, 'user-1');

      const data = mockPrisma.videoAnalytics.create.mock.calls[0][0].data;
      expect(data.views).toBe(0);
      expect(data.clicks).toBe(0);
      expect(data.revenue).toBe(0);
      expect(data.ctr).toBe(0);
      expect(data.roi).toBe(0);
    });
  });

  // ─── getVideoAnalytics ───────────────────────────────────────────────────

  describe('getVideoAnalytics', () => {
    it('returns an aggregated summary for an owned video', async () => {
      mockPrisma.video.findFirst.mockResolvedValue({ id: 'video-1', title: 'T' });
      mockPrisma.videoAnalytics.findMany.mockResolvedValue([makeRecord()]);

      const result = await service.getVideoAnalytics('video-1', 'user-1');

      expect(result.videoId).toBe('video-1');
      expect(result.totalViews).toBe(100);
      expect(result.totalClicks).toBe(10);
      expect(result.ctr).toBe(10);
    });

    it('throws NotFoundException when video is not found', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);

      await expect(
        service.getVideoAnalytics('unknown', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns zeros for a video with no analytics records', async () => {
      mockPrisma.video.findFirst.mockResolvedValue({ id: 'video-1', title: 'T' });
      mockPrisma.videoAnalytics.findMany.mockResolvedValue([]);

      const result = await service.getVideoAnalytics('video-1', 'user-1');
      expect(result.totalViews).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });

  // ─── getDashboard ────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns correct totals and top videos', async () => {
      const videos = [
        { ...baseVideo, id: 'v1', title: 'Video 1', analytics: [makeRecord({ views: 100, clicks: 10, revenue: 50 })] },
        { ...baseVideo, id: 'v2', title: 'Video 2', analytics: [makeRecord({ views: 200, clicks: 40, revenue: 100 })] },
      ];
      mockPrisma.video.findMany.mockResolvedValue(videos);

      const result = await service.getDashboard('user-1');

      expect(result.totalVideos).toBe(2);
      expect(result.totalViews).toBe(300);
      expect(result.totalClicks).toBe(50);
      expect(result.totalRevenue).toBe(150);
      expect(result.topVideos[0].videoId).toBe('v2'); // higher revenue first
    });

    it('returns empty dashboard when user has no videos', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('user-1');

      expect(result.totalVideos).toBe(0);
      expect(result.totalViews).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.topVideos).toHaveLength(0);
    });
  });

  // ─── getRevenue ──────────────────────────────────────────────────────────

  describe('getRevenue', () => {
    it('returns correct revenue totals and breakdown', async () => {
      const videos = [
        { ...baseVideo, id: 'v1', title: 'Video 1', analytics: [makeRecord({ revenue: 30, conversion: 3 })] },
        { ...baseVideo, id: 'v2', title: 'Video 2', analytics: [makeRecord({ revenue: 70, conversion: 7 })] },
      ];
      mockPrisma.video.findMany.mockResolvedValue(videos);

      const result = await service.getRevenue('user-1');

      expect(result.totalRevenue).toBe(100);
      expect(result.avgRevenuePerVideo).toBe(50);
      expect(result.breakdown[0].videoId).toBe('v2'); // sorted desc by revenue
      expect(result.breakdown[1].videoId).toBe('v1');
    });

    it('returns zeros when user has no videos', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      const result = await service.getRevenue('user-1');

      expect(result.totalRevenue).toBe(0);
      expect(result.avgRevenuePerVideo).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });
});
