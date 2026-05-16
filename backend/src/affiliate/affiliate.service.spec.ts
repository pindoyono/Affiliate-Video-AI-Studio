import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AffiliatePlatform } from '@prisma/client';
import { AffiliateService } from './affiliate.service';
import { PrismaService } from '../prisma/prisma.service';

const mockProduct = {
  id: 'prod-uuid-1',
  userId: 'user-uuid-1',
  title: 'Test Product',
  price: 100,
  affiliateUrl: 'https://shopee.co.id/affiliate/123',
  sourceType: 'SHOPEE',
};

const mockAffiliateData = {
  id: 'aff-uuid-1',
  productId: 'prod-uuid-1',
  platform: AffiliatePlatform.SHOPEE,
  commissionRate: 5,
  estimatedCommission: 5,
  affiliateAvailable: true,
  shortCode: 'abc12345',
  shortLink: 'http://localhost:3001/r/abc12345',
  clickCount: 10,
  conversionCount: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  affiliateData: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('AffiliateService', () => {
  let service: AffiliateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AffiliateService>(AffiliateService);
    jest.clearAllMocks();
  });

  // ─── detectAffiliateAvailability ─────────────────────────────────────────

  describe('detectAffiliateAvailability', () => {
    it('returns true when affiliateUrl is present', () => {
      expect(
        service.detectAffiliateAvailability({ affiliateUrl: 'https://example.com' }),
      ).toBe(true);
    });

    it('returns false when affiliateUrl is null', () => {
      expect(service.detectAffiliateAvailability({ affiliateUrl: null })).toBe(false);
    });

    it('returns false when affiliateUrl is an empty string', () => {
      expect(service.detectAffiliateAvailability({ affiliateUrl: '' })).toBe(false);
    });

    it('returns false when affiliateUrl is whitespace only', () => {
      expect(service.detectAffiliateAvailability({ affiliateUrl: '   ' })).toBe(false);
    });
  });

  // ─── calculateEstimatedCommission ────────────────────────────────────────

  describe('calculateEstimatedCommission', () => {
    it('calculates correctly for a standard case', () => {
      expect(service.calculateEstimatedCommission(100, 5)).toBe(5);
    });

    it('rounds to 2 decimal places', () => {
      expect(service.calculateEstimatedCommission(33.33, 10)).toBe(3.33);
    });

    it('returns 0 when price is null', () => {
      expect(service.calculateEstimatedCommission(null, 5)).toBe(0);
    });

    it('returns 0 when price is 0', () => {
      expect(service.calculateEstimatedCommission(0, 5)).toBe(0);
    });

    it('returns 0 when commissionRate is 0', () => {
      expect(service.calculateEstimatedCommission(100, 0)).toBe(0);
    });
  });

  // ─── generateShortCode ───────────────────────────────────────────────────

  describe('generateShortCode', () => {
    it('returns an 8-character alphanumeric string', () => {
      const code = service.generateShortCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[a-f0-9]{8}$/);
    });

    it('generates unique codes on repeated calls', () => {
      const codes = new Set(Array.from({ length: 50 }, () => service.generateShortCode()));
      expect(codes.size).toBe(50);
    });
  });

  // ─── buildShortLink ──────────────────────────────────────────────────────

  describe('buildShortLink', () => {
    it('uses APP_BASE_URL env variable when set', () => {
      process.env.APP_BASE_URL = 'https://myapp.com';
      expect(service.buildShortLink('abc12345')).toBe('https://myapp.com/r/abc12345');
      delete process.env.APP_BASE_URL;
    });

    it('falls back to localhost when APP_BASE_URL is not set', () => {
      delete process.env.APP_BASE_URL;
      expect(service.buildShortLink('abc12345')).toBe('http://localhost:3001/r/abc12345');
    });
  });

  // ─── getByProductId ──────────────────────────────────────────────────────

  describe('getByProductId', () => {
    it('returns affiliate data for an owned product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.affiliateData.findUnique.mockResolvedValue(mockAffiliateData);

      const result = await service.getByProductId('prod-uuid-1', 'user-uuid-1');

      expect(result).toEqual(mockAffiliateData);
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'prod-uuid-1', userId: 'user-uuid-1' },
      });
    });

    it('throws NotFoundException when product is not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.getByProductId('prod-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when affiliate data does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.affiliateData.findUnique.mockResolvedValue(null);

      await expect(
        service.getByProductId('prod-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── generate ────────────────────────────────────────────────────────────

  describe('generate', () => {
    it('upserts and returns affiliate data', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.affiliateData.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateData.upsert.mockResolvedValue(mockAffiliateData);

      const result = await service.generate(
        { productId: 'prod-uuid-1', platform: AffiliatePlatform.SHOPEE, commissionRate: 5 },
        'user-uuid-1',
      );

      expect(result).toEqual(mockAffiliateData);
      expect(mockPrisma.affiliateData.upsert).toHaveBeenCalledTimes(1);
    });

    it('reuses existing short code on subsequent calls', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.affiliateData.findUnique.mockResolvedValue({
        shortCode: 'existing1',
      });
      mockPrisma.affiliateData.upsert.mockResolvedValue(mockAffiliateData);

      await service.generate({ productId: 'prod-uuid-1' }, 'user-uuid-1');

      const upsertCall = mockPrisma.affiliateData.upsert.mock.calls[0][0];
      expect(upsertCall.create.shortCode).toBe('existing1');
    });

    it('throws NotFoundException when product does not belong to user', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.generate({ productId: 'prod-uuid-1' }, 'other-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('uses defaults when platform and commissionRate are omitted', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.affiliateData.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateData.upsert.mockResolvedValue(mockAffiliateData);

      await service.generate({ productId: 'prod-uuid-1' }, 'user-uuid-1');

      const upsertCall = mockPrisma.affiliateData.upsert.mock.calls[0][0];
      expect(upsertCall.create.platform).toBe(AffiliatePlatform.SHOPEE);
      expect(upsertCall.create.commissionRate).toBe(5);
    });

    it('maps TIKTOK sourceType to AffiliatePlatform.TIKTOK', async () => {
      const tiktokProduct = { ...mockProduct, sourceType: 'TIKTOK' };
      mockPrisma.product.findFirst.mockResolvedValue(tiktokProduct);
      mockPrisma.affiliateData.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateData.upsert.mockResolvedValue({
        ...mockAffiliateData,
        platform: AffiliatePlatform.TIKTOK,
        commissionRate: 8,
      });

      await service.generate({ productId: 'prod-uuid-1' }, 'user-uuid-1');

      const upsertCall = mockPrisma.affiliateData.upsert.mock.calls[0][0];
      expect(upsertCall.create.platform).toBe(AffiliatePlatform.TIKTOK);
      expect(upsertCall.create.commissionRate).toBe(8);
    });

    it('maps unknown sourceType to AffiliatePlatform.SHOPEE as default', async () => {
      const manualProduct = { ...mockProduct, sourceType: 'MANUAL' };
      mockPrisma.product.findFirst.mockResolvedValue(manualProduct);
      mockPrisma.affiliateData.findUnique.mockResolvedValue(null);
      mockPrisma.affiliateData.upsert.mockResolvedValue(mockAffiliateData);

      await service.generate({ productId: 'prod-uuid-1' }, 'user-uuid-1');

      const upsertCall = mockPrisma.affiliateData.upsert.mock.calls[0][0];
      expect(upsertCall.create.platform).toBe(AffiliatePlatform.SHOPEE);
    });
  });

  // ─── getMetrics ──────────────────────────────────────────────────────────

  describe('getMetrics', () => {
    it('returns aggregated metrics and breakdown', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-uuid-1',
          title: 'Product A',
          affiliateData: { ...mockAffiliateData, clickCount: 10, conversionCount: 2, estimatedCommission: 5 },
        },
        {
          id: 'prod-uuid-2',
          title: 'Product B',
          affiliateData: null,
        },
      ]);

      const result = await service.getMetrics('user-uuid-1');

      expect(result.summary.totalClicks).toBe(10);
      expect(result.summary.totalConversions).toBe(2);
      expect(result.summary.conversionRate).toBe(20);
      expect(result.summary.totalEstimatedRevenue).toBe(10);
      expect(result.breakdown).toHaveLength(1);
    });

    it('handles a user with no affiliate data gracefully', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', title: 'P', affiliateData: null },
      ]);

      const result = await service.getMetrics('user-uuid-1');

      expect(result.summary.totalClicks).toBe(0);
      expect(result.summary.conversionRate).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });
});
