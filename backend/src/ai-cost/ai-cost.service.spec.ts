import { Test, TestingModule } from '@nestjs/testing';
import { AiCostService } from './ai-cost.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<{
  provider: string;
  service: string;
  requestType: string | null;
  tokens: number | null;
  estimatedCost: number | null;
}> = {}) {
  return {
    provider: 'openai',
    service: 'gpt-4o-mini',
    requestType: 'LLM',
    tokens: 1000,
    estimatedCost: 0.002,
    ...overrides,
  };
}

const mockPrisma = {
  aiUsage: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('AiCostService', () => {
  let service: AiCostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCostService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AiCostService>(AiCostService);
    jest.resetAllMocks();
  });

  // ─── calculateCost ────────────────────────────────────────────────────────

  describe('calculateCost', () => {
    it('calculates LLM cost using provider/service rate table', () => {
      const cost = service.calculateCost({
        provider: 'openai',
        service: 'gpt-4o-mini',
        requestType: 'LLM',
        tokens: 1000,
        promptTokens: 800,
        completionTokens: 200,
      });
      // prompt: 800 * 0.00015 / 1000 = 0.00012
      // completion: 200 * 0.0006 / 1000 = 0.00012
      // total: 0.00024
      expect(cost).toBeCloseTo(0.00024, 5);
    });

    it('calculates LLM cost for Claude', () => {
      const cost = service.calculateCost({
        provider: 'claude',
        service: 'claude-3-haiku',
        requestType: 'LLM',
        tokens: 2000,
        promptTokens: 1500,
        completionTokens: 500,
      });
      // prompt: 1500 * 0.00025 / 1000 = 0.000375
      // completion: 500 * 0.00125 / 1000 = 0.000625
      expect(cost).toBeCloseTo(0.000375 + 0.000625, 5);
    });

    it('calculates LLM cost for DeepSeek', () => {
      const cost = service.calculateCost({
        provider: 'deepseek',
        service: 'deepseek-chat',
        requestType: 'LLM',
        tokens: 1000,
        promptTokens: 700,
        completionTokens: 300,
      });
      expect(cost).toBeCloseTo((700 * 0.00014 + 300 * 0.00028) / 1000, 5);
    });

    it('calculates LLM cost for Gemini', () => {
      const cost = service.calculateCost({
        provider: 'gemini',
        service: 'gemini-1.5-flash',
        requestType: 'LLM',
        tokens: 4000,
        promptTokens: 3000,
        completionTokens: 1000,
      });
      expect(cost).toBeCloseTo((3000 * 0.000075 + 1000 * 0.0003) / 1000, 5);
    });

    it('falls back to 0.002 per 1K tokens for unknown LLM provider', () => {
      const cost = service.calculateCost({
        provider: 'unknown',
        service: 'unknown-model',
        requestType: 'LLM',
        tokens: 1000,
        promptTokens: 0,
        completionTokens: 0,
      });
      expect(cost).toBeCloseTo(0.002, 5);
    });

    it('calculates TTS media cost', () => {
      const cost = service.calculateCost({
        provider: 'openai',
        service: 'tts-1',
        requestType: 'TTS',
        tokens: 1000, // 1000 characters
        promptTokens: 0,
        completionTokens: 0,
      });
      // 1000 * 0.000015 = 0.015
      expect(cost).toBeCloseTo(0.015, 5);
    });

    it('calculates IMAGE media cost', () => {
      const cost = service.calculateCost({
        provider: 'openai',
        service: 'dall-e-3',
        requestType: 'IMAGE',
        tokens: 2, // 2 images
        promptTokens: 0,
        completionTokens: 0,
      });
      // 2 * 0.04 = 0.08
      expect(cost).toBeCloseTo(0.08, 5);
    });

    it('calculates VIDEO media cost', () => {
      const cost = service.calculateCost({
        provider: 'internal',
        service: 'video-renderer',
        requestType: 'VIDEO',
        tokens: 3, // 3 minutes
        promptTokens: 0,
        completionTokens: 0,
      });
      // 3 * 0.10 = 0.30
      expect(cost).toBeCloseTo(0.30, 5);
    });

    it('returns 0 for unknown media type', () => {
      const cost = service.calculateCost({
        provider: 'x',
        service: 'y',
        requestType: 'UNKNOWN_MEDIA',
        tokens: 100,
        promptTokens: 0,
        completionTokens: 0,
      });
      expect(cost).toBe(0);
    });
  });

  // ─── track ────────────────────────────────────────────────────────────────

  describe('track', () => {
    it('creates an AiUsage record with auto-calculated cost', async () => {
      const created = { id: 'usage-1', service: 'gpt-4o-mini', provider: 'openai' };
      mockPrisma.aiUsage.create.mockResolvedValue(created);

      const result = await service.track(
        {
          service: 'gpt-4o-mini',
          provider: 'openai',
          promptTokens: 800,
          completionTokens: 200,
          requestType: 'LLM',
        },
        'user-1',
      );

      expect(result).toBe(created);
      const data = mockPrisma.aiUsage.create.mock.calls[0][0].data;
      expect(data.tokens).toBe(1000);
      expect(data.userId).toBe('user-1');
      expect(typeof data.estimatedCost).toBe('number');
      expect(data.estimatedCost).toBeGreaterThan(0);
    });

    it('uses provided estimatedCost when supplied', async () => {
      mockPrisma.aiUsage.create.mockResolvedValue({});

      await service.track({
        service: 'gpt-4o-mini',
        provider: 'openai',
        tokens: 500,
        estimatedCost: 9.99,
        requestType: 'LLM',
      });

      const data = mockPrisma.aiUsage.create.mock.calls[0][0].data;
      expect(data.estimatedCost).toBe(9.99);
    });

    it('records without userId when not authenticated', async () => {
      mockPrisma.aiUsage.create.mockResolvedValue({});

      await service.track({ service: 'tts-1', provider: 'openai', requestType: 'TTS', tokens: 200 });

      const data = mockPrisma.aiUsage.create.mock.calls[0][0].data;
      expect(data.userId).toBeNull();
    });

    it('stores projectId when provided', async () => {
      mockPrisma.aiUsage.create.mockResolvedValue({});

      await service.track(
        { service: 'gpt-4o-mini', provider: 'openai', requestType: 'LLM', projectId: 'video-abc' },
        'user-1',
      );

      const data = mockPrisma.aiUsage.create.mock.calls[0][0].data;
      expect(data.projectId).toBe('video-abc');
    });
  });

  // ─── getDashboard ─────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns aggregated totals and breakdown by provider/service', async () => {
      mockPrisma.aiUsage.findMany.mockResolvedValue([
        makeRecord({ provider: 'openai', service: 'gpt-4o-mini', tokens: 1000, estimatedCost: 0.001 }),
        makeRecord({ provider: 'openai', service: 'gpt-4o-mini', tokens: 500,  estimatedCost: 0.0005 }),
        makeRecord({ provider: 'claude', service: 'claude-3-haiku', tokens: 2000, estimatedCost: 0.002 }),
      ]);

      const result = await service.getDashboard('user-1');

      expect(result.totalRequests).toBe(3);
      expect(result.totalTokens).toBe(3500);
      expect(result.totalCost).toBeCloseTo(0.0035, 5);
      expect(result.breakdown).toHaveLength(2); // openai + claude groups
    });

    it('returns zero summary when user has no AI usage', async () => {
      mockPrisma.aiUsage.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('user-1');

      expect(result.totalRequests).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });

  // ─── getProjectCost ───────────────────────────────────────────────────────

  describe('getProjectCost', () => {
    it('returns cost summary for a project', async () => {
      mockPrisma.aiUsage.findMany.mockResolvedValue([
        makeRecord({ tokens: 300, estimatedCost: 0.0006 }),
        makeRecord({ tokens: 700, estimatedCost: 0.0014 }),
      ]);

      const result = await service.getProjectCost('video-xyz');

      expect(result.totalRequests).toBe(2);
      expect(result.totalTokens).toBe(1000);
      expect(result.totalCost).toBeCloseTo(0.002, 5);
      expect(mockPrisma.aiUsage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: 'video-xyz' } }),
      );
    });

    it('returns zero summary when project has no usage', async () => {
      mockPrisma.aiUsage.findMany.mockResolvedValue([]);

      const result = await service.getProjectCost('proj-empty');

      expect(result.totalRequests).toBe(0);
    });
  });

  // ─── getUserCost ──────────────────────────────────────────────────────────

  describe('getUserCost', () => {
    it('returns cost summary for a user', async () => {
      mockPrisma.aiUsage.findMany.mockResolvedValue([
        makeRecord({ tokens: 1000, estimatedCost: 0.001 }),
      ]);

      const result = await service.getUserCost('user-1');

      expect(result.totalRequests).toBe(1);
      expect(result.totalCost).toBeCloseTo(0.001, 5);
      expect(mockPrisma.aiUsage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('handles null tokens and costs gracefully', async () => {
      mockPrisma.aiUsage.findMany.mockResolvedValue([
        makeRecord({ tokens: null, estimatedCost: null }),
      ]);

      const result = await service.getUserCost('user-1');

      expect(result.totalRequests).toBe(1);
      expect(result.totalTokens).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });
});
