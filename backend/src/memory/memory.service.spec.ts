import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MemoryService } from './memory.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function makePreference(overrides: Record<string, any> = {}) {
  return {
    id: 'pref-1',
    userId: 'user-1',
    niche: 'beauty',
    targetAudience: 'women 18-35',
    contentStyle: 'funny',
    language: 'en',
    embedding: new Array(1536).fill(0),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeKnowledge(embedding: number[], overrides: Record<string, any> = {}) {
  return {
    id: 'kb-1',
    title: 'Beauty tips',
    content: 'Some content',
    category: 'beauty',
    embedding,
    ...overrides,
  };
}

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockPrisma = {
  userPreference: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  knowledgeBase: {
    findMany: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn().mockReturnValue('placeholder'),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<MemoryService>(MemoryService);
    jest.resetAllMocks();
    mockConfig.get.mockReturnValue('placeholder');
  });

  // ─── upsert ───────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('calls prisma upsert with correct data and returns the preference', async () => {
      const created = makePreference();
      mockPrisma.userPreference.upsert.mockResolvedValue(created);

      // Stub the private getEmbedding via openai mock (it will fail and return zero vector)
      const result = await service.upsert(
        { niche: 'beauty', targetAudience: 'women 18-35', contentStyle: 'funny', language: 'en' },
        'user-1',
      );

      expect(mockPrisma.userPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({ userId: 'user-1', niche: 'beauty' }),
          update: expect.objectContaining({ niche: 'beauty' }),
        }),
      );
      expect(result.niche).toBe('beauty');
    });

    it('uses zero vector when openai embedding fails', async () => {
      const created = makePreference();
      mockPrisma.userPreference.upsert.mockResolvedValue(created);

      await service.upsert({ niche: 'tech' }, 'user-1');

      // Embedding arg should be an array of numbers
      const call = mockPrisma.userPreference.upsert.mock.calls[0][0];
      expect(Array.isArray(call.create.embedding)).toBe(true);
    });

    it('handles partial DTO (only language)', async () => {
      const pref = makePreference({ niche: null, targetAudience: null, contentStyle: null, language: 'id' });
      mockPrisma.userPreference.upsert.mockResolvedValue(pref);

      const result = await service.upsert({ language: 'id' }, 'user-1');
      expect(result.language).toBe('id');
    });
  });

  // ─── get ──────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the preference (without embedding)', async () => {
      const { embedding: _e, ...withoutEmb } = makePreference();
      mockPrisma.userPreference.findUnique.mockResolvedValue(withoutEmb);

      const result = await service.get('user-1');
      expect(result).toEqual(withoutEmb);
      expect(mockPrisma.userPreference.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('returns null when no preference exists', async () => {
      mockPrisma.userPreference.findUnique.mockResolvedValue(null);
      const result = await service.get('user-1');
      expect(result).toBeNull();
    });
  });

  // ─── buildPromptContext ───────────────────────────────────────────────────

  describe('buildPromptContext', () => {
    it('returns context string with all fields', async () => {
      jest.spyOn(service, 'get').mockResolvedValue({
        id: 'pref-1',
        niche: 'beauty',
        targetAudience: 'women 18-35',
        contentStyle: 'funny',
        language: 'fr',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const ctx = await service.buildPromptContext('user-1');
      expect(ctx).toContain('Niche: beauty');
      expect(ctx).toContain('Target audience: women 18-35');
      expect(ctx).toContain('Content style: funny');
      expect(ctx).toContain('Language: fr');
    });

    it('returns empty string when no preference', async () => {
      jest.spyOn(service, 'get').mockResolvedValue(null);
      const ctx = await service.buildPromptContext('user-1');
      expect(ctx).toBe('');
    });

    it('omits language when it is en (default)', async () => {
      jest.spyOn(service, 'get').mockResolvedValue({
        id: 'pref-1',
        niche: 'tech',
        targetAudience: null,
        contentStyle: null,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const ctx = await service.buildPromptContext('user-1');
      expect(ctx).toContain('Niche: tech');
      expect(ctx).not.toContain('Language:');
    });

    it('returns empty string when all preference fields are null', async () => {
      jest.spyOn(service, 'get').mockResolvedValue({
        id: 'pref-1',
        niche: null,
        targetAudience: null,
        contentStyle: null,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const ctx = await service.buildPromptContext('user-1');
      expect(ctx).toBe('');
    });
  });

  // ─── vectorSearch ─────────────────────────────────────────────────────────

  describe('vectorSearch', () => {
    it('returns top-k items above threshold, sorted by score desc', async () => {
      // Identical vector → score = 1.0
      const vec = new Array(4).fill(1);
      const items = [
        makeKnowledge(vec, { id: 'kb-1', title: 'Perfect match' }),
        makeKnowledge(new Array(4).fill(0), { id: 'kb-2', title: 'Zero vector' }),
      ];
      mockPrisma.knowledgeBase.findMany.mockResolvedValue(items);
      mockPrisma.userPreference.findUnique.mockResolvedValue(null);

      // Patch getEmbedding to return same vec synchronously
      jest.spyOn(service as any, 'getEmbedding').mockResolvedValue(vec);

      const results = await service.vectorSearch('user-1', 'beauty', 5, 0.3);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('kb-1');
      expect(results[0].score).toBeGreaterThan(0.3);
    });

    it('blends user preference embedding when available', async () => {
      const queryVec = [1, 0, 0, 0];
      const prefVec = [0, 1, 0, 0];
      const itemVec = [0.7, 0.3, 0, 0]; // closer to blended (70% query + 30% pref)

      mockPrisma.knowledgeBase.findMany.mockResolvedValue([
        makeKnowledge(itemVec, { id: 'kb-blended' }),
      ]);
      mockPrisma.userPreference.findUnique.mockResolvedValue({ embedding: prefVec });
      jest.spyOn(service as any, 'getEmbedding').mockResolvedValue(queryVec);

      const results = await service.vectorSearch('user-1', 'test', 5, 0.0);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('kb-blended');
    });

    it('returns empty array when no knowledge entries', async () => {
      mockPrisma.knowledgeBase.findMany.mockResolvedValue([]);
      mockPrisma.userPreference.findUnique.mockResolvedValue(null);
      jest.spyOn(service as any, 'getEmbedding').mockResolvedValue(new Array(4).fill(1));

      const results = await service.vectorSearch('user-1', 'anything');
      expect(results).toHaveLength(0);
    });

    it('filters results below threshold', async () => {
      const vec = new Array(4).fill(1);
      mockPrisma.knowledgeBase.findMany.mockResolvedValue([
        makeKnowledge(new Array(4).fill(0), { id: 'below-threshold' }),
      ]);
      mockPrisma.userPreference.findUnique.mockResolvedValue(null);
      jest.spyOn(service as any, 'getEmbedding').mockResolvedValue(vec);

      const results = await service.vectorSearch('user-1', 'query', 5, 0.5);
      expect(results).toHaveLength(0);
    });
  });
});
