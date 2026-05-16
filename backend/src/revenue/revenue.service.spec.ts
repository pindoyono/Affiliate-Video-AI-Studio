import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeReport(overrides: Partial<{
  cost: number;
  revenue: number;
  profit: number;
  roi: number;
}> = {}) {
  return {
    cost: 100,
    revenue: 200,
    profit: 100,
    roi: 100,
    ...overrides,
  };
}

const baseVideo = {
  id: 'video-1',
  title: 'Test Video',
  userId: 'user-1',
  revenueReports: [makeReport()],
};

const mockPrisma = {
  video: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  revenueReport: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('RevenueService', () => {
  let service: RevenueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RevenueService>(RevenueService);
    jest.resetAllMocks();
  });

  // ─── calcProfit ──────────────────────────────────────────────────────────

  describe('calcProfit', () => {
    it('returns revenue - cost', () => {
      expect(service.calcProfit(200, 100)).toBe(100);
    });

    it('returns negative profit when cost exceeds revenue', () => {
      expect(service.calcProfit(50, 200)).toBe(-150);
    });

    it('returns 0 when revenue equals cost', () => {
      expect(service.calcProfit(100, 100)).toBe(0);
    });

    it('rounds to 2 decimal places', () => {
      expect(service.calcProfit(10.005, 3.333)).toBeCloseTo(6.67, 2);
    });
  });

  // ─── calcRoi ─────────────────────────────────────────────────────────────

  describe('calcRoi', () => {
    it('returns 0 when cost is 0', () => {
      expect(service.calcRoi(200, 0)).toBe(0);
    });

    it('returns 100% when revenue is double the cost', () => {
      expect(service.calcRoi(200, 100)).toBe(100);
    });

    it('returns negative ROI when revenue < cost', () => {
      expect(service.calcRoi(50, 100)).toBe(-50);
    });

    it('returns 0% when revenue equals cost (break even)', () => {
      expect(service.calcRoi(100, 100)).toBe(0);
    });

    it('rounds to 2 decimal places', () => {
      // ((10 - 3) / 3) * 100 = 233.33...
      expect(service.calcRoi(10, 3)).toBeCloseTo(233.33, 1);
    });
  });

  // ─── aggregateVideoReports ────────────────────────────────────────────────

  describe('aggregateVideoReports', () => {
    it('returns zero-summary for empty reports', () => {
      const result = service.aggregateVideoReports('v1', 'My Video', []);
      expect(result).toEqual({
        videoId: 'v1',
        title: 'My Video',
        totalCost: 0,
        totalRevenue: 0,
        totalProfit: 0,
        avgRoi: 0,
        reportCount: 0,
      });
    });

    it('sums cost, revenue, profit across multiple reports', () => {
      const reports = [
        makeReport({ cost: 100, revenue: 200, profit: 100, roi: 100 }),
        makeReport({ cost: 50,  revenue: 100, profit: 50,  roi: 100 }),
      ];
      const result = service.aggregateVideoReports('v1', 'V', reports);
      expect(result.totalCost).toBe(150);
      expect(result.totalRevenue).toBe(300);
      expect(result.totalProfit).toBe(150);
      expect(result.reportCount).toBe(2);
    });

    it('averages ROI across reports', () => {
      const reports = [
        makeReport({ roi: 80 }),
        makeReport({ roi: 120 }),
      ];
      const result = service.aggregateVideoReports('v1', 'V', reports);
      expect(result.avgRoi).toBe(100);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a RevenueReport with computed profit and ROI', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(baseVideo);
      const created = { id: 'rr-1', videoId: 'video-1', cost: 100, revenue: 300, profit: 200, roi: 200 };
      mockPrisma.revenueReport.create.mockResolvedValue(created);

      const result = await service.create(
        { videoId: 'video-1', cost: 100, revenue: 300 },
        'user-1',
      );

      expect(result).toBe(created);
      const data = mockPrisma.revenueReport.create.mock.calls[0][0].data;
      expect(data.profit).toBe(200);
      expect(data.roi).toBe(200);
    });

    it('throws NotFoundException when video does not belong to user', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ videoId: 'x', cost: 10, revenue: 20 }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('stores 0 profit and 0 roi when cost equals revenue', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(baseVideo);
      mockPrisma.revenueReport.create.mockResolvedValue({});

      await service.create({ videoId: 'video-1', cost: 100, revenue: 100 }, 'user-1');

      const data = mockPrisma.revenueReport.create.mock.calls[0][0].data;
      expect(data.profit).toBe(0);
      expect(data.roi).toBe(0);
    });
  });

  // ─── getDashboard ─────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns aggregated totals and top videos sorted by profit', async () => {
      const videos = [
        {
          ...baseVideo,
          id: 'v1',
          title: 'Video 1',
          revenueReports: [makeReport({ cost: 50, revenue: 100, profit: 50, roi: 100 })],
        },
        {
          ...baseVideo,
          id: 'v2',
          title: 'Video 2',
          revenueReports: [makeReport({ cost: 100, revenue: 400, profit: 300, roi: 300 })],
        },
      ];
      mockPrisma.video.findMany.mockResolvedValue(videos);

      const result = await service.getDashboard('user-1');

      expect(result.totalVideos).toBe(2);
      expect(result.totalCost).toBe(150);
      expect(result.totalRevenue).toBe(500);
      expect(result.totalProfit).toBe(350);
      expect(result.topVideos[0].videoId).toBe('v2'); // highest profit first
    });

    it('returns empty dashboard when user has no videos', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('user-1');

      expect(result.totalVideos).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.totalProfit).toBe(0);
      expect(result.avgRoi).toBe(0);
      expect(result.topVideos).toHaveLength(0);
    });
  });

  // ─── getVideoRevenue ──────────────────────────────────────────────────────

  describe('getVideoRevenue', () => {
    it('returns aggregated summary for an owned video', async () => {
      mockPrisma.video.findFirst.mockResolvedValue({ id: 'video-1', title: 'Test' });
      mockPrisma.revenueReport.findMany.mockResolvedValue([
        makeReport({ cost: 100, revenue: 250, profit: 150, roi: 150 }),
      ]);

      const result = await service.getVideoRevenue('video-1', 'user-1');

      expect(result.videoId).toBe('video-1');
      expect(result.totalCost).toBe(100);
      expect(result.totalRevenue).toBe(250);
      expect(result.totalProfit).toBe(150);
      expect(result.avgRoi).toBe(150);
    });

    it('throws NotFoundException when video is not found', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);

      await expect(
        service.getVideoRevenue('unknown', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns zeros for a video with no reports', async () => {
      mockPrisma.video.findFirst.mockResolvedValue({ id: 'video-1', title: 'T' });
      mockPrisma.revenueReport.findMany.mockResolvedValue([]);

      const result = await service.getVideoRevenue('video-1', 'user-1');

      expect(result.totalRevenue).toBe(0);
      expect(result.totalProfit).toBe(0);
      expect(result.avgRoi).toBe(0);
    });
  });

  // ─── getReport ────────────────────────────────────────────────────────────

  describe('getReport', () => {
    it('returns all revenue report records for the user\'s videos', async () => {
      mockPrisma.video.findMany.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }]);
      const records = [
        { id: 'rr-1', videoId: 'v1', cost: 100, revenue: 200, profit: 100, roi: 100, createdAt: new Date() },
        { id: 'rr-2', videoId: 'v2', cost: 50, revenue: 150, profit: 100, roi: 200, createdAt: new Date() },
      ];
      mockPrisma.revenueReport.findMany.mockResolvedValue(records);

      const result = await service.getReport('user-1');

      expect(result.total).toBe(2);
      expect(result.records).toHaveLength(2);
    });

    it('returns empty list when user has no videos', async () => {
      mockPrisma.video.findMany.mockResolvedValue([]);
      mockPrisma.revenueReport.findMany.mockResolvedValue([]);

      const result = await service.getReport('user-1');

      expect(result.total).toBe(0);
      expect(result.records).toHaveLength(0);
    });
  });
});
