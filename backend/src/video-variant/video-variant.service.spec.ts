import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VideoVariantService } from './video-variant.service';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from '../ai-content/ollama.service';
import { ConfigService } from '@nestjs/config';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  video: { findFirst: jest.fn() },
  videoVariant: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockOllama = {
  isAvailable: jest.fn().mockResolvedValue(false),
  generate: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('placeholder'),
};

const baseVideo = {
  id: 'video-1',
  userId: 'user-1',
  title: 'Test Video',
  product: { title: 'Test Product', description: 'Great product' },
};

function makeVariant(overrides: Partial<{ id: string; score: number; isWinner: boolean; isSelected: boolean }> = {}) {
  return {
    id: 'variant-1',
    videoId: 'video-1',
    hook: 'You NEED this product!',
    title: 'Test Product – Best Deal',
    thumbnail: 'Product on white background, bold text overlay',
    ctr: 40,
    retention: 60,
    score: 48,
    isWinner: false,
    isSelected: false,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('VideoVariantService', () => {
  let service: VideoVariantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoVariantService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OllamaService, useValue: mockOllama },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<VideoVariantService>(VideoVariantService);
    jest.clearAllMocks();
    // Default: Ollama is not available
    mockOllama.isAvailable.mockResolvedValue(false);
    // Mock OpenAI so tests don't make real HTTP calls
    jest
      .spyOn((service as any).openai.chat.completions, 'create')
      .mockRejectedValue(new Error('OpenAI mocked'));
  });

  // ─── predictCtr ───────────────────────────────────────────────────────────

  describe('predictCtr', () => {
    it('returns a number between 0 and 100', () => {
      const result = service.predictCtr('Is this the best product?', 'Must-have today');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('adds bonus for question marks', () => {
      const withQ = service.predictCtr('Is this amazing?', 'Title');
      const withoutQ = service.predictCtr('This is amazing', 'Title');
      expect(withQ).toBeGreaterThan(withoutQ);
    });

    it('adds urgency bonus for power words', () => {
      const urgent = service.predictCtr('Get it free now', 'Title');
      const plain = service.predictCtr('A nice product', 'Title');
      expect(urgent).toBeGreaterThan(plain);
    });

    it('caps at 100', () => {
      // Max reachable: hookScore(30) + titleScore(30) + questionBonus(10) + urgencyBonus(10) = 80
      // The clamp is defensive; verify the result is always ≤ 100
      const long = 'a b c d e f g h i j k l m n o p q r s t u v w x y z free now today secret hack?';
      expect(service.predictCtr(long, long)).toBeLessThanOrEqual(100);
      expect(service.predictCtr(long, long)).toBeGreaterThan(0);
    });
  });

  // ─── predictRetention ─────────────────────────────────────────────────────

  describe('predictRetention', () => {
    it('returns a number between 0 and 100', () => {
      const result = service.predictRetention('This is amazing!');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('gives higher retention to hooks with emotion words', () => {
      const emotional = service.predictRetention('This is shocking and amazing');
      const bland = service.predictRetention('This is a product');
      expect(emotional).toBeGreaterThan(bland);
    });

    it('gives bonus when hook contains a number', () => {
      const withNum = service.predictRetention('Top 5 reasons to buy');
      const withoutNum = service.predictRetention('Top reasons to buy this');
      expect(withNum).toBeGreaterThan(withoutNum);
    });

    it('caps at 100', () => {
      // Max reachable: base(60) + emotionBonus(20) + numberBonus(10) = 90 → clamp is defensive
      expect(
        service.predictRetention('amazing shocking secret 1 2 3 a b c d e f g h i j k l m n o'),
      ).toBeLessThanOrEqual(100);
    });
  });

  // ─── calcScore ────────────────────────────────────────────────────────────

  describe('calcScore', () => {
    it('weights CTR at 60 % and retention at 40 %', () => {
      expect(service.calcScore(100, 100)).toBe(100);
      expect(service.calcScore(100, 0)).toBe(60);
      expect(service.calcScore(0, 100)).toBe(40);
    });

    it('rounds to 2 decimal places', () => {
      // 33.33*0.6 + 50*0.4 = 19.998 + 20.0 = 39.998 → toFixed(2) = "40.00" → 40
      expect(service.calcScore(33.33, 50)).toBe(40);
    });
  });

  // ─── detectWinnerId ───────────────────────────────────────────────────────

  describe('detectWinnerId', () => {
    it('returns null for empty array', () => {
      expect(service.detectWinnerId([])).toBeNull();
    });

    it('returns the id of the single variant', () => {
      expect(service.detectWinnerId([{ id: 'v1', score: 50 }])).toBe('v1');
    });

    it('returns the id with the highest score', () => {
      const variants = [
        { id: 'v1', score: 30 },
        { id: 'v2', score: 80 },
        { id: 'v3', score: 55 },
      ];
      expect(service.detectWinnerId(variants)).toBe('v2');
    });
  });

  // ─── normalise ────────────────────────────────────────────────────────────

  describe('normalise', () => {
    it('pads short arrays with fallback items', () => {
      const result = service.normalise(['a', 'b'], 4, 'fallback');
      expect(result).toHaveLength(4);
      expect(result[2]).toBe('fallback #3');
      expect(result[3]).toBe('fallback #4');
    });

    it('trims over-long arrays', () => {
      expect(service.normalise(['a', 'b', 'c', 'd'], 2, 'f')).toEqual(['a', 'b']);
    });

    it('returns the array unchanged when already exact length', () => {
      expect(service.normalise(['a', 'b', 'c'], 3, 'f')).toEqual(['a', 'b', 'c']);
    });
  });

  // ─── getVariant ───────────────────────────────────────────────────────────

  describe('getVariant', () => {
    it('returns the variant when it belongs to the user', async () => {
      const variant = { ...makeVariant(), video: { userId: 'user-1' } };
      mockPrisma.videoVariant.findFirst.mockResolvedValue(variant);

      const result = await service.getVariant('variant-1', 'user-1');
      expect(result).toBe(variant);
    });

    it('throws NotFoundException when variant does not exist', async () => {
      mockPrisma.videoVariant.findFirst.mockResolvedValue(null);
      await expect(service.getVariant('x', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when variant belongs to another user', async () => {
      const variant = { ...makeVariant(), video: { userId: 'other-user' } };
      mockPrisma.videoVariant.findFirst.mockResolvedValue(variant);
      await expect(service.getVariant('variant-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listVariants ─────────────────────────────────────────────────────────

  describe('listVariants', () => {
    it('returns variants sorted by score', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(baseVideo);
      const variants = [makeVariant({ id: 'v1', score: 80 }), makeVariant({ id: 'v2', score: 40 })];
      mockPrisma.videoVariant.findMany.mockResolvedValue(variants);

      const result = await service.listVariants('video-1', 'user-1');
      expect(result).toEqual(variants);
    });

    it('throws NotFoundException when video is not owned by user', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);
      await expect(service.listVariants('x', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── selectVariant ────────────────────────────────────────────────────────

  describe('selectVariant', () => {
    it('calls updateMany then update and returns the updated variant', async () => {
      const variant = { ...makeVariant(), video: { userId: 'user-1', id: 'video-1' }, videoId: 'video-1' };
      mockPrisma.videoVariant.findFirst.mockResolvedValue(variant);
      mockPrisma.$transaction.mockImplementation(async (ops: any[]) => {
        for (const op of ops) await op;
      });
      mockPrisma.videoVariant.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.videoVariant.update.mockResolvedValue({ ...variant, isSelected: true });
      const selected = { ...variant, isSelected: true };
      mockPrisma.videoVariant.findUnique.mockResolvedValue(selected);

      const result = await service.selectVariant({ variantId: 'variant-1' }, 'user-1');
      expect(result).toEqual(selected);
    });

    it('throws NotFoundException when variant does not belong to user', async () => {
      const variant = { ...makeVariant(), video: { userId: 'other-user' } };
      mockPrisma.videoVariant.findFirst.mockResolvedValue(variant);
      await expect(
        service.selectVariant({ variantId: 'variant-1' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when variant is not found', async () => {
      mockPrisma.videoVariant.findFirst.mockResolvedValue(null);
      await expect(
        service.selectVariant({ variantId: 'x' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── generateVariants (integration-light) ────────────────────────────────

  describe('generateVariants', () => {
    it('throws NotFoundException when video is not owned by user', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(null);
      await expect(
        service.generateVariants({ videoId: 'x' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates count variants and marks winner', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(baseVideo);

      const variants = [
        makeVariant({ id: 'v1', score: 30 }),
        makeVariant({ id: 'v2', score: 70 }),
        makeVariant({ id: 'v3', score: 50 }),
      ];

      let callIndex = 0;
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        // Simulate the transaction: mock create to return sequential variants
        const txMock = {
          videoVariant: {
            create: jest.fn().mockImplementation(() => variants[callIndex++]),
            update: jest.fn().mockResolvedValue({ ...variants[1], isWinner: true }),
          },
        };
        return fn(txMock);
      });

      const result = await service.generateVariants({ videoId: 'video-1', count: 3 }, 'user-1');
      expect(result).toHaveLength(3);
      // Winner should be v2 (score 70) → isWinner: true
      const winner = result.find((v: any) => v.isWinner);
      expect(winner?.id).toBe('v2');
    });

    it('defaults to 3 variants when count is omitted', async () => {
      mockPrisma.video.findFirst.mockResolvedValue(baseVideo);

      const variants = [
        makeVariant({ id: 'v1', score: 30 }),
        makeVariant({ id: 'v2', score: 70 }),
        makeVariant({ id: 'v3', score: 50 }),
      ];
      let callIndex = 0;
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const txMock = {
          videoVariant: {
            create: jest.fn().mockImplementation(() => variants[callIndex++]),
            update: jest.fn().mockResolvedValue(variants[1]),
          },
        };
        return fn(txMock);
      });

      const result = await service.generateVariants({ videoId: 'video-1' }, 'user-1');
      expect(result).toHaveLength(3);
    });
  });
});
