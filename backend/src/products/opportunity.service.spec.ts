import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OpportunityService } from './opportunity.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const baseProduct = {
  id: 'prod-uuid-1',
  title: 'Test Product',
  price: 100,
  rating: 4.5,
  soldCount: 5000,
  sourceType: 'SHOPEE',
  searchVolume: 50_000,
  growthVelocity: 80,
  seasonality: 0.8,
  creatorCount: 40,
  affiliateData: {
    commissionRate: 10,
    estimatedCommission: 10,
  },
  trendAnalyses: [{ estimatedConversion: 5 }],
};

const mockPrisma = {
  product: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('OpportunityService', () => {
  let service: OpportunityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OpportunityService>(OpportunityService);
    jest.clearAllMocks();
  });

  // ─── normalizeGrowthVelocity ────────────────────────────────────────────────

  describe('normalizeGrowthVelocity', () => {
    it('maps 0 % to 0', () => expect(service.normalizeGrowthVelocity(0)).toBe(0));
    it('maps 100 % to 50', () => expect(service.normalizeGrowthVelocity(100)).toBe(50));
    it('maps 200 % to 100 (cap)', () => expect(service.normalizeGrowthVelocity(200)).toBe(100));
    it('clamps values above 200 %', () => expect(service.normalizeGrowthVelocity(300)).toBe(100));
    it('clamps negative values to 0', () => expect(service.normalizeGrowthVelocity(-10)).toBe(0));
    it('returns 0 for null', () => expect(service.normalizeGrowthVelocity(null)).toBe(0));
  });

  // ─── normalizeEngagement ───────────────────────────────────────────────────

  describe('normalizeEngagement', () => {
    it('returns 100 for perfect rating and max soldCount', () =>
      expect(service.normalizeEngagement(5, 10_000)).toBe(100));

    it('returns 0 for zero rating and zero soldCount', () =>
      expect(service.normalizeEngagement(0, 0)).toBe(0));

    it('weights rating at 60 % and soldCount at 40 %', () => {
      // rating 5/5 = 100 * 0.6 = 60; soldCount 0/10000 = 0 * 0.4 = 0 → 60
      expect(service.normalizeEngagement(5, 0)).toBeCloseTo(60, 1);
      // rating 0 = 0; soldCount 10000/10000 = 100 * 0.4 = 40 → 40
      expect(service.normalizeEngagement(0, 10_000)).toBeCloseTo(40, 1);
    });

    it('returns 0 when both are null', () =>
      expect(service.normalizeEngagement(null, null)).toBe(0));
  });

  // ─── normalizeCompetitionLow ──────────────────────────────────────────────

  describe('normalizeCompetitionLow', () => {
    it('returns 100 when creatorCount is 0 (no competition)', () =>
      expect(service.normalizeCompetitionLow(0)).toBe(100));

    it('returns 0 when creatorCount is 200 (max competition)', () =>
      expect(service.normalizeCompetitionLow(200)).toBe(0));

    it('returns 50 when creatorCount is 100', () =>
      expect(service.normalizeCompetitionLow(100)).toBe(50));

    it('returns 50 (neutral) when creatorCount is null', () =>
      expect(service.normalizeCompetitionLow(null)).toBe(50));

    it('clamps creatorCount above 200', () =>
      expect(service.normalizeCompetitionLow(500)).toBe(0));
  });

  // ─── normalizeCommission ──────────────────────────────────────────────────

  describe('normalizeCommission', () => {
    it('returns 0 for null', () => expect(service.normalizeCommission(null)).toBe(0));
    it('maps 20 % rate to 100', () => expect(service.normalizeCommission(20)).toBe(100));
    it('maps 10 % rate to 50', () => expect(service.normalizeCommission(10)).toBe(50));
    it('clamps rates above 20 %', () => expect(service.normalizeCommission(30)).toBe(100));
  });

  // ─── normalizeSearchVolume ────────────────────────────────────────────────

  describe('normalizeSearchVolume', () => {
    it('returns 0 for null', () => expect(service.normalizeSearchVolume(null)).toBe(0));
    it('maps 100 000 to 100', () => expect(service.normalizeSearchVolume(100_000)).toBe(100));
    it('maps 50 000 to 50', () => expect(service.normalizeSearchVolume(50_000)).toBe(50));
    it('clamps above 100 000', () => expect(service.normalizeSearchVolume(200_000)).toBe(100));
  });

  // ─── classifyCompetition ─────────────────────────────────────────────────

  describe('classifyCompetition', () => {
    it('returns LOW for score >= 66', () => expect(service.classifyCompetition(66)).toBe('LOW'));
    it('returns MEDIUM for score 33–65', () => {
      expect(service.classifyCompetition(65)).toBe('MEDIUM');
      expect(service.classifyCompetition(33)).toBe('MEDIUM');
    });
    it('returns HIGH for score < 33', () => expect(service.classifyCompetition(32)).toBe('HIGH'));
  });

  // ─── calcProfitPotential ─────────────────────────────────────────────────

  describe('calcProfitPotential', () => {
    it('returns 0 when affiliateData is null', () =>
      expect(service.calcProfitPotential(null, 5)).toBe(0));

    it('multiplies estimatedCommission by estimatedConversion', () =>
      expect(service.calcProfitPotential({ estimatedCommission: 10 }, 5)).toBe(50));

    it('returns 0 when conversion is 0', () =>
      expect(service.calcProfitPotential({ estimatedCommission: 10 }, 0)).toBe(0));
  });

  // ─── buildRecommendation ─────────────────────────────────────────────────

  describe('buildRecommendation', () => {
    it('returns Strong Buy for score >= 70', () =>
      expect(service.buildRecommendation(75)).toMatch(/Strong Buy/));

    it('returns Consider for score 50–69', () =>
      expect(service.buildRecommendation(55)).toMatch(/Consider/));

    it('returns Caution for score 30–49', () =>
      expect(service.buildRecommendation(40)).toMatch(/Caution/));

    it('returns Skip for score < 30', () =>
      expect(service.buildRecommendation(20)).toMatch(/Skip/));
  });

  // ─── scoreProduct ────────────────────────────────────────────────────────

  describe('scoreProduct', () => {
    it('returns a correctly structured OpportunityResult', () => {
      const result = service.scoreProduct(baseProduct);

      expect(result.product.id).toBe('prod-uuid-1');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.competition);
      expect(result.profitPotential).toBeGreaterThanOrEqual(0);
      expect(typeof result.recommendation).toBe('string');
    });

    it('applies the weighted formula correctly', () => {
      // Known inputs with expected exact outputs:
      // growthVelocity=200 → growthScore=100, engagement 5+10000 → 100,
      // creatorCount=0 → competitionScore=100, commissionRate=20 → 100, searchVolume=100000 → 100
      // → score = 100*0.30 + 100*0.25 + 100*0.20 + 100*0.15 + 100*0.10 = 100.00
      const perfect = {
        ...baseProduct,
        rating: 5,
        soldCount: 10_000,
        growthVelocity: 200,
        creatorCount: 0,
        searchVolume: 100_000,
        affiliateData: { commissionRate: 20, estimatedCommission: 10 },
      };
      const result = service.scoreProduct(perfect);
      expect(result.score).toBe(100);
    });

    it('scores 0 when all inputs are missing or zero', () => {
      const empty = {
        ...baseProduct,
        rating: null,
        soldCount: null,
        growthVelocity: null,
        creatorCount: null,   // null → neutral 50 for competition
        searchVolume: null,
        affiliateData: null,
        trendAnalyses: [],
      };
      const result = service.scoreProduct(empty);
      // competitionScore=50 (neutral), all others=0 → 0*0.30 + 0*0.25 + 50*0.20 + 0*0.15 + 0*0.10 = 10
      expect(result.score).toBe(10);
      expect(result.profitPotential).toBe(0);
    });
  });

  // ─── getOpportunities ────────────────────────────────────────────────────

  describe('getOpportunities', () => {
    it('returns products ordered by score descending', async () => {
      const lowScoreProduct = {
        ...baseProduct,
        id: 'prod-low',
        title: 'Low Score',
        growthVelocity: 0,
        searchVolume: 0,
        creatorCount: 200,
        affiliateData: null,
        trendAnalyses: [],
      };
      mockPrisma.product.findMany.mockResolvedValue([baseProduct, lowScoreProduct]);

      const results = await service.getOpportunities('user-1');

      expect(results).toHaveLength(2);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it('returns empty array when user has no products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      const results = await service.getOpportunities('user-1');
      expect(results).toEqual([]);
    });
  });

  // ─── getOpportunityById ──────────────────────────────────────────────────

  describe('getOpportunityById', () => {
    it('returns a scored result for an owned product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(baseProduct);

      const result = await service.getOpportunityById('prod-uuid-1', 'user-1');

      expect(result.product.id).toBe('prod-uuid-1');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-uuid-1', userId: 'user-1' },
        }),
      );
    });

    it('throws NotFoundException for unknown product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.getOpportunityById('unknown', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
